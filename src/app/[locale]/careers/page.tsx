import type { Metadata } from "next";
import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import { setRequestLocale } from "next-intl/server";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { InlineImage } from "@/components/marketing/InlineImage";
import { JobPostingsList } from "@/components/careers/JobPostingsList";
import { localeAlternates } from "@/lib/locale-alternates";
import type { Locale } from "@/lib/jobs";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "es" ? "Trabaja con nosotros" : "Careers",
    description:
      locale === "es"
        ? "Únete a un Socio de Servicio de Entrega de Amazon con seis años en operación en Hagerstown, MD."
        : "Join a six-year-old Amazon Delivery Service Partner based in Hagerstown, MD.",
    alternates: {
      canonical: `/${locale}/careers`,
      languages: localeAlternates("/careers"),
    },
  };
}

async function loadCareersMdx(locale: Locale): Promise<{
  frontmatter: { title: string; description?: string };
  body: string;
} | null> {
  const candidates = [locale, "en"] as const;
  for (const loc of candidates) {
    const filepath = path.join(process.cwd(), "content", "pages", loc, "careers.mdx");
    try {
      const raw = await fs.readFile(filepath, "utf8");
      const parsed = matter(raw);
      return {
        frontmatter: parsed.data as { title: string; description?: string },
        body: parsed.content,
      };
    } catch {
      continue;
    }
  }
  return null;
}

export default async function CareersIndexPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "es" ? "es" : "en";
  setRequestLocale(localeParam);

  const page = await loadCareersMdx(locale);
  if (!page) notFound();

  return (
    <>
      <MarketingHero
        variant="inner"
        eyebrow={locale === "es" ? "TRABAJA CON NOSOTROS" : "CAREERS"}
        title={page.frontmatter.title}
        subtitle={page.frontmatter.description}
        image="/images/sycamore_operations_004.jpg"
        imageAlt={
          locale === "es"
            ? "Equipo de Sycamore Logistics durante la jornada"
            : "Sycamore Logistics driver at work during the day"
        }
      />

      <section className="marketing-container pb-20">
        <article className="mdx-prose max-w-[720px]">
          <MDXRemote
            source={page.body}
            components={{
              JobPostingsList: () => <JobPostingsList locale={locale} />,
              InlineImage,
            }}
          />
        </article>
      </section>
    </>
  );
}
