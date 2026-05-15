import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";

/**
 * Marketing top chrome — addendum §4.1.
 * Visitor-facing, product-led. Distinct from operational TopBar.
 */
export function MarketingHeader() {
  const t = useTranslations("nav");
  const items: { href: "/services" | "/about" | "/careers" | "/contact"; label: string }[] = [
    { href: "/services", label: t("services") },
    { href: "/about", label: t("about") },
    { href: "/careers", label: t("careers") },
    { href: "/contact", label: t("contact") },
  ];

  return (
    <header className="sticky top-0 z-40 h-[72px] border-b border-border-subtle bg-bg-surface backdrop-blur supports-[backdrop-filter]:bg-bg-surface/95">
      <div className="marketing-container h-full flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center group" aria-label="Sycamore Logistics — Home">
          <Image
            src="/images/logo-sycamore-horizontal.png"
            alt="Sycamore Logistics"
            width={612}
            height={190}
            priority
            className="h-9 w-auto md:h-10"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className="text-[14px] font-semibold text-text-secondary hover:text-brand-green transition-colors"
            >
              {i.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          {/* Hamburger / Sheet menu will be added when mobile breakpoint
              gets its first piece of nav content. For D1 the desktop nav
              is hidden on mobile and the locale switcher is the only
              affordance — sufficient until D2. */}
        </div>
      </div>
    </header>
  );
}
