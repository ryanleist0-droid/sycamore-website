# Adding a job

Jobs are not edited in this repo. They come live from Allium, Sycamore's hiring platform:

1. In Allium, open **Applicants → Openings → New opening**: pick the building and role, write the title,
   summary and description (Spanish optional), then **Publish**.
2. Within about five minutes the opening is on `/careers` and has its own page at `/careers/<slug>`,
   with Google-for-Jobs data, and its Apply button opens the Allium application for that building.
3. **Close** the opening in Allium to take it down (its page then returns 404, which de-lists it).

Pay and shift lines come from the building's approved **Job facts** in Allium; until they are approved
the listing shows no pay.

Mechanics: `src/lib/jobs.ts` reads `https://app.alliumproject.com/api/jobs` (override with
`ALLIUM_JOBS_FEED_URL`) and Next re-fetches it every 300 seconds (ISR). The Fountain sync that used to write
`content/jobs/*.mdx` was retired on 2026-11-12.
