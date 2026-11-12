/**
 * Job openings, read live from Allium (the hiring platform Sycamore runs its
 * applicants on). Openings are created, published and closed in Allium
 * (Applicants → Openings); this site lists whatever is open there.
 *
 * Freshness: every fetch is cached by Next for REVALIDATE_SECONDS, then
 * re-fetched in the background (ISR). A new opening appears and a closed one
 * disappears within about five minutes, with no sync job and no deploy. If the
 * feed is unreachable the fetch throws, so Next keeps serving the last good
 * page instead of an empty one (and a build fails instead of publishing none).
 *
 * Replaces the Fountain → content/jobs/*.mdx sync (retired 2026-11-12).
 */

export type Locale = "en" | "es";

export const REVALIDATE_SECONDS = 300;

const FEED_URL = (
  process.env.ALLIUM_JOBS_FEED_URL || "https://app.alliumproject.com/api/jobs"
).replace(/\/+$/, "");
const APP_ORIGIN = new URL(FEED_URL).origin;

export type JobLocation = {
  city: string;
  state: string;
  postalCode: string;
  country: string;
  displayName?: string;
  streetAddress?: string;
};

export type JobSalary = {
  minValue: number;
  maxValue?: number;
  currency: string;
  unitText: "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR";
};

export type JobLocaleOverride = {
  title?: string;
  description?: string;
  body?: string;
};

export type Job = {
  slug: string;
  title: string;
  station: string;
  location: JobLocation;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACTOR" | "TEMPORARY" | "INTERN" | "OTHER";
  datePosted: string;
  validThrough: string;
  /** Absent when the building's pay isn't published in Allium. */
  baseSalary?: JobSalary;
  /** Short teaser for cards and the page header. */
  description: string;
  /** The full description, plain text with blank-line paragraph breaks. */
  body: string;
  /** Pay and schedule lines from the building's approved job facts (English). */
  facts: string[];
  /** The Allium application for this building and opening. */
  applyUrl: string;
  /** Full description as HTML, for the JobPosting JSON-LD (Google for Jobs). */
  descriptionHtml: string;
  locales?: Partial<Record<Locale, JobLocaleOverride>>;
};

// ── the feed ────────────────────────────────────────────────────────────────

type FeedOpening = {
  slug: string;
  title: string;
  title_es: string | null;
  summary: string | null;
  summary_es: string | null;
  description: string | null;
  description_es: string | null;
  employment_type: string;
  station: { code: string; name: string; address: string | null };
  facts: { topic: string; text: string }[];
  pay?: { amount: number; currency: string; unit: string } | null;
  posted_at: string | null;
  apply_path: string;
  apply_url?: string;
};

async function feed<T>(path: string): Promise<T | null> {
  const res = await fetch(`${FEED_URL}${path}`, {
    next: { revalidate: REVALIDATE_SECONDS, tags: ["jobs"] },
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`jobs feed ${path || "/"} answered ${res.status}`);
  return (await res.json()) as T;
}

export async function getAllJobs(): Promise<Job[]> {
  const data = await feed<{ openings: FeedOpening[] }>("");
  const jobs = (data?.openings ?? []).map(toJob);
  jobs.sort((a, b) => {
    const cmp = b.datePosted.localeCompare(a.datePosted);
    return cmp !== 0 ? cmp : a.slug.localeCompare(b.slug);
  });
  return jobs;
}

export async function getJobBySlug(slug: string): Promise<Job | null> {
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug)) return null;
  const data = await feed<{ opening: FeedOpening }>(`/${slug}`);
  return data?.opening ? toJob(data.opening) : null;
}

// ── mapping ─────────────────────────────────────────────────────────────────

const EMPLOYMENT: Record<string, Job["employmentType"]> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  seasonal: "TEMPORARY",
  temporary: "TEMPORARY",
};

const UNITS = new Set(["HOUR", "DAY", "WEEK", "MONTH", "YEAR"]);

/** "16604 Industrial Lane, Williamsport, MD 21795" → its parts. */
export function parseAddress(address: string | null, fallbackCity: string): JobLocation {
  const m = (address ?? "").match(/^(.*?),\s*([^,]+?),\s*([A-Z]{2})\s+(\d{5})(?:-\d{4})?\s*$/);
  if (m) {
    return {
      streetAddress: m[1].trim(),
      city: m[2].trim(),
      state: m[3],
      postalCode: m[4],
      country: "US",
      displayName: `${m[2].trim()}, ${m[3]}`,
    };
  }
  return { city: fallbackCity, state: "", postalCode: "", country: "US", displayName: fallbackCity };
}

function paragraphs(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

function toJob(o: FeedOpening): Job {
  const posted = o.posted_at ? new Date(o.posted_at) : new Date();
  const datePosted = (Number.isNaN(posted.getTime()) ? new Date() : posted).toISOString().slice(0, 10);
  const facts = (o.facts ?? []).map((f) => f.text).filter(Boolean);
  const body = (o.description ?? "").trim();
  const teaser = o.summary?.trim() || paragraphs(body)[0] || o.title;
  const pay =
    o.pay && typeof o.pay.amount === "number" && UNITS.has(o.pay.unit)
      ? { minValue: o.pay.amount, currency: o.pay.currency || "USD", unitText: o.pay.unit as JobSalary["unitText"] }
      : undefined;
  const html = [
    ...paragraphs(o.summary).map((p) => `<p>${escapeHtml(p)}</p>`),
    ...paragraphs(body).map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`),
    facts.length ? `<ul>${facts.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>` : "",
  ].join("");

  return {
    slug: o.slug,
    title: o.title,
    station: o.station.code,
    location: parseAddress(o.station.address, o.station.name || o.station.code),
    employmentType: EMPLOYMENT[o.employment_type] ?? "OTHER",
    datePosted,
    // The listing is live for as long as Allium lists it; the page refreshes
    // every few minutes, so a rolling 30-day horizon is always in the future.
    validThrough: addDays(new Date(), 30).toISOString().slice(0, 10),
    baseSalary: pay,
    description: teaser,
    body,
    facts,
    applyUrl: o.apply_url || `${APP_ORIGIN}${o.apply_path}`,
    descriptionHtml: html || escapeHtml(teaser),
    locales: {
      es: {
        title: o.title_es || undefined,
        description: o.summary_es || undefined,
        body: o.description_es || undefined,
      },
    },
  };
}

// ── locale helpers ──────────────────────────────────────────────────────────

/** Locale-aware title — falls back to the canonical English title. */
export function jobTitle(job: Job, locale: Locale): string {
  return job.locales?.[locale]?.title ?? job.title;
}

export function jobDescription(job: Job, locale: Locale): string {
  return job.locales?.[locale]?.description ?? job.description;
}

export function jobBody(job: Job, locale: Locale): string {
  return job.locales?.[locale]?.body ?? job.body;
}

export function jobParagraphs(job: Job, locale: Locale): string[] {
  return paragraphs(jobBody(job, locale));
}

/** The application link, opening the form in the page's language. */
export function jobApplyUrl(job: Job, locale: Locale): string {
  return locale === "es" ? `${job.applyUrl}&lang=es` : job.applyUrl;
}
