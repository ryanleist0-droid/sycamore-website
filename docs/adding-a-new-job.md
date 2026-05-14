# Adding a new job

D1 stub. D3 fills this with the seed DBA7 role + step-by-step runbook for Cowork's future use.

Target shape (subject to D3 confirmation):

1. Create `content/jobs/<slug>.mdx` with frontmatter:

   ```yaml
   ---
   title: "..."
   station: "DBA7"
   location: { city: "...", state: "...", postalCode: "..." }
   employmentType: "FULL_TIME"
   datePosted: "YYYY-MM-DD"
   validThrough: "YYYY-MM-DD"
   baseSalary: { min: 0, max: 0, currency: "USD", unit: "HOUR" }
   description: "Brief summary used in careers index card and JobPosting description."
   fountainApplyUrl: "https://us-4.fountain.com/apply/..."
   locales:
     es:
       title: "..."
       description: "..."
   ---
   ```

2. MDX body holds the full role description (markdown sections like *About the role*, *What you'll do*, etc.).

3. Push to `main`. Vercel deploys; the role appears at `/{en,es}/careers/<slug>` automatically.

4. Validate JobPosting JSON-LD via Google Rich Results Test (or `npm run validate:schema` once D3 adds the local validator).
