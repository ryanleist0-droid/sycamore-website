import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FountainApplyButton } from "@/components/careers/FountainApplyButton";
import { JobPostingSchema } from "@/components/careers/JobPostingSchema";
import { InlineImage } from "@/components/marketing/InlineImage";
import { localeAlternates } from "@/lib/locale-alternates";
import {
  getAllJobs,
  getJobBySlug,
  jobDescription,
  jobTitle,
  type Job,
  type Locale,
} from "@/lib/jobs";
import { routing } from "@/i18n/routing";

type Params = { locale: string; slug: string };

export async function generateStaticParams() {
  const jobs = await getAllJobs();
  const out: Params[] = [];
  for (const locale of routing.locales) {
    for (const job of jobs) {
      out.push({ locale, slug: job.slug });
    }
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale: Locale = localeParam === "es" ? "es" : "en";
  const job = await getJobBySlug(slug);
  if (!job) {
    return { title: locale === "es" ? "No encontrado" : "Not found" };
  }
  const title = jobTitle(job, locale);
  return {
    title,
    description: jobDescription(job, locale),
    alternates: {
      canonical: `/${locale}/careers/${slug}`,
      languages: localeAlternates(`/careers/${slug}`),
    },
    openGraph: { title, description: jobDescription(job, locale), type: "article" },
  };
}

export default async function JobPostingPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale: Locale = localeParam === "es" ? "es" : "en";
  setRequestLocale(localeParam);

  const job = await getJobBySlug(slug);
  if (!job) notFound();

  const t = (en: string, es: string) => (locale === "es" ? es : en);
  const title = jobTitle(job, locale);
  const teaser = jobDescription(job, locale);
  const locationLabel = job.location.displayName ?? `${job.location.city}, ${job.location.state}`;
  const salaryLabel = formatSalary(job.baseSalary, locale);

  return (
    <>
      <JobPostingSchema job={job} locale={locale} />

      <header className="marketing-container py-12 md:py-20">
        <div className="text-[12px] uppercase tracking-[1.5px] font-bold text-brand-green mb-3">
          {t("CAREERS", "TRABAJA CON NOSOTROS")}
        </div>
        <h1 className="text-[32px] md:text-[40px] lg:text-[48px] font-extrabold text-text-primary leading-[1.1] tracking-tight">
          {title}
        </h1>
        {teaser && (
          <p className="mt-4 text-[16px] md:text-[18px] text-text-secondary max-w-[720px]">
            {teaser}
          </p>
        )}

        <div className="mt-6 flex items-center gap-2 flex-wrap">
          <RolePill>{job.station}</RolePill>
          <RolePill>{employmentTypeLabel(job.employmentType, locale)}</RolePill>
          <RolePill>{locationLabel}</RolePill>
          {salaryLabel && <RolePill>{salaryLabel}</RolePill>}
        </div>

        <div className="mt-8 flex items-center gap-4 flex-wrap">
          <FountainApplyButton
            href={job.fountainApplyUrl}
            label={t("Apply on Fountain", "Aplicar en Fountain")}
          />
          <Link
            href="/careers"
            className="text-[14px] font-semibold text-text-secondary hover:text-brand-green"
          >
            {t("← Back to all roles", "← Volver a todas las vacantes")}
          </Link>
        </div>
      </header>

      <section className="marketing-container pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <article className="mdx-prose lg:col-span-8 max-w-[720px]">
            <MDXRemote source={job.body} components={{ InlineImage }} />
          </article>

          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="rounded-2xl border border-border-subtle bg-bg-surface p-5">
                <h2 className="text-[14px] font-extrabold text-text-primary uppercase tracking-[0.06em] mb-3">
                  {t("Role summary", "Resumen del puesto")}
                </h2>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-[13px]">
                  <SummaryRow label={t("Station", "Estación")} value={job.station} />
                  <SummaryRow
                    label={t("Location", "Ubicación")}
                    value={locationLabel}
                  />
                  <SummaryRow
                    label={t("Type", "Tipo")}
                    value={employmentTypeLabel(job.employmentType, locale)}
                  />
                  {salaryLabel && (
                    <SummaryRow label={t("Pay", "Pago")} value={salaryLabel} />
                  )}
                  <SummaryRow
                    label={t("Posted", "Publicado")}
                    value={formatDate(job.datePosted, locale)}
                  />
                </dl>
                <div className="mt-5">
                  <FountainApplyButton
                    href={job.fountainApplyUrl}
                    label={t("Apply on Fountain", "Aplicar en Fountain")}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-text-tertiary font-bold uppercase text-[10.5px] tracking-[0.06em] pt-0.5">
        {label}
      </dt>
      <dd className="text-text-primary font-semibold">{value}</dd>
    </>
  );
}

function RolePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-bg-subtle border border-border-emphasized text-text-secondary px-2.5 py-1 text-xs font-bold">
      {children}
    </span>
  );
}

function employmentTypeLabel(t: Job["employmentType"], locale: Locale): string {
  const labels: Record<Job["employmentType"], { en: string; es: string }> = {
    FULL_TIME: { en: "Full-time", es: "Tiempo completo" },
    PART_TIME: { en: "Part-time", es: "Medio tiempo" },
    CONTRACTOR: { en: "Contractor", es: "Contratista" },
    TEMPORARY: { en: "Temporary", es: "Temporal" },
    INTERN: { en: "Intern", es: "Pasante" },
    OTHER: { en: "Other", es: "Otro" },
  };
  return labels[t][locale];
}

function formatSalary(s: Job["baseSalary"], locale: Locale): string | null {
  if (!s?.minValue) return null;
  const min = formatMoney(s.minValue, s.currency, locale);
  const unit = unitLabel(s.unitText, locale);
  if (s.maxValue !== undefined) {
    return `${min}–${formatMoney(s.maxValue, s.currency, locale)} ${unit}`;
  }
  return `${min}+ ${unit}`;
}

function formatMoney(value: number, currency: string, locale: Locale): string {
  try {
    return new Intl.NumberFormat(locale === "es" ? "es-US" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

function unitLabel(u: Job["baseSalary"]["unitText"], locale: Locale): string {
  const map: Record<Job["baseSalary"]["unitText"], { en: string; es: string }> = {
    HOUR: { en: "/ hour", es: "/ hora" },
    DAY: { en: "/ day", es: "/ día" },
    WEEK: { en: "/ week", es: "/ semana" },
    MONTH: { en: "/ month", es: "/ mes" },
    YEAR: { en: "/ year", es: "/ año" },
  };
  return map[u][locale];
}

function formatDate(iso: string, locale: Locale): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
}
