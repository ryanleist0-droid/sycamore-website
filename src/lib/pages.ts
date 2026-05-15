import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { Locale } from "./jobs";
import type { Stat } from "@/components/marketing/StatBlock";

/**
 * Marketing-page MDX loader. Reads `content/pages/{locale}/{slug}.mdx`, falls
 * back to English if the locale-specific file is missing (D4 stubs Spanish
 * with minimal content; production Spanish translation lands in a later batch).
 */

export type HeroCta = {
  label: string;
  href: string;
};

export type PageHero = {
  headline: string;
  subtitle?: string;
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
  image?: string;
  imageAlt?: string;
};

export type PageFrontmatter = {
  title: string;
  description?: string;
  hero?: PageHero;
  stats?: Stat[];
};

export type MarketingPage = {
  frontmatter: PageFrontmatter;
  body: string;
};

export async function loadMarketingPage(
  locale: Locale,
  slug: string,
): Promise<MarketingPage | null> {
  for (const loc of [locale, "en"] as const) {
    const filepath = path.join(process.cwd(), "content", "pages", loc, `${slug}.mdx`);
    try {
      const raw = await fs.readFile(filepath, "utf8");
      const parsed = matter(raw);
      return {
        frontmatter: parsed.data as PageFrontmatter,
        body: parsed.content,
      };
    } catch {
      continue;
    }
  }
  return null;
}
