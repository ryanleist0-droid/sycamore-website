import type { MetadataRoute } from "next";
import { getAllJobs } from "@/lib/jobs";
import { routing } from "@/i18n/routing";
import { SPANISH_ENABLED } from "@/lib/i18n-config";

const BASE_URL = "https://sycamore-logistics.com";

/**
 * Spanish-locale gate (2026-05-15) — see
 * src/components/chrome/LocaleSwitcher.tsx for the full reversal procedure.
 * With SPANISH_ENABLED=false the sitemap below only emits `en` entries and
 * the hreflang alternates only advertise `en` + `x-default` (both → en).
 * Flipping SPANISH_ENABLED back to true automatically restores both shapes.
 */
const VISIBLE_LOCALES = routing.locales.filter(
  (l) => SPANISH_ENABLED || l !== "es",
);

/**
 * Build the hreflang `alternates.languages` map for a path that exists in
 * every supported locale. `pathSuffix` is the trailing path *without* the
 * leading locale segment ("", "/careers", "/careers/<slug>").
 */
function languageAlternates(pathSuffix: string): Record<string, string> {
  const alternates: Record<string, string> = {};
  for (const locale of VISIBLE_LOCALES) {
    alternates[locale] = `${BASE_URL}/${locale}${pathSuffix}`;
  }
  alternates["x-default"] = `${BASE_URL}/${routing.defaultLocale}${pathSuffix}`;
  return alternates;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const jobs = await getAllJobs();

  const entries: MetadataRoute.Sitemap = [];

  // Root — next-intl middleware redirects "/" to the default locale, but
  // we list it so the canonical entry-point is discoverable directly.
  entries.push({
    url: `${BASE_URL}/`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 1.0,
    alternates: { languages: languageAlternates("") },
  });

  // Locale home pages.
  for (const locale of VISIBLE_LOCALES) {
    entries.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: { languages: languageAlternates("") },
    });
  }

  // Careers index, both locales.
  for (const locale of VISIBLE_LOCALES) {
    entries.push({
      url: `${BASE_URL}/${locale}/careers`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: { languages: languageAlternates("/careers") },
    });
  }

  // Per-role pages, both locales. lastModified tracks the MDX datePosted
  // so re-postings bump the sitemap signal.
  for (const job of jobs) {
    const suffix = `/careers/${job.slug}`;
    const lastModified = (() => {
      const d = new Date(job.datePosted);
      return Number.isNaN(d.getTime()) ? now : d;
    })();
    for (const locale of VISIBLE_LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}${suffix}`,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: { languages: languageAlternates(suffix) },
      });
    }
  }

  // Stub routes — D2 fills them in. Listed in English only per commission
  // until Spanish copy lands.
  for (const stub of ["about", "services", "community", "contact"]) {
    entries.push({
      url: `${BASE_URL}/en/${stub}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  return entries;
}
