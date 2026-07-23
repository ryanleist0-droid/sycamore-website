import type { MetadataRoute } from "next";
import { SPANISH_ENABLED } from "@/lib/i18n-config";

const BASE_URL = "https://sycamore-logistics.com";

/**
 * AI *answer-engine* crawlers we explicitly ALLOW. Being cited in ChatGPT
 * Search, Perplexity, and user-initiated ChatGPT browsing is a real
 * discovery channel for job-seekers, so these are permitted. (They already
 * fall under the `*` allow rule; we list them explicitly so a future broad
 * Disallow can't silently shut them out, and to document the intent.)
 */
const AI_SEARCH_BOTS = [
  "OAI-SearchBot", // OpenAI — ChatGPT Search index
  "ChatGPT-User", // OpenAI — user-initiated fetch inside ChatGPT
  "PerplexityBot", // Perplexity — answer-engine index
] as const;

/**
 * Pure AI *training* / dataset crawlers we disallow. Standard search-engine
 * crawlers (Googlebot, Bingbot, DuckDuckBot, etc.) fall through to the `*`
 * allow rule below. Note: Anthropic's ClaudeBot and Google-Extended are
 * crawl-for-model bots, not search bots — Claude and Gemini answers draw on
 * third-party search indexes, so blocking these does not remove Sycamore
 * from those assistants' live answers.
 */
const AI_TRAINING_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "FacebookBot",
  "CCBot",
  "Bytespider",
  "Omgilibot",
  "Omgili",
  "Diffbot",
  "cohere-ai",
  "ImagesiftBot",
] as const;

// Spanish-locale gate — tied to SPANISH_ENABLED (src/lib/i18n-config.ts), the
// single source of truth also used by the sitemap, hreflang, and LocaleSwitcher.
// While Spanish is disabled, `/es/` is Disallowed so Google doesn't index
// stub pages (the routes stay reachable). Flipping SPANISH_ENABLED to true
// removes the disallow here automatically — no manual edit to this file.
const esDisallow = SPANISH_ENABLED ? {} : { disallow: "/es/" };

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "Googlebot", allow: "/", ...esDisallow },
      ...AI_SEARCH_BOTS.map((userAgent) => ({ userAgent, allow: "/", ...esDisallow })),
      { userAgent: "*", allow: "/", ...esDisallow },
      ...AI_TRAINING_BOTS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
