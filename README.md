# sycamore-website

Public marketing site for Sycamore Logistics. Next.js 15 + TypeScript + Tailwind v4 + shadcn/ui + next-intl, deployed to Vercel.

**Status:** Phase 1A D1 scaffold (2026-05-14). Content lands in D2 (English) / D4 (Spanish); contact form wires in D5; SEO infrastructure finishes in D6.

---

## Design spec inheritance

Visual discipline lives in `cowork-exchange/sycamore-enterprise/` (private repo, not in this codebase):

- `design-spec.md` — operational Allium spec; color tokens, typography, component vocabulary.
- `design-spec-marketing-addendum.md` — marketing-context additions (spacing scale, hero, locale switcher, etc.).

The Tailwind tokens in `src/app/globals.css` are the wiring point: when the spec adds or revises a token, mirror the change here.

---

## Local development

```bash
# Node 20+, npm 10+
npm install
cp .env.local.example .env.local   # then fill in Turnstile keys (D5+)
npm run dev                         # http://localhost:3000
```

Visit `http://localhost:3000` — the middleware redirects `/` to `/en`.

`npm run lint` runs ESLint. `npm run build` runs the production build (the same build Vercel runs on push to `main`).

---

## Deploy (Vercel)

1. Vercel project: `sycamore-website` (linked to this GitHub repo).
2. Production branch: `main`. Every push deploys.
3. Required environment variables (Vercel → Project → Settings → Environment Variables):
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — Cloudflare Turnstile **site** key (public, safe to embed).
   - `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile **secret** key (server-only).

   Values live in `cowork-exchange/outbox/website-phase-1a-secrets.md` on terminator67 — paste into Vercel only, never commit either key here.

4. After the first Vercel deploy, add the assigned `*.vercel.app` hostname to the existing Turnstile widget's Hostname Management list. No new keys, just one more entry.

---

## Directory layout (Phase 1A)

```
sycamore-website/
├── content/
│   ├── pages/{en,es}/             # marketing page MDX (D2 / D4)
│   └── jobs/                       # JobPosting MDX with frontmatter (D3)
├── messages/                       # next-intl UI-chrome strings
│   ├── en.json
│   └── es.json
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── (marketing)/        # home, about, services, contact
│   │   │   ├── careers/            # index + [slug]
│   │   │   └── layout.tsx          # locale layout — chrome + Organization JSON-LD
│   │   ├── api/contact/route.ts    # D5 wires the Turnstile-validated POST
│   │   ├── globals.css             # design-spec token wiring
│   │   └── layout.tsx              # root shell
│   ├── components/
│   │   ├── chrome/{MarketingHeader,MarketingFooter,LocaleSwitcher}.tsx
│   │   ├── marketing/{MarketingHero,PhotoPlaceholder,...}.tsx
│   │   ├── careers/                # JobPostingCard, JobPostingPage (D3)
│   │   └── ui/                     # shadcn primitives (added per-component as needed)
│   ├── i18n/{routing,navigation,request}.ts
│   ├── lib/{utils,schema}.ts
│   └── middleware.ts               # next-intl locale routing
└── docs/
    └── adding-a-new-job.md         # D3 runbook
```

---

## Adding a new job (D3+)

See `docs/adding-a-new-job.md` (stubbed in D1, filled in D3 with the seed DBA7 role).

---

## Phase dependencies

- **Phase 1A** — this scaffold + content + careers + Spanish + contact form + SEO. Ships to a Vercel preview.
- **Phase 1B** — wire `/api/contact` to an Allium intake endpoint (currently logs only).
- **Phase 1C** — Cloudflare origin swap; cancel GoDaddy.
- **Phase 1D** — post-launch verification + Google Search Console.

The Allium operational platform and `sycamore-platform` repo are not touched by this project.
