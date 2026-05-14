import { defineRouting } from "next-intl/routing";

/**
 * Locale routing config for the marketing site.
 * Phase 1A locales: en (default) + es. URLs always include the locale prefix.
 */
export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
  localePrefix: "always",
});
