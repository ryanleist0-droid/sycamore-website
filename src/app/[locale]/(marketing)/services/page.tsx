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
    title: locale === "es" ? "Servicios" : "Services",
    alternates: {
      canonical: `/${locale}/services`,
      languages: { en: "/en/services", es: "/es/services", "x-default": "/en/services" },
    },
  };
}

export default async function ServicesPage({
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
        eyebrow={locale === "es" ? "SERVICIOS" : "SERVICES"}
        title={locale === "es" ? "Lo que hacemos" : "What we do"}
      />
      <section className="marketing-container pb-20">
        <p className="text-[14px] text-text-secondary max-w-[720px]">
          {locale === "es"
            ? "Contenido pendiente — D2 publica la cuadrícula de servicios y el bloque de imagen + texto del alcance operacional."
            : "Content pending — D2 publishes the service grid and operational-footprint image-text block."}
        </p>
      </section>
    </>
  );
}
