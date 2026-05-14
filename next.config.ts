import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // next-intl ships dev + prod ESM bundles behind conditional exports.
  // Without transpilePackages, Next's RSC bundler intermittently picks the
  // `development` path even on production builds, which then fails the
  // React Client Manifest lookup for client components like `BaseLink`
  // → /en (and every other locale-prefixed route) 404s at runtime even
  // though `next build` reports the prerender succeeded. Transpiling
  // next-intl pins the resolution and re-emits the chunks under our build.
  transpilePackages: ["next-intl"],

  // Marketing site is static-content-heavy; let Next decide caching per page.
  // Images: enable optimization defaults. Real photography lands pre-cutover.
  images: {
    remotePatterns: [],
  },
};

export default withNextIntl(nextConfig);
