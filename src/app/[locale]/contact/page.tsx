import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { setRequestLocale } from "next-intl/server";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { ContactForm } from "@/components/marketing/ContactForm";
import { loadMarketingPage } from "@/lib/pages";
import type { Locale } from "@/lib/jobs";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "es" ? "es" : "en";
  const page = await loadMarketingPage(locale, "contact");
  return {
    title: page?.frontmatter.title ?? (locale === "es" ? "Contacto" : "Contact"),
    description: page?.frontmatter.description,
    alternates: {
      canonical: `/${locale}/contact`,
      languages: {
        en: "/en/contact",
        es: "/es/contact",
        "x-default": "/en/contact",
      },
    },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "es" ? "es" : "en";
  setRequestLocale(localeParam);

  const page = await loadMarketingPage(locale, "contact");
  if (!page) notFound();

  const hero = page.frontmatter.hero;

  return (
    <>
      {hero ? (
        <MarketingHero
          variant="inner"
          eyebrow={locale === "es" ? "CONTACTO" : "CONTACT"}
          title={hero.headline}
          subtitle={hero.subtitle}
        />
      ) : null}
      <section className="marketing-container pb-20">
        <article className="mdx-prose max-w-[720px]">
          <MDXRemote
            source={page.body}
            components={{
              ContactForm: () => <ContactForm />,
            }}
          />
        </article>
      </section>
    </>
  );
}
