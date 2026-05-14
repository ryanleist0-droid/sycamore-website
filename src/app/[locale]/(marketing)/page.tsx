import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { PhotoPlaceholder } from "@/components/marketing/PhotoPlaceholder";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "es" ? "Sycamore Logistics" : "Sycamore Logistics",
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        es: "/es",
        "x-default": "/en",
      },
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations("home");

  return (
    <>
      <MarketingHero
        variant="home"
        eyebrow={t("tagline")}
        title={t("subtitle")}
        ctaPrimary={{ label: t("ctaPrimary"), href: "/careers" }}
        ctaSecondary={{ label: t("ctaSecondary"), href: "/contact" }}
        right={<PhotoPlaceholder />}
      />

      <section className="marketing-container py-12 md:py-20">
        <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6 md:p-8">
          <h2 className="text-[18px] md:text-[20px] font-bold text-text-primary mb-2">
            D1 scaffold
          </h2>
          <p className="text-[14px] text-text-secondary leading-relaxed">
            {t("scaffoldNotice")}
          </p>
        </div>
      </section>
    </>
  );
}
