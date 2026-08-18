#!/usr/bin/env python3
"""
Sync live Fountain openings -> content/jobs/*.mdx for the marketing site.

WHY: hiring-SEO (Google for Jobs) rewards fresh, live postings and drops
expired ones. Hand-maintained MDX goes stale and doesn't scale past one role.
This script is the source of truth for which jobs are live: it reads the
publishable Fountain openings, joins each against an editorial template in
content/job-templates/<roleType>.mdx, and writes a finished, schema-complete
content/jobs/<slug>.mdx. Openings that close/hide are pruned. datePosted is the
opening's real created date; validThrough is refreshed every run so live
listings never expire out of Google.

TOPOLOGY: runs on terminator67 (where the credentialed Fountain client + creds
already live), then commits + pushes sycamore-website -> Vercel auto-deploys.
It does NOT run on Vercel; no Fountain creds leave the server.

CONTENT MODEL (hybrid, tuned to the real /funnels payload):
  Fountain (authoritative) -> which openings publish (active + hiring + not
                              private/internal), station, location, pay range,
                              employment type, apply URL, slug, created date.
  Editorial template       -> public title, benefits body, es overrides, image
                              choices. {{PAY_MIN}} + {{LOCATION_LABEL}} tokens
                              are filled per opening/locale.

PUBLISH FILTER: active AND is_hiring_funnel AND NOT is_private AND NOT
is_internal_funnel. Private/internal funnels stay off the public site — to
publish one, change its visibility in Fountain (the right place), not here.

SAFETY: dry-run by default (prints a plan, writes nothing). --write to write
files; --push to also commit + push. --from-file <json> replays a saved
`/funnels` dump so the mapping can be validated with no network / no creds.

DEPENDS: PyYAML + the platform Fountain client. Run under **system python3**
(has PyYAML; the platform venv does NOT). The client is stdlib-only and is
imported via sys.path (PLATFORM_ROOT). See scripts/README-fountain-sync.md.
"""
from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.stderr.write(
        "PyYAML is required. Use system python3 (has PyYAML); the platform venv "
        "does not. See scripts/README-fountain-sync.md.\n"
    )
    raise

# --- paths ------------------------------------------------------------------
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
JOBS_DIR = os.path.join(REPO_ROOT, "content", "jobs")
TEMPLATES_DIR = os.path.join(REPO_ROOT, "content", "job-templates")
PLATFORM_ROOT = "/home/coreadmin/sycamore-platform"

# --- policy constants -------------------------------------------------------
# validThrough = today + this many days, refreshed every run so a live opening
# never expires out of Google for Jobs while it's still open on Fountain.
# (Overridden by the opening's application_deadline when Fountain sets one.)
VALIDITY_WINDOW_DAYS = 30
_DIAG_NOW = None  # set by diagnose(); one fixed clock per pass
COUNTRY_DEFAULT = "US"
_UNIT = {"hour": "HOUR", "day": "DAY", "week": "WEEK", "month": "MONTH", "year": "YEAR"}
_JOB_HOURS = {"full_time": "FULL_TIME", "part_time": "PART_TIME"}
# Market display labels keyed off the derived (city, state). The market label
# ("Hagerstown area") is intentionally distinct from the physical city — see the
# SEO doctrine note. Add rows as new stations come online; unknown -> generic.
LOCATION_LABELS = {
    ("Williamsport", "MD"): {"en": "Hagerstown, MD area", "es": "área de Hagerstown, MD"},
    ("Hagerstown", "MD"): {"en": "Hagerstown, MD area", "es": "área de Hagerstown, MD"},
}
DEFAULT_LABEL = {"en": "{city}, {state} area", "es": "área de {city}, {state}"}

GENERATED_BANNER = (
    "{/* GENERATED FILE — DO NOT EDIT. Written by "
    "scripts/sync_fountain_jobs.py from a live Fountain opening. Edit copy in "
    "content/job-templates/, not here. */}"
)


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------
def _split_frontmatter(raw: str):
    """Return (frontmatter_dict, body_str) from `---\\n...\\n---\\nbody`."""
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", raw, re.DOTALL)
    if not m:
        raise ValueError("file has no YAML frontmatter")
    return yaml.safe_load(m.group(1)) or {}, m.group(2)


def load_templates() -> list[dict]:
    """content/job-templates/*.mdx -> [{roleType, patterns, fm, body}], sorted
    by roleType for deterministic first-match."""
    out = []
    if not os.path.isdir(TEMPLATES_DIR):
        return out
    for name in sorted(os.listdir(TEMPLATES_DIR)):
        if not name.endswith(".mdx"):
            continue
        with open(os.path.join(TEMPLATES_DIR, name), encoding="utf-8") as fh:
            fm, body = _split_frontmatter(fh.read())
        out.append(
            {
                "roleType": fm.get("roleType") or name[:-4],
                "patterns": [p.lower() for p in fm.get("matchTitlePatterns", [])],
                "fm": fm,
                "body": body,
            }
        )
    return out


def match_role(op: dict, templates: list[dict]) -> dict | None:
    """Match on the opening title + position name (the delivery signal lives in
    one or the other)."""
    hay = f"{op.get('title', '')} {(op.get('position') or {}).get('name', '')}".lower()
    for tpl in templates:
        if any(p in hay for p in tpl["patterns"]):
            return tpl
    return None


# ---------------------------------------------------------------------------
# Fountain opening -> Job fields   (finalized against a real /funnels response)
# ---------------------------------------------------------------------------
def should_publish(op: dict) -> bool:
    """Only public, active hiring funnels reach the marketing site."""
    return bool(
        op.get("active")
        and op.get("is_hiring_funnel", True)
        and not op.get("is_private", False)
        and not op.get("is_internal_funnel", False)
    )


# The four publish gates, in the same order should_publish() applies them.
# Kept as data so --diagnose can name WHICH gate rejected an opening: the sync
# log otherwise prints only survivors, so a station that never appears on the
# site looks identical to a station Fountain never sent.
_PUBLISH_GATES = (
    ("active", lambda op: bool(op.get("active")), "not active in Fountain"),
    ("is_hiring_funnel", lambda op: bool(op.get("is_hiring_funnel", True)),
     "is_hiring_funnel=false (funnel not marked as hiring)"),
    ("is_private", lambda op: not op.get("is_private", False),
     "is_private=true (hidden from the public board)"),
    ("is_internal_funnel", lambda op: not op.get("is_internal_funnel", False),
     "is_internal_funnel=true (internal-only funnel)"),
)


def blocking_reasons(op: dict) -> list[str]:
    """Which publish gates this opening fails. Empty list == publishable."""
    return [why for _, ok, why in _PUBLISH_GATES if not ok(op)]


def _slug_from_apply_url(url: str, fallback: str) -> str:
    m = re.search(r"/opening/([^/?#]+)", url or "")
    if m:
        return m.group(1)
    return re.sub(r"[^a-z0-9]+", "-", (fallback or "opening").lower()).strip("-")


def _parse_address(addr: str) -> dict:
    """'16604 Industrial Lane, Williamsport, MD, 21795, US' -> structured.
    Robust to a missing street or country: locate ZIP + 2-letter state, take the
    part before the state as the city."""
    parts = [p.strip() for p in (addr or "").split(",") if p.strip()]
    postal = next((p for p in parts if re.fullmatch(r"\d{5}(-\d{4})?", p)), "")
    state = next((p for p in parts if re.fullmatch(r"[A-Z]{2}", p)), "")
    city = ""
    if state and state in parts:
        i = parts.index(state)
        if i > 0:
            city = parts[i - 1]
    country = COUNTRY_DEFAULT
    if parts and re.fullmatch(r"[A-Z]{2,3}", parts[-1]) and parts[-1] != state:
        country = parts[-1]
    return {"city": city, "state": state, "postalCode": postal, "country": country}


def _pay(op: dict) -> dict | None:
    r = op.get("opening_pay_rate") or {}
    lo = r.get("compensation_min") or r.get("compensation")
    if lo is None:
        return None
    out = {
        "minValue": float(lo),
        "currency": r.get("compensation_currency_code") or "USD",
        "unitText": _UNIT.get((r.get("compensation_type") or "hour").lower(), "HOUR"),
    }
    hi = r.get("compensation_max")
    if hi is not None and float(hi) > float(lo):
        out["maxValue"] = float(hi)
    return out


def _employment_type(op: dict) -> str:
    return _JOB_HOURS.get((op.get("job_hours") or "").lower(), "FULL_TIME")


def _labels(city: str, state: str, pay: dict | None, tpl_fm: dict) -> dict:
    loc = LOCATION_LABELS.get((city, state)) or {
        k: v.format(city=city or "your area", state=state or "")
        for k, v in DEFAULT_LABEL.items()
    }
    pay_min = pay["minValue"] if pay else (tpl_fm.get("baseSalary") or {}).get("minValue", 0)
    pay_str = f"{float(pay_min):.2f}"
    return {
        "en": {"{{LOCATION_LABEL}}": loc["en"], "{{PAY_MIN}}": pay_str},
        "es": {"{{LOCATION_LABEL}}": loc["es"], "{{PAY_MIN}}": pay_str},
        "displayName": loc["en"],
    }


def _iso_date(value) -> str | None:
    if not value:
        return None
    m = re.match(r"(\d{4}-\d{2}-\d{2})", str(value))
    return m.group(1) if m else None


def _clean_desc(html: str | None) -> str | None:
    """Fountain's opening `description` is a full HTML job ad — exactly what
    Google for Jobs wants in JobPosting.description. Normalize CRLF and trim;
    keep the HTML formatting."""
    if not html:
        return None
    s = str(html).replace("\r\n", "\n").replace("\r", "\n").strip()
    return s or None


def opening_to_fields(op: dict, tpl_fm: dict, now: datetime) -> dict:
    addr = _parse_address(op.get("address") or "")
    pay = _pay(op)
    slug = _slug_from_apply_url(op.get("apply_url", ""), op.get("title", ""))
    station = re.sub(r"\s*-\s*SYCM\b", "", (op.get("location") or {}).get("name", "")).strip()
    date_posted = _iso_date(op.get("created_at")) or now.date().isoformat()
    valid_through = _iso_date(op.get("application_deadline")) or (
        now + timedelta(days=VALIDITY_WINDOW_DAYS)
    ).date().isoformat()
    return {
        "slug": slug,
        "station": station,
        "location": {**addr, "displayName": _labels(addr["city"], addr["state"], pay, tpl_fm)["displayName"]},
        "employmentType": _employment_type(op),
        "baseSalary": pay or tpl_fm.get("baseSalary"),
        "datePosted": date_posted,
        "validThrough": valid_through,
        "fountainApplyUrl": op.get("apply_url", ""),
        "descriptionHtml": _clean_desc(op.get("description")),
        "tokens": _labels(addr["city"], addr["state"], pay, tpl_fm),
    }


# ---------------------------------------------------------------------------
# Render
# ---------------------------------------------------------------------------
def _sub(text: str, tokens: dict) -> str:
    out = text or ""
    for k, v in tokens.items():
        out = out.replace(k, str(v))
    return out


def render_job_mdx(tpl: dict, f: dict) -> str:
    fm = tpl["fm"]
    tok = f["tokens"]
    locales = {}
    for loc, ov in (fm.get("locales") or {}).items():
        locales[loc] = {k: _sub(v, tok.get(loc, tok["en"])) for k, v in ov.items()}
    frontmatter = {
        "title": fm.get("title", tpl["roleType"]),
        "station": f["station"],
        "location": f["location"],
        "employmentType": f["employmentType"],
        "datePosted": f["datePosted"],
        "validThrough": f["validThrough"],
        "baseSalary": f["baseSalary"],
        "description": _sub(fm.get("description", ""), tok["en"]),
        "fountainApplyUrl": f["fountainApplyUrl"],
        "source": "fountain",
    }
    if f.get("descriptionHtml"):
        frontmatter["descriptionHtml"] = f["descriptionHtml"]
    if locales:
        frontmatter["locales"] = locales
    body = _sub(tpl["body"], tok["en"]).lstrip("\n")
    yaml_fm = yaml.safe_dump(
        frontmatter, sort_keys=False, allow_unicode=True, default_flow_style=False
    )
    return f"---\n{yaml_fm}---\n\n{GENERATED_BANNER}\n\n{body}"


# ---------------------------------------------------------------------------
# Fetch
# ---------------------------------------------------------------------------
def fetch_openings(from_file: str | None) -> list[dict]:
    if from_file:
        import json

        with open(from_file, encoding="utf-8") as fh:
            data = json.load(fh)
        return data if isinstance(data, list) else data.get("funnels", data.get("data", []))
    if PLATFORM_ROOT not in sys.path:
        sys.path.insert(0, PLATFORM_ROOT)
    from core.services.fountain_client import FountainClient  # type: ignore

    return FountainClient().funnels()


# ---------------------------------------------------------------------------
# Git
# ---------------------------------------------------------------------------
def _git(*args: str) -> str:
    return subprocess.run(
        ["git", "-C", REPO_ROOT, *args], check=True, capture_output=True, text=True
    ).stdout.strip()


def git_commit_push(n_written: int, n_pruned: int, push: bool) -> None:
    if not _git("status", "--porcelain", "content/jobs"):
        print("[git] no job changes — nothing to commit")
        return
    _git("add", "content/jobs")
    _git(
        "commit",
        "-m",
        f"jobs: sync from Fountain ({n_written} live, {n_pruned} pruned)\n\n"
        "Automated by scripts/sync_fountain_jobs.py. Do not hand-edit "
        "content/jobs/*.mdx (source: fountain).",
    )
    print(f"[git] committed: {n_written} live, {n_pruned} pruned")
    if push:
        _git("push", "origin", "main")
        print("[git] pushed origin/main -> Vercel will deploy")
    else:
        print("[git] --push not set; commit is local only")


# ---------------------------------------------------------------------------
# Diagnose
# ---------------------------------------------------------------------------
# Renaming a funnel title to a clean public title is the intended design
# ("DBA7 - SYCM - Delivery Experience Specialist" -> "Delivery Associate"), so a
# plain title mismatch is not a defect. What IS a defect is a qualifier in the
# Fountain title that changes the KIND of role and is not reflected in the
# template the opening matched — a seasonal role advertised as permanent, or a
# helper role advertised (and priced) as a full Delivery Associate.
_ROLE_QUALIFIERS = (
    "seasonal", "temporary", "temp", "part-time", "part time", "helper",
    "lead", "supervisor", "manager", "dispatcher", "warehouse", "cdl",
    "trainer", "intern", "weekend", "overnight",
)


def role_qualifier_warnings(tpl: dict, fountain_title: str) -> list[str]:
    """Qualifiers present in the Fountain title but absent from the template's
    public title and role type — i.e. meaning the public ad would drop."""
    hay = (fountain_title or "").lower()
    covered = (
        f"{tpl['fm'].get('title', '')} {tpl['roleType']} "
        f"{' '.join(tpl['patterns'])}"
    ).lower()
    return [q for q in _ROLE_QUALIFIERS if q in hay and q not in covered]


def diagnose(openings: list[dict], templates: list[dict]) -> int:
    """Print one line per Fountain opening with the reason it does or does not
    reach the site. Read-only: writes no files and runs no git."""
    global _DIAG_NOW
    _DIAG_NOW = datetime.now(timezone.utc)
    print(f"[diagnose] {len(openings)} openings from Fountain\n")
    for op in sorted(openings, key=lambda o: str((o.get("location") or {}).get("name", ""))):
        station = re.sub(
            r"\s*-\s*SYCM\b", "", (op.get("location") or {}).get("name", "")
        ).strip() or "(no location)"
        title = (op.get("title") or "?")
        reasons = blocking_reasons(op)
        if reasons:
            verdict = "BLOCKED"
            detail = "; ".join(reasons)
        else:
            tpl = match_role(op, templates)
            if tpl:
                verdict = "PUBLISH"
                detail = (
                    f"template={tpl['roleType']} "
                    f"slug={_slug_from_apply_url(op.get('apply_url',''), title)}"
                )
            else:
                verdict = "NO TEMPLATE"
                detail = (
                    "passes every publish gate but no content/job-templates/*.mdx "
                    "matchTitlePatterns matched "
                    f"{title!r} / "
                    f"{(op.get('position') or {}).get('name','')!r}"
                )
        print(f"  {station:<12} {verdict:<12} {title[:44]:<44} {detail}")
        flags = " ".join(
            f"{name}={op.get(name, '(absent)')!r}" for name, _, _ in _PUBLISH_GATES
        )
        print(f"  {'':<12} {'':<12} flags: {flags}")
        # Show the parsed address + market label even for BLOCKED openings. A
        # malformed Fountain address (e.g. "PA 18202" as one comma-part, which
        # defeats the ZIP/state split) collapses city+state to "" and renders
        # "your area,  area" with an empty JobPosting jobLocation. That is
        # invisible while a publish gate hides the opening, and would ship the
        # moment the gate opens — so surface it here, not after go-live.
        raw_addr = op.get("address") or ""
        addr = _parse_address(raw_addr)
        label = _labels(addr["city"], addr["state"], _pay(op), {})["displayName"]
        warn = "" if (addr["city"] and addr["state"]) else "   <-- UNPARSED ADDRESS"
        print(f"  {'':<12} {'':<12} address: {raw_addr!r}")
        print(
            f"  {'':<12} {'':<12} parsed: city={addr['city']!r} "
            f"state={addr['state']!r} zip={addr['postalCode']!r} "
            f"label={label!r}{warn}"
        )
        # "What would go public if this gate opened." A blocked opening is one
        # Fountain toggle away from being a live job ad, so the risky fields are
        # worth seeing BEFORE the toggle: the template supplies the public title
        # and a fallback wage, so an opening whose real title/pay differ from the
        # template it matched would publish a wrong ad rather than no ad.
        tpl_preview = match_role(op, templates)
        if tpl_preview:
            fp = opening_to_fields(op, tpl_preview["fm"], _DIAG_NOW)
            wage_src = "fountain" if _pay(op) else "TEMPLATE FALLBACK"
            sal = fp["baseSalary"] or {}
            rng = f"{sal.get('minValue')}"
            if sal.get("maxValue"):
                rng += f"-{sal['maxValue']}"
            quals = role_qualifier_warnings(tpl_preview, title)
            title_warn = (
                f"   <-- DROPS ROLE QUALIFIER(S): {', '.join(quals)}"
                if quals else ""
            )
            print(
                f"  {'':<12} {'':<12} would publish as: "
                f"{tpl_preview['fm'].get('title')!r} "
                f"{fp['employmentType']} "
                f"{rng} {sal.get('currency','')}/{sal.get('unitText','')} "
                f"(wage from {wage_src}){title_warn}"
            )
    n_pub = sum(1 for op in openings if not blocking_reasons(op))
    print(
        f"\n[diagnose] {n_pub} of {len(openings)} pass the publish gates "
        "(active + hiring + not private/internal)"
    )
    print("(diagnose — nothing written, no git)")
    return 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description="Sync Fountain openings -> content/jobs/*.mdx")
    ap.add_argument("--from-file", help="replay a saved /funnels JSON dump (no network)")
    ap.add_argument("--write", action="store_true", help="write MDX files (default: dry-run)")
    ap.add_argument("--push", action="store_true", help="git commit + push (implies --write)")
    ap.add_argument("--limit", type=int, default=0, help="cap openings processed (debug)")
    ap.add_argument(
        "--diagnose",
        action="store_true",
        help="print every opening with its publish-gate verdict and template "
             "match, then exit. Never writes files or touches git.",
    )
    args = ap.parse_args()
    write = args.write or args.push
    now = datetime.now(timezone.utc)

    templates = load_templates()
    if not templates:
        sys.stderr.write(f"no templates in {TEMPLATES_DIR}\n")
        return 1

    openings = fetch_openings(args.from_file)
    if args.limit:
        openings = openings[: args.limit]

    if args.diagnose:
        return diagnose(openings, templates)

    publishable = [op for op in openings if should_publish(op)]
    print(f"[fetch] {len(openings)} openings, {len(publishable)} publishable "
          "(active + hiring + not private/internal)")

    written_slugs: set[str] = set()
    plan = []
    for op in publishable:
        tpl = match_role(op, templates)
        if not tpl:
            plan.append(("skip-no-template", op.get("title", "?")[:40], "—"))
            continue
        f = opening_to_fields(op, tpl["fm"], now)
        written_slugs.add(f["slug"])
        plan.append(("write", tpl["roleType"], f["slug"]))
        if write:
            os.makedirs(JOBS_DIR, exist_ok=True)
            with open(os.path.join(JOBS_DIR, f"{f['slug']}.mdx"), "w", encoding="utf-8") as fh:
                fh.write(render_job_mdx(tpl, f))

    # Prune fountain-sourced job files no longer backed by a publishable opening.
    pruned = []
    for name in sorted(os.listdir(JOBS_DIR)) if os.path.isdir(JOBS_DIR) else []:
        if not name.endswith(".mdx"):
            continue
        slug = name[:-4]
        path = os.path.join(JOBS_DIR, name)
        with open(path, encoding="utf-8") as fh:
            fm, _ = _split_frontmatter(fh.read())
        if fm.get("source") != "fountain":
            continue  # never touch hand-authored jobs
        if slug not in written_slugs:
            pruned.append(slug)
            if write:
                os.remove(path)

    print("\n=== PLAN ===")
    for action, role, slug in plan:
        print(f"  {action:20} {role:24} {slug}")
    for slug in pruned:
        print(f"  {'prune':20} {'(closed/hidden)':24} {slug}")
    print(f"=== {'WROTE' if write else 'DRY-RUN'}: {len(written_slugs)} live, "
          f"{len(pruned)} pruned ===")

    if write:
        git_commit_push(len(written_slugs), len(pruned), args.push)
    else:
        print("\n(dry-run — no files written, no git. Use --write / --push.)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
