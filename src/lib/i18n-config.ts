/**
 * Site-wide i18n configuration shared across the locale switcher, sitemap,
 * robots, and per-page hreflang alternates.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Spanish-locale gate (2026-05-15)
 * ─────────────────────────────────────────────────────────────────────────
 * Spanish content across the site is currently stub-only (translated titles
 * + back-pointers to English). To avoid sending visitors and Googlebot to a
 * half-finished experience, the ES affordance is hidden from the UI and
 * `/es/*` is excluded from robots / sitemap / hreflang signals. Routes still
 * resolve — anyone with a direct `/es/...` link still gets a working page.
 *
 * To re-enable Spanish once D4 ships full translations, reverse these
 * three changes:
 *
 *   1. Flip `SPANISH_ENABLED` to `true` here (locale switcher renders the
 *      ES button again; sitemap re-emits /es/* entries; per-page hreflang
 *      alternates re-add the `es` key).
 *   2. Remove the `Disallow: /es/` rule from `src/app/robots.ts`.
 *   3. Nothing else — the helpers in `src/lib/locale-alternates.ts` and
 *      `src/app/sitemap.ts` both branch on this flag, so step 1 alone
 *      restores hreflang + sitemap behaviour.
 *
 * Lives in a plain `.ts` file (no "use client" directive) so it's safe to
 * import from both server modules (sitemap, page metadata) and the client
 * LocaleSwitcher component without crossing the RSC boundary.
 *
 * `next-intl` routing config and the `es` content files stay untouched
 * across the gate.
 */
export const SPANISH_ENABLED = true;
