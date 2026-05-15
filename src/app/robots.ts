import type { MetadataRoute } from "next";

const BASE_URL = "https://sycamore-logistics.com";

/**
 * AI-training crawlers we explicitly disallow. Standard search-engine
 * crawlers (Googlebot, Bingbot, DuckDuckBot, etc.) fall through to the
 * `*` allow rule below.
 */
const AI_TRAINING_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "FacebookBot",
  "CCBot",
  "PerplexityBot",
  "Bytespider",
  "Omgilibot",
  "Omgili",
  "Diffbot",
  "cohere-ai",
  "ImagesiftBot",
] as const;

// Spanish-locale gate (2026-05-15) — see src/components/chrome/LocaleSwitcher.tsx
// for the full reversal procedure. Spanish content is stub-only across the
// site; Disallow keeps Google from indexing partial Spanish pages while the
// routes themselves stay reachable. To re-enable Spanish, drop the
// `/es/` disallow entries from both the Googlebot rule and the `*` rule.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "Googlebot", allow: "/", disallow: "/es/" },
      { userAgent: "*", allow: "/", disallow: "/es/" },
      ...AI_TRAINING_BOTS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
