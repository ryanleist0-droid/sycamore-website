#!/usr/bin/env python3
"""
Sync live Fountain openings -> content/jobs/*.mdx for the marketing site.

WHY: hiring-SEO (Google for Jobs) rewards fresh, live postings and drops
expired ones. Hand-maintained MDX goes stale and doesn't scale past one role.
This script is the source of truth for which jobs are live: it reads the active
Fountain openings, joins each against an editorial template in
content/job-templates/<roleType>.mdx, and writes a finished, schema-complete
content/jobs/<slug>.mdx. Openings that close are pruned. datePosted /
validThrough are refreshed every run so listings never expire out of Google.

TOPOLOGY: runs on terminator67 (where the credentialed Fountain client + creds
already live), then commits + pushes sycamore-website -> Vercel auto-deploys.
It does NOT run on Vercel; no Fountain creds leave the server.

CONTENT MODEL (hybrid):
  Fountain (authoritative) -> which openings are active, station, location,
                              freshness dates, apply URL, stable slug.
  Editorial template       -> public title, salary, benefits, body copy, es
                              overrides. Written once per role type, reused.

SAFETY: dry-run by default (prints a plan, writes nothing). --write to write
files; --push to also commit + push. --from-file <json> replays a saved
`/funnels` dump so the mapping can be validated with no network / no creds.

DEPENDS: PyYAML + the platform Fountain client. Run under the platform venv:
  /home/coreadmin/sycamore-platform/venv/bin/python scripts/sync_fountain_jobs.py --dry-run
(the client is stdlib-only, but this venv guarantees PyYAML is present).

⚠️  FIELD MAPPING IS PROVISIONAL. Every access of a raw Fountain opening field
is marked `TODO(probe)` — the exact names (active flag, location shape, slug,
apply URL, date fields) must be confirmed against a real `/funnels` response
(see scripts/README-fountain-sync.md for the one-time probe command). Until
then, run only with --from-file / --dry-run.
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
        "PyYAML is required. Run under the platform venv:\n"
        "  /home/coreadmin/sycamore-platform/venv/bin/python "
        "scripts/sync_fountain_jobs.py ...\n"
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
VALIDITY_WINDOW_DAYS = 30
COUNTRY_DEFAULT = "US"
# Public apply URL pattern. TODO(probe): prefer the opening's own apply/careers
# URL if the payload carries one; fall back to this pattern otherwise.
APPLY_URL_PATTERN = (
    "https://us-4.fountain.com/apply/sycamore-logistics-llc/opening/{slug}"
)
# Location display labels keyed off the derived (city, state). Extend as new
# stations come online. The market label ("Hagerstown area") is intentionally
# distinct from the physical city (Williamsport) — see the SEO doctrine note.
LOCATION_LABELS = {
    ("Williamsport", "MD"): {
        "en": "Hagerstown, MD area",
        "es": "área de Hagerstown, MD",
    },
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
    """Load content/job-templates/*.mdx. Each -> {roleType, patterns, fm, body}.
    Longer/more-specific pattern lists first isn't guaranteed by fs order, so
    we sort by roleType for deterministic first-match behaviour."""
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


def match_role(title: str, templates: list[dict]) -> dict | None:
    t = (title or "").lower()
    for tpl in templates:
        if any(p in t for p in tpl["patterns"]):
            return tpl
    return None


# ---------------------------------------------------------------------------
# Fountain opening -> Job fields   ⚠️ PROVISIONAL — confirm against a real probe
# ---------------------------------------------------------------------------
def opening_is_active(op: dict) -> bool:
    # TODO(probe): confirm the flag name. Docs call it `active` (bool).
    return bool(op.get("active", op.get("status") in (None, "active", "open", True)))


def _slugify(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")
    return s or "opening"


def _parse_address(op: dict) -> dict:
    """Best-effort city/state/zip from the opening. TODO(probe): the real
    payload may already expose structured city/state/postal_code — prefer those
    over regex-splitting a `location_address` string."""
    # Structured fields first (guessed names).
    city = op.get("city") or op.get("location_city")
    state = op.get("state") or op.get("location_state")
    postal = op.get("postal_code") or op.get("zip") or op.get("location_postal_code")
    country = op.get("country") or COUNTRY_DEFAULT
    # Fall back to parsing a "Street, City, ST 21795" address string.
    if not (city and state):
        addr = op.get("location_address") or op.get("address") or ""
        m = re.search(r",\s*([A-Za-z .'-]+),\s*([A-Z]{2})\s*(\d{5})?", addr)
        if m:
            city = city or m.group(1).strip()
            state = state or m.group(2).strip()
            postal = postal or (m.group(3) or "")
    return {
        "city": (city or "").strip(),
        "state": (state or "").strip(),
        "postalCode": (postal or "").strip(),
        "country": country,
    }


def _location_labels(city: str, state: str) -> dict:
    lab = LOCATION_LABELS.get((city, state))
    if lab:
        return lab
    return {
        loc: tmpl.format(city=city, state=state)
        for loc, tmpl in DEFAULT_LABEL.items()
    }


def opening_to_fields(op: dict, now: datetime) -> dict:
    """Map a raw Fountain opening -> the Fountain-driven Job frontmatter layer.
    ⚠️ Every op.get(...) here is a TODO(probe) until confirmed against a real
    /funnels response."""
    fid = op.get("id") or op.get("funnel_id")  # TODO(probe)
    title = op.get("title") or op.get("name") or ""  # TODO(probe)
    # Slug: prefer an explicit stable slug from the opening; else derive.
    slug = op.get("slug") or _slugify(f"{op.get('external_id') or fid or title}")
    addr = _parse_address(op)
    labels = _location_labels(addr["city"], addr["state"])
    # datePosted: prefer the opening's created_at; refresh-safe fallback = now.
    created = op.get("created_at") or op.get("published_at")  # TODO(probe)
    date_posted = _iso_date(created) or now.date().isoformat()
    valid_through = (now + timedelta(days=VALIDITY_WINDOW_DAYS)).date().isoformat()
    # Apply URL: prefer an explicit one; else the standard pattern on the slug.
    apply_url = (
        op.get("apply_url") or op.get("careers_url")  # TODO(probe)
        or APPLY_URL_PATTERN.format(slug=slug)
    )
    station = (op.get("brand") or op.get("location_name") or "").strip()  # TODO(probe)
    return {
        "slug": slug,
        "fountainTitle": title,
        "station": station,
        "location": {**addr, "displayName": labels["en"]},
        "datePosted": date_posted,
        "validThrough": valid_through,
        "fountainApplyUrl": apply_url,
        "labels": labels,
    }


def _iso_date(value) -> str | None:
    if not value:
        return None
    s = str(value)
    m = re.match(r"(\d{4}-\d{2}-\d{2})", s)
    return m.group(1) if m else None


# ---------------------------------------------------------------------------
# Render
# ---------------------------------------------------------------------------
def _sub_labels(text: str, labels: dict, locale: str) -> str:
    return (text or "").replace("{{LOCATION_LABEL}}", labels.get(locale, labels["en"]))


def render_job_mdx(tpl: dict, f: dict) -> str:
    """Build the finished content/jobs/<slug>.mdx string."""
    fm = tpl["fm"]
    labels = f["labels"]
    locales = {}
    for loc, ov in (fm.get("locales") or {}).items():
        locales[loc] = {
            k: _sub_labels(v, labels, loc) for k, v in ov.items()
        }
    frontmatter = {
        "title": fm.get("title", tpl["roleType"]),
        "station": f["station"],
        "location": f["location"],
        "employmentType": fm.get("employmentType", "FULL_TIME"),
        "datePosted": f["datePosted"],
        "validThrough": f["validThrough"],
        "baseSalary": fm.get("baseSalary"),
        "description": _sub_labels(fm.get("description", ""), labels, "en"),
        "fountainApplyUrl": f["fountainApplyUrl"],
        "source": "fountain",
    }
    if locales:
        frontmatter["locales"] = locales
    body = _sub_labels(tpl["body"], labels, "en").lstrip("\n")
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
    # Live: reuse the canonical, credentialed platform client.
    if PLATFORM_ROOT not in sys.path:
        sys.path.insert(0, PLATFORM_ROOT)
    from core.services.fountain_client import FountainClient  # type: ignore

    return FountainClient().funnels()


# ---------------------------------------------------------------------------
# Git
# ---------------------------------------------------------------------------
def _git(*args: str) -> str:
    return subprocess.run(
        ["git", "-C", REPO_ROOT, *args],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()


def git_commit_push(n_written: int, n_pruned: int, push: bool) -> None:
    status = _git("status", "--porcelain", "content/jobs")
    if not status:
        print("[git] no job changes — nothing to commit")
        return
    _git("add", "content/jobs")
    msg = (
        f"jobs: sync from Fountain ({n_written} live, {n_pruned} pruned)\n\n"
        "Automated by scripts/sync_fountain_jobs.py. Do not hand-edit "
        "content/jobs/*.mdx (source: fountain)."
    )
    _git("commit", "-m", msg)
    print(f"[git] committed: {n_written} live, {n_pruned} pruned")
    if push:
        _git("push", "origin", "main")
        print("[git] pushed origin/main -> Vercel will deploy")
    else:
        print("[git] --push not set; commit is local only")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--from-file", help="replay a saved /funnels JSON dump (no network)")
    ap.add_argument("--write", action="store_true", help="write MDX files (default: dry-run)")
    ap.add_argument("--push", action="store_true", help="git commit + push (implies --write)")
    ap.add_argument("--limit", type=int, default=0, help="cap openings processed (debug)")
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

    active = [op for op in openings if opening_is_active(op)]
    print(f"[fetch] {len(openings)} openings, {len(active)} active")

    written_slugs: set[str] = set()
    plan = []
    for op in active:
        f = opening_to_fields(op, now)
        tpl = match_role(f["fountainTitle"], templates)
        if not tpl:
            plan.append(("skip-no-template", f["fountainTitle"], f["slug"]))
            continue
        written_slugs.add(f["slug"])
        path = os.path.join(JOBS_DIR, f"{f['slug']}.mdx")
        mdx = render_job_mdx(tpl, f)
        plan.append(("write", tpl["roleType"], f["slug"]))
        if write:
            os.makedirs(JOBS_DIR, exist_ok=True)
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(mdx)

    # Prune: fountain-sourced job files no longer backed by an active opening.
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
        print(f"  {action:20} {role:22} {slug}")
    for slug in pruned:
        print(f"  {'prune':20} {'(closed)':22} {slug}")
    print(f"=== {'WROTE' if write else 'DRY-RUN'}: "
          f"{len(written_slugs)} live, {len(pruned)} pruned ===")

    if write:
        git_commit_push(len(written_slugs), len(pruned), args.push)
    else:
        print("\n(dry-run — no files written, no git. Use --write / --push.)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
