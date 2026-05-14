import { getAllJobs, type Locale } from "@/lib/jobs";
import { JobPostingCard } from "./JobPostingCard";

/**
 * Server component. Loads all `content/jobs/*.mdx` at request time and
 * renders a vertical list of JobPostingCard. Embedded in MDX via
 * `<JobPostingsList />` so the careers index author can place the list
 * wherever in the narrative they want.
 *
 * Empty-state message mirrors the addendum §4.8 spec.
 */
export async function JobPostingsList({ locale }: { locale: Locale }) {
  const jobs = await getAllJobs();

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6 my-6">
        <p className="text-[14px] text-text-secondary leading-relaxed">
          {locale === "es"
            ? "Sycamore no está contratando para ningún rol en este momento. Vuelve a revisar pronto, o déjanos un mensaje en la página de "
            : "Sycamore isn't hiring for any roles right now. Check back soon — or drop us a note on the "}
          <a className="text-brand-green font-semibold hover:text-brand-green-dark" href={`/${locale}/contact`}>
            {locale === "es" ? "Contacto" : "Contact"}
          </a>
          {locale === "es"
            ? " y te avisaremos cuando abramos algo cerca de ti."
            : " page and we'll reach out when we open something near you."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 my-6">
      {jobs.map((job) => (
        <JobPostingCard key={job.slug} job={job} locale={locale} />
      ))}
    </div>
  );
}
