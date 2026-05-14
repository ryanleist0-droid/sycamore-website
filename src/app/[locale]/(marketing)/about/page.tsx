import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { MarketingHero } from "@/components/marketing/MarketingHero";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "es" ? "Nosotros" : "About",
    alternates: {
      canonical: `/${locale}/about`,
      languages: { en: "/en/about", es: "/es/about", "x-default": "/en/about" },
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <MarketingHero
        variant="inner"
        eyebrow={locale === "es" ? "NOSOTROS" : "ABOUT"}
        title={locale === "es" ? "Sycamore Logistics" : "Sycamore Logistics"}
      />
      <section className="marketing-container pb-20">
        <p className="text-[14px] text-text-secondary max-w-[720px]">
          {locale === "es"
            ? "Contenido pendiente — el D2 publica la narrativa de origen, fotografía e historia operativa."
            : "Content pending — D2 publishes the origin narrative, photography, and operational story."}
        </p>
      </section>
    </>
  );
}
