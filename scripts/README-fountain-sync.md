# Fountain → jobs sync (hiring-SEO freshness engine)

`sync_fountain_jobs.py` keeps `content/jobs/*.mdx` in lockstep with the **live,
active** openings in Fountain, so Google for Jobs always sees fresh, non-expired
postings and every open station/role gets its own indexable page. It runs on
**terminator67** (not Vercel), then commits + pushes → Vercel auto-deploys.

## Content model (hybrid)

| Source | Owns |
|---|---|
| **Fountain opening** | which openings are `active`, station, location, freshness dates, apply URL, slug |
| **Editorial template** (`content/job-templates/<roleType>.mdx`) | public title, salary, benefits, body copy, `es` overrides |

Generated files carry `source: fountain` + a `DO NOT EDIT` banner. The sync only
ever prunes `source: fountain` files — hand-authored jobs (`source: manual`, the
default) are never touched. Edit copy in `content/job-templates/`, never in
`content/jobs/`.

## Interpreter + credentials

- **Interpreter: system `python3`** (has PyYAML 6.x). The platform venv does
  *not* have PyYAML. The script imports the platform's stdlib-only
  `core.services.fountain_client` via `sys.path` (PLATFORM_ROOT constant) — no
  platform venv needed.
- **Creds:** the client reads `FOUNTAIN_CLIENT_ID` / `FOUNTAIN_CLIENT_SECRET`
  from the environment (OAuth client_credentials). They live in the root-only
  `/etc/sycamore/secrets-prod.env`. For the timer, extract just those two into a
  scoped env file (least privilege, and dodges the "malformed line breaks
  `set -a`" trap):

  ```bash
  # once, as root:
  umask 077
  { grep '^FOUNTAIN_CLIENT_ID='     /etc/sycamore/secrets-prod.env
    grep '^FOUNTAIN_CLIENT_SECRET=' /etc/sycamore/secrets-prod.env
  } > /etc/sycamore/secrets-fountain-sync.env
  chown root:root /etc/sycamore/secrets-fountain-sync.env
  chmod 600 /etc/sycamore/secrets-fountain-sync.env
  ```

## STEP 0 — one-time probe (unblocks the field mapping) ⚠️

The field mapping in `opening_to_fields()` is **provisional** — every raw-field
access is marked `TODO(probe)`. Capture one real `/funnels` response so the
mapping can be finalized against actual field names:

```bash
sudo bash -c 'export FOUNTAIN_CLIENT_ID=$(grep "^FOUNTAIN_CLIENT_ID=" /etc/sycamore/secrets-prod.env|cut -d= -f2-); export FOUNTAIN_CLIENT_SECRET=$(grep "^FOUNTAIN_CLIENT_SECRET=" /etc/sycamore/secrets-prod.env|cut -d= -f2-); cd /home/coreadmin/sycamore-platform && python3 -c "import sys;sys.path.insert(0,\".\");import json;from core.services.fountain_client import FountainClient as C;print(json.dumps(C().funnels(),indent=2,default=str))"' \
  > /home/coreadmin/cowork-exchange/outbox/funnels-probe.json 2>&1
```

Then hand the file to CC to replace the `TODO(probe)` field names, and validate
with **no creds**:

```bash
python3 scripts/sync_fountain_jobs.py --from-file <probe.json>   # dry-run
```

## Manual run

```bash
cd /home/coreadmin/sycamore-website
set -a; . /etc/sycamore/secrets-fountain-sync.env; set +a

python3 scripts/sync_fountain_jobs.py            # DRY-RUN (default): prints plan
python3 scripts/sync_fountain_jobs.py --write    # write MDX + local commit
python3 scripts/sync_fountain_jobs.py --push      # write + commit + push→Vercel
```

## STEP 1 — daily timer (systemd, runs as coreadmin)

Push auth already works: `origin` is `git@github.com:...` and coreadmin's SSH key
pushed the SEO deploy. Clean-tree discipline: the script only `git add
content/jobs`, so unrelated dirty files won't block it — but keep the checkout
clean regardless.

`/etc/systemd/system/sycamore-jobs-sync.service`:
```ini
[Unit]
Description=Sync Fountain openings -> sycamore-website jobs
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=coreadmin
WorkingDirectory=/home/coreadmin/sycamore-website
EnvironmentFile=/etc/sycamore/secrets-fountain-sync.env
ExecStart=/usr/bin/python3 scripts/sync_fountain_jobs.py --push
```

`/etc/systemd/system/sycamore-jobs-sync.timer`:
```ini
[Unit]
Description=Daily Fountain jobs sync

[Timer]
OnCalendar=*-*-* 08:30:00 America/New_York
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sycamore-jobs-sync.timer
sudo systemctl start sycamore-jobs-sync.service   # first manual run
journalctl -u sycamore-jobs-sync.service -n 50 --no-pager
```

## Rollout order

1. Create the scoped env file (above).
2. **STEP 0 probe** → CC finalizes `opening_to_fields()` → `--from-file` dry-run.
3. Live `--push` once by hand; confirm the generated `content/jobs/*.mdx` and the
   Vercel deploy. Reconcile the hand-authored `dba7-…-specialist.mdx` (delete it
   once its Fountain-sourced equivalent renders, to avoid a duplicate listing).
4. Enable the timer.
```
