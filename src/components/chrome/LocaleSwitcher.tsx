"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { SPANISH_ENABLED } from "@/lib/i18n-config";

/**
 * Inline locale switcher — addendum §4.7.
 * Two-state segmented pill mirroring the operational mode-tab treatment.
 * Click swaps locale preserving the current path; locale lives in the URL.
 *
 * Spanish-locale gate lives in `src/lib/i18n-config.ts` — see that file
 * for the full reversal procedure when D4 ships.
 */

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("locale");

  const labels: Record<(typeof routing.locales)[number], string> = {
    en: "EN",
    es: "ES",
  };

  const visibleLocales = routing.locales.filter(
    (l) => SPANISH_ENABLED || l !== "es",
  );

  // With the gate on and only EN visible, the switcher is a single inert
  // pill — render nothing rather than a one-option control that pretends
  // to be a switcher.
  if (visibleLocales.length < 2) return null;

  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-bg-subtle p-1" role="group" aria-label={t("switchAria")}>
      {visibleLocales.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => router.replace(pathname, { locale: l })}
            className={cn(
              "px-3 py-1 text-sm font-bold rounded-lg transition-colors",
              active
                ? "bg-brand-green text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary",
            )}
            aria-pressed={active}
          >
            {labels[l]}
          </button>
        );
      })}
    </div>
  );
}
