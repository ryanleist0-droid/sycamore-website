import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sycamore-logistics.com"),
  title: {
    default: "Sycamore Logistics",
    template: "%s · Sycamore Logistics",
  },
  description:
    "Sycamore Logistics — Amazon Delivery Service Partner. Technology focused, community driven.",
};

/**
 * Root layout — minimal shell only. The locale-aware layout (with
 * MarketingHeader + MarketingFooter chrome) lives in src/app/[locale]/layout.tsx
 * so it can read the URL-segment locale via the next-intl middleware.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
