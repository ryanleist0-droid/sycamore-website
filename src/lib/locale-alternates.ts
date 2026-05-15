import { routing } from "@/i18n/routing";
import { SPANISH_ENABLED } from "@/lib/i18n-config";

/**
 * Build the `metadata.alternates.languages` map for a page that exists in
 * every visible locale. `pathSuffix` is the trailing path *without* the
 * leading locale segment ("", "/about", "/careers/dba7-...").
 *
 * Spanish-locale gate (2026-05-15) — see
 * src/components/chrome/LocaleSwitcher.tsx for the full reversal procedure.
 * With SPANISH_ENABLED=false this helper omits the `es` key so English
 * pages stop advertising a Spanish alternate to crawlers. Flipping
 * SPANISH_ENABLED back to true automatically reintroduces it.
 *
 * Paths are relative (Next.js metadata API resolves them against the
 * current host); keeps the local-dev/preview/prod variants free of a
 * hardcoded origin.
 */
export function localeAlternates(
  pathSuffix: string,
): Record<string, string> {
  const visible = routing.locales.filter(
    (l) => SPANISH_ENABLED || l !== "es",
  );

  const alternates: Record<string, string> = {};
  for (const locale of visible) {
    alternates[locale] = `/${locale}${pathSuffix}`;
  }
  alternates["x-default"] = `/${routing.defaultLocale}${pathSuffix}`;
  return alternates;
}
