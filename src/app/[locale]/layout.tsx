import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { MarketingHeader } from "@/components/chrome/MarketingHeader";
import { MarketingFooter } from "@/components/chrome/MarketingFooter";
import { ORGANIZATION_JSON_LD } from "@/lib/schema";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Locale-aware layout. Validates the `[locale]` URL segment and wires the
 * MarketingHeader + MarketingFooter chrome. Renders the Organization JSON-LD
 * once at the locale-layout level so every marketing page inherits it.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <NextIntlClientProvider>
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
      />
    </NextIntlClientProvider>
  );
}
