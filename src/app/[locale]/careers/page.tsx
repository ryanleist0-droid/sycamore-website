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
    title: locale === "es" ? "Trabaja con nosotros" : "Careers",
    alternates: {
      canonical: `/${locale}/careers`,
      languages: { en: "/en/careers", es: "/es/careers", "x-default": "/en/careers" },
    },
  };
}

export default async function CareersIndexPage({
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
        eyebrow={locale === "es" ? "TRABAJA CON NOSOTROS" : "CAREERS"}
        title={locale === "es" ? "Carreras en Sycamore" : "Careers at Sycamore"}
      />
      <section className="marketing-container pb-20">
        <p className="text-[14px] text-text-secondary max-w-[720px]">
          {locale === "es"
            ? "Vacantes pendientes — D3 publica la cuadrícula de JobPostingCard con la primera función de DBA7 y la validación de schema.org JobPosting."
            : "Roles pending — D3 publishes the JobPostingCard grid with the seed DBA7 role and schema.org JobPosting validation."}
        </p>
      </section>
    </>
  );
}
