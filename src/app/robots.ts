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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "Googlebot", allow: "/" },
      { userAgent: "*", allow: "/" },
      ...AI_TRAINING_BOTS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
