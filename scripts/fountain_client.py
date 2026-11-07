# fountain_client.py — vendored copy for the website repo (websites off terminator67, 2026-11-07). The canonical client is
# sycamore-platform/core/services/fountain_client.py; the jobs sync imported it from the platform checkout on terminator67,
# which a GitHub runner does not have. Standard library only; credentials from FOUNTAIN_CLIENT_ID / FOUNTAIN_CLIENT_SECRET.
# Re-copy from the platform when that file changes (header below is the original).
"""Shared Fountain REST client — OAuth client_credentials + tenant-shard base.

Single code path for the webhook handler (token not needed there), the backfill
script, and the nightly reconciliation poll, so the OAuth/HTTP quirks discovered
in Phase 0A live in exactly one place (addendum §7).

Auth model (Phase 0A findings):
  1. OAuth client_credentials handshake at services.fountain.com with
     FOUNTAIN_CLIENT_ID:FOUNTAIN_CLIENT_SECRET Basic auth; grant_type + scopes
     in the URL query string (NOT the body — body params 403).
  2. The JWT body carries `hireAccountBaseUrl` (Fountain shards tenants
     regionally, e.g. https://us-4.fountain.com); API base is `<host>/api/v2`.
  3. Every request carries a descriptive User-Agent to clear the Cloudflare
     bot filter (default Python-urllib UA → 403 error 1010).
  4. Bearer token TTL ~3600s; one fetch per process run is fine.

Credentials are read from os.environ only and never logged/echoed
(feedback_cc_credential_handling.md).
"""

from __future__ import annotations

import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

TOKEN_URL = ("https://services.fountain.com/api/servicesecurity/processes/"
             "apikey/oauth/token")
DEFAULT_BASE_HOST = "https://us-4.fountain.com"
USER_AGENT = "Allium-Integration/1.0 (Sycamore Logistics)"
_TIMEOUT = 30


class FountainAuthError(RuntimeError):
    pass


class FountainClient:
    """Authenticated Fountain client. Construct once per process run."""

    def __init__(self, client_id: str | None = None, client_secret: str | None = None):
        self._cid = client_id or os.environ.get("FOUNTAIN_CLIENT_ID")
        self._sec = client_secret or os.environ.get("FOUNTAIN_CLIENT_SECRET")
        if not self._cid or not self._sec:
            raise FountainAuthError(
                "FOUNTAIN_CLIENT_ID / FOUNTAIN_CLIENT_SECRET not in environment")
        self._token: str | None = None
        self._base: str | None = None
        # Auth mode for /api/v2 calls: 'bearer' (default) or 'token' (fallback).
        self._auth_mode = "bearer"
        # Cached working applicants-endpoint template, discovered on first use.
        self._applicants_tmpl: str | None = None

    # ── auth ────────────────────────────────────────────────────────────────
    def authenticate(self) -> None:
        basic = base64.b64encode(f"{self._cid}:{self._sec}".encode()).decode()
        url = TOKEN_URL + "?grant_type=client_credentials&scopes=employer"
        req = urllib.request.Request(url, data=b"", method="POST", headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": f"Basic {basic}",
            "User-Agent": USER_AGENT,
        })
        try:
            with urllib.request.urlopen(req, timeout=_TIMEOUT) as r:
                body = json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            detail = _safe_body(e)
            raise FountainAuthError(f"token POST HTTP {e.code} {e.reason}: {detail[:300]}")
        tok = body.get("access_token") or body.get("token") or body.get("accessToken")
        if not tok:
            raise FountainAuthError(f"token response missing access_token (keys: {list(body)})")
        self._token = tok
        self._base = _derive_base(tok)

    def _ensure_auth(self) -> None:
        if not self._token:
            self.authenticate()

    @property
    def base(self) -> str:
        self._ensure_auth()
        return self._base  # type: ignore[return-value]

    def _auth_headers(self) -> dict:
        if self._auth_mode == "bearer":
            return {"Authorization": f"Bearer {self._token}"}
        return {"X-ACCESS-TOKEN": self._token}  # type: ignore[dict-item]

    # ── HTTP ─────────────────────────────────────────────────────────────────
    def get_json(self, path: str, params: dict | None = None):
        """GET <base><path>?<params>. path starts with '/'. Returns parsed JSON.
        Auto-falls back Bearer→X-ACCESS-TOKEN once on a 401. Raises HTTPError
        (with body attached) on non-2xx other than the one-time 401 retry."""
        self._ensure_auth()
        url = f"{self._base}{path}"
        if params:
            url += "?" + urllib.parse.urlencode(params)
        for _ in range(2):
            req = urllib.request.Request(url, headers={
                "Accept": "application/json", "User-Agent": USER_AGENT,
                **self._auth_headers(),
            })
            try:
                with urllib.request.urlopen(req, timeout=_TIMEOUT) as r:
                    return json.loads(r.read().decode("utf-8"))
            except urllib.error.HTTPError as e:
                if e.code == 401 and self._auth_mode == "bearer":
                    self._auth_mode = "token"
                    continue
                e.fountain_body = _safe_body(e)  # type: ignore[attr-defined]
                raise
        return None

    def paginate(self, path: str, params: dict | None = None,
                 item_keys=("funnels", "stages", "applicants", "data")):
        """Yield items across pages (?page=). Stops on short page or when
        pagination metadata says the last page is reached."""
        page, per = 1, int((params or {}).get("per_page", 100) or 100)
        while True:
            p = dict(params or {})
            p["page"] = page
            try:
                body = self.get_json(path, p)
            except urllib.error.HTTPError as e:
                # Fountain returns 404 (not an empty list) for a stage/collection
                # with zero applicants. Treat that as "empty" so the backfill
                # doesn't crash on a zero-applicant stage once the applicants
                # template is cached (the probe survived only because
                # count_for_stage swallowed the error).
                if e.code == 404:
                    if page == 1:
                        sys.stderr.write(f"[fountain] {path}: 0 items (404 = empty)\n")
                    return
                raise
            if body is None:
                return
            items = None
            if isinstance(body, dict):
                for ik in item_keys:
                    if isinstance(body.get(ik), list):
                        items = body[ik]
                        break
            elif isinstance(body, list):
                items = body
            if not items:
                return
            for it in items:
                yield it
            pg = (body.get("pagination") or {}) if isinstance(body, dict) else {}
            if pg:
                if page >= int(pg.get("total_pages", page)):
                    return
            elif len(items) < per:
                return
            page += 1
            if page > 1000:  # safety backstop
                return

    # ── domain helpers ────────────────────────────────────────────────────────
    def funnels(self) -> list:
        return list(self.paginate("/funnels", {"per_page": 100}))

    def stages(self, funnel_id: str) -> list:
        return list(self.paginate(f"/funnels/{funnel_id}/stages", {"per_page": 100}))

    # Candidate applicant-list endpoints, tried in order until one works
    # (Phase 0A's bare /applicants 404'd — addendum §4). {fid}=funnel id,
    # {sid}=stage id. The first template that returns 2xx is cached.
    _APPLICANT_TEMPLATES = (
        "/stages/{sid}/applicants",
        "/funnels/{fid}/applicants?stage_id={sid}",
        "/funnels/{fid}/applicants",
        "/openings/{fid}/applicants?stage_id={sid}",
        "/applicants?stage_id={sid}",
    )

    def discover_applicants_template(self, funnel_id: str, stage_id: str) -> str | None:
        """Probe the candidate templates once; cache + return the working one.
        Returns None if every candidate 404s (caller logs the gap)."""
        if self._applicants_tmpl:
            return self._applicants_tmpl
        for tmpl in self._APPLICANT_TEMPLATES:
            path = tmpl.format(fid=funnel_id, sid=stage_id)
            base_path, _, qs = path.partition("?")
            params = dict(urllib.parse.parse_qsl(qs)) if qs else {}
            params["per_page"] = 1
            try:
                self.get_json(base_path, params)
                # strip per_page=1 probe param from the cached template
                self._applicants_tmpl = tmpl
                return tmpl
            except urllib.error.HTTPError as e:
                if e.code in (404, 400, 422):
                    continue
                raise
        return None

    def applicants_for_stage(self, funnel_id: str, stage_id: str):
        """Yield applicant records for one stage via the discovered endpoint.
        Yields nothing if no working template was found."""
        tmpl = self.discover_applicants_template(funnel_id, stage_id)
        if not tmpl:
            return
        path = tmpl.format(fid=funnel_id, sid=stage_id)
        base_path, _, qs = path.partition("?")
        params = dict(urllib.parse.parse_qsl(qs)) if qs else {}
        params["per_page"] = 100
        yield from self.paginate(base_path, params)

    def count_for_stage(self, funnel_id: str, stage_id: str) -> int:
        return sum(1 for _ in self.applicants_for_stage(funnel_id, stage_id))


# ── module helpers ──────────────────────────────────────────────────────────
def _safe_body(e: urllib.error.HTTPError) -> str:
    try:
        return e.read().decode("utf-8", "replace")
    except Exception:  # noqa: BLE001
        return "<no body>"


def _derive_base(token: str) -> str:
    """Return f"{hireAccountBaseUrl}/api/v2" from the JWT body, falling back to
    the us-4 shard. Reads only the host claim; never logs the token."""
    try:
        seg = token.split(".")[1]
        seg += "=" * (-len(seg) % 4)
        claims = json.loads(base64.urlsafe_b64decode(seg).decode("utf-8"))
        host = (claims.get("hireAccountBaseUrl") or "").rstrip("/")
        if host:
            return f"{host}/api/v2"
    except Exception:  # noqa: BLE001
        pass
    return f"{DEFAULT_BASE_HOST}/api/v2"
