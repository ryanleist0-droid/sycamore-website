import type { Job, Locale } from "@/lib/jobs";
import { buildJobPostingJsonLd } from "@/lib/schema";

/**
 * Renders the schema.org JobPosting JSON-LD as a `<script>` tag. Goes in
 * the page body — Next 15 hoists `<script type="application/ld+json">`
 * to the head automatically when rendered in a page tree.
 */
export function JobPostingSchema({
  job,
  locale,
}: {
  job: Job;
  locale: Locale;
}) {
  const jsonLd = buildJobPostingJsonLd(job, locale);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
