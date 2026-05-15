import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { setRequestLocale } from "next-intl/server";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { StatBlock } from "@/components/marketing/StatBlock";
import { PhotoPlaceholder } from "@/components/marketing/PhotoPlaceholder";
import { InlineImage } from "@/components/marketing/InlineImage";
import { loadMarketingPage } from "@/lib/pages";
import type { Locale } from "@/lib/jobs";

type Params = { locale: string };
type MarketingRoute = "/services" | "/about" | "/careers" | "/contact";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "es" ? "es" : "en";
  const page = await loadMarketingPage(locale, "home");
  return {
    title: page?.frontmatter.title ?? "Sycamore Logistics",
    description: page?.frontmatter.description,
    alternates: {
      canonical: `/${locale}`,
      languages: { en: "/en", es: "/es", "x-default": "/en" },
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "es" ? "es" : "en";
  setRequestLocale(localeParam);

  const page = await loadMarketingPage(locale, "home");
  if (!page) notFound();

  const hero = page.frontmatter.hero;
  const stats = page.frontmatter.stats ?? [];

  return (
    <>
      {hero && (
        <MarketingHero
          variant="home"
          title={hero.headline}
          subtitle={hero.subtitle}
          ctaPrimary={
            hero.primaryCta
              ? { label: hero.primaryCta.label, href: hero.primaryCta.href as MarketingRoute }
              : undefined
          }
          ctaSecondary={
            hero.secondaryCta
              ? { label: hero.secondaryCta.label, href: hero.secondaryCta.href as MarketingRoute }
              : undefined
          }
          right={
            hero.image ? (
              <div className="relative w-full aspect-[4/3] rounded-[14px] overflow-hidden">
                <Image
                  src={hero.image}
                  alt={hero.imageAlt ?? ""}
                  fill
                  priority
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <PhotoPlaceholder />
            )
          }
        />
      )}

      <section className="marketing-container pb-12 md:pb-16">
        <article className="mdx-prose max-w-[720px]">
          <MDXRemote source={page.body} components={{ InlineImage }} />
        </article>
      </section>

      {stats.length > 0 && <StatBlock stats={stats} />}
    </>
  );
}
