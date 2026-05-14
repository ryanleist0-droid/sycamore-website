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
    title: locale === "es" ? "Contacto" : "Contact",
    alternates: {
      canonical: `/${locale}/contact`,
      languages: { en: "/en/contact", es: "/es/contact", "x-default": "/en/contact" },
    },
  };
}

export default async function ContactPage({
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
        eyebrow={locale === "es" ? "CONTACTO" : "CONTACT"}
        title={locale === "es" ? "Hablemos" : "Get in touch"}
      />
      <section className="marketing-container pb-20">
        <p className="text-[14px] text-text-secondary max-w-[720px]">
          {locale === "es"
            ? "Formulario de contacto pendiente — D5 cabla el formulario con validación de Cloudflare Turnstile y POST a /api/contact."
            : "Contact form pending — D5 wires the form with Cloudflare Turnstile validation and POSTs to /api/contact."}
        </p>
      </section>
    </>
  );
}
