import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { setRequestLocale } from "next-intl/server";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { loadMarketingPage } from "@/lib/pages";
import { localeAlternates } from "@/lib/locale-alternates";
import type { Locale } from "@/lib/jobs";

type Params = { locale: string };

// English-only legal text; the Spanish route falls back to it via loadMarketingPage.
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "es" ? "es" : "en";
  const page = await loadMarketingPage(locale, "legal/sms-privacy");
  return {
    title: page?.frontmatter.title ?? "Text Messaging Privacy Policy",
    description: page?.frontmatter.description,
    alternates: {
      canonical: `/${locale}/legal/sms-privacy`,
      languages: localeAlternates("/legal/sms-privacy"),
    },
  };
}

export default async function SmsPrivacyPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "es" ? "es" : "en";
  setRequestLocale(localeParam);

  const page = await loadMarketingPage(locale, "legal/sms-privacy");
  if (!page) notFound();

  return (
    <>
      <MarketingHero
        variant="inner"
        eyebrow="LEGAL"
        title={page.frontmatter.title}
      />
      <section className="marketing-container pb-20">
        <article className="mdx-prose max-w-[720px]">
          <MDXRemote source={page.body} />
        </article>
      </section>
    </>
  );
}
