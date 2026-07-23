import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

/**
 * Filesystem-backed job loader. Reads `content/jobs/*.mdx`, parses
 * frontmatter via gray-matter, returns typed Job records. The MDX body
 * is rendered separately via next-mdx-remote/rsc.
 *
 * Phase 1A: jobs live in the repo as MDX files. Phase 2 may swap this
 * loader for a Fountain API client without changing the consumer shape.
 */

export type Locale = "en" | "es";

export type JobLocation = {
  city: string;
  state: string;
  postalCode: string;
  country: string;
  displayName?: string;
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
};

export type JobFrontmatter = {
  title: string;
  station: string;
  location: JobLocation;
  employmentType:
    | "FULL_TIME"
    | "PART_TIME"
    | "CONTRACTOR"
    | "TEMPORARY"
    | "INTERN"
    | "OTHER";
  datePosted: string;
  validThrough: string;
  baseSalary: JobSalary;
  description: string;
  fountainApplyUrl: string;
  locales?: Partial<Record<Locale, JobLocaleOverride>>;
  /**
   * Provenance. `"fountain"` = written by scripts/sync_fountain_jobs.py from a
   * live Fountain opening (auto-created, auto-pruned when the opening closes —
   * DO NOT hand-edit; changes are overwritten on the next sync). `"manual"`
   * (default when absent) = hand-authored; the sync never touches or prunes it.
   */
  source?: "fountain" | "manual";
};

export type Job = JobFrontmatter & {
  slug: string;
  body: string;
};

const JOBS_DIR = path.join(process.cwd(), "content", "jobs");

export async function getAllJobs(): Promise<Job[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(JOBS_DIR);
  } catch {
    return [];
  }
  const jobs: Job[] = [];
  for (const name of entries) {
    if (!name.endsWith(".mdx")) continue;
    const slug = name.replace(/\.mdx$/, "");
    const job = await loadJobFile(name, slug);
    if (job) jobs.push(job);
  }
  // Stable order: newest datePosted first, then alphabetical by slug.
  jobs.sort((a, b) => {
    const cmp = b.datePosted.localeCompare(a.datePosted);
    return cmp !== 0 ? cmp : a.slug.localeCompare(b.slug);
  });
  return jobs;
}

export async function getJobBySlug(slug: string): Promise<Job | null> {
  return loadJobFile(`${slug}.mdx`, slug);
}

async function loadJobFile(filename: string, slug: string): Promise<Job | null> {
  const filepath = path.join(JOBS_DIR, filename);
  let raw: string;
  try {
    raw = await fs.readFile(filepath, "utf8");
  } catch {
    return null;
  }
  const parsed = matter(raw);
  const fm = parsed.data as JobFrontmatter;
  // Minimal sanity — required fields. Surface loudly during build rather
  // than silently rendering broken JSON-LD.
  for (const k of [
    "title",
    "station",
    "location",
    "employmentType",
    "datePosted",
    "validThrough",
    "baseSalary",
    "description",
    "fountainApplyUrl",
  ] as const) {
    if (fm[k] === undefined || fm[k] === null || fm[k] === "") {
      throw new Error(`Job ${slug} is missing required frontmatter field: ${k}`);
    }
  }
  return { source: "manual", ...fm, slug, body: parsed.content };
}

/** Locale-aware title — falls back to the canonical English title. */
export function jobTitle(job: Job, locale: Locale): string {
  return job.locales?.[locale]?.title ?? job.title;
}

export function jobDescription(job: Job, locale: Locale): string {
  return job.locales?.[locale]?.description ?? job.description;
}
