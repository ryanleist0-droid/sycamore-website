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
  // Social share defaults. Per-page title/description flow into og:/twitter:
  // automatically; the image + site chrome below apply site-wide. Relative
  // image paths resolve against metadataBase.
  openGraph: {
    type: "website",
    siteName: "Sycamore Logistics",
    locale: "en_US",
    url: "/",
    images: [
      {
        url: "/og/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "A Sycamore Logistics delivery associate in an Amazon Prime van",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og/og-default.jpg"],
  },
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
