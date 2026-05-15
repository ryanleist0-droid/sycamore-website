import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { setRequestLocale } from "next-intl/server";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { PhotoGallery } from "@/components/marketing/PhotoGallery";
import { InlineImage } from "@/components/marketing/InlineImage";
import { loadMarketingPage } from "@/lib/pages";
import { localeAlternates } from "@/lib/locale-alternates";
import type { Locale } from "@/lib/jobs";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "es" ? "es" : "en";
  const page = await loadMarketingPage(locale, "community");
  return {
    title: page?.frontmatter.title ?? (locale === "es" ? "Comunidad" : "Community"),
    description: page?.frontmatter.description,
    alternates: {
      canonical: `/${locale}/community`,
      languages: localeAlternates("/community"),
    },
  };
}

export default async function CommunityPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "es" ? "es" : "en";
  setRequestLocale(localeParam);

  const page = await loadMarketingPage(locale, "community");
  if (!page) notFound();

  const hero = page.frontmatter.hero;

  return (
    <>
      {hero ? (
        <MarketingHero
          variant="inner"
          eyebrow={locale === "es" ? "COMUNIDAD" : "COMMUNITY"}
          title={hero.headline}
          subtitle={hero.subtitle}
          image={hero.image}
          imageAlt={hero.imageAlt}
        />
      ) : null}
      <section className="marketing-container pb-20">
        <article className="mdx-prose max-w-[720px]">
          <MDXRemote
            source={page.body}
            components={{
              PhotoGallery,
              InlineImage,
            }}
          />
        </article>
      </section>
    </>
  );
}
