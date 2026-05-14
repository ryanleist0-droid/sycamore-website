import { Link } from "@/i18n/navigation";
import type { Job, Locale } from "@/lib/jobs";
import { jobDescription, jobTitle } from "@/lib/jobs";

/**
 * JobPostingCard — single row on the careers index.
 *
 * Per addendum §4.8: card chrome `rounded-2xl border-[#e5e6e9] bg-white p-5
 * hover:border-[#3a8a64] hover:bg-[#f0f8f3] transition-colors`. Hover uses
 * brand-green-tint to signal clickability via the brand color (D-F).
 * Whole card is a Link to `/careers/[slug]`.
 */
export function JobPostingCard({ job, locale }: { job: Job; locale: Locale }) {
  const title = jobTitle(job, locale);
  const teaser = jobDescription(job, locale);
  const employmentLabel = employmentTypeLabel(job.employmentType, locale);
  const salaryLabel = formatSalary(job.baseSalary, locale);
  const locationLabel = job.location.displayName ?? `${job.location.city}, ${job.location.state}`;
  const applyLabel = locale === "es" ? "Aplicar →" : "Apply →";

  return (
    <Link
      href={`/careers/${job.slug}` as `/careers/${string}`}
      className="block rounded-2xl border border-border-subtle bg-bg-surface p-5 hover:border-brand-green hover:bg-brand-green-tint-bg transition-colors duration-150 group"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[20px] font-bold text-text-primary leading-tight">
          {title}
        </h3>
        <span className="shrink-0 inline-flex items-center rounded-md bg-admin-blue-pill-bg border border-admin-blue-pill-border text-admin-blue px-2 py-1 text-xs font-bold">
          {job.station}
        </span>
      </div>

      <p className="mt-2 text-[14px] text-text-secondary leading-relaxed">
        {teaser}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Pill>{employmentLabel}</Pill>
          <Pill>{locationLabel}</Pill>
          {salaryLabel && <Pill>{salaryLabel}</Pill>}
        </div>
        <span className="text-[14px] font-semibold text-brand-green group-hover:text-brand-green-dark">
          {applyLabel}
        </span>
      </div>
    </Link>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-bg-subtle border border-border-emphasized text-text-secondary px-2 py-1 text-xs font-bold">
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

function formatSalary(
  s: Job["baseSalary"],
  locale: Locale,
): string | null {
  if (!s?.minValue) return null;
  const unit = unitLabel(s.unitText, locale);
  const min = formatMoney(s.minValue, s.currency, locale);
  if (s.maxValue !== undefined) {
    const max = formatMoney(s.maxValue, s.currency, locale);
    return `${min}–${max} ${unit}`;
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

function unitLabel(
  u: Job["baseSalary"]["unitText"],
  locale: Locale,
): string {
  const map: Record<Job["baseSalary"]["unitText"], { en: string; es: string }> = {
    HOUR: { en: "/ hour", es: "/ hora" },
    DAY: { en: "/ day", es: "/ día" },
    WEEK: { en: "/ week", es: "/ semana" },
    MONTH: { en: "/ month", es: "/ mes" },
    YEAR: { en: "/ year", es: "/ año" },
  };
  return map[u][locale];
}
