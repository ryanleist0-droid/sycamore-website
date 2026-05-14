import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Marketing site is static-content-heavy; let Next decide caching per page.
  // Images: enable optimization defaults. Real photography lands pre-cutover.
  images: {
    remotePatterns: [],
  },
};

export default withNextIntl(nextConfig);
