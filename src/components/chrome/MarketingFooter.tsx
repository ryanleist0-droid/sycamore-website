import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";

/**
 * Marketing footer — addendum §4.2.
 * Background is page-bg (`#f5f6f8`), not white — gives a subtle horizon line
 * off the final content section without using a hard divider.
 */
export function MarketingFooter() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  const year = new Date().getFullYear();

  return (
    <footer className="bg-bg-page border-t border-border-subtle">
      <div className="marketing-container pt-16 pb-8 md:pt-16 md:pb-8 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-brand-green" aria-hidden />
            <span className="text-[18px] font-extrabold text-text-primary tracking-tight">
              Sycamore
            </span>
          </Link>
          <p className="text-[13px] text-text-secondary max-w-[260px]">
            {t("tagline")}
          </p>
        </div>

        <div>
          <h4 className="text-[11px] uppercase tracking-[1.5px] font-bold text-text-tertiary mb-3">
            {t("company")}
          </h4>
          <ul className="space-y-2 text-[14px]">
            <li><Link href="/about" className="text-text-secondary hover:text-brand-green">{nav("about")}</Link></li>
            <li><Link href="/services" className="text-text-secondary hover:text-brand-green">{nav("services")}</Link></li>
            <li><Link href="/careers" className="text-text-secondary hover:text-brand-green">{nav("careers")}</Link></li>
            <li><Link href="/contact" className="text-text-secondary hover:text-brand-green">{nav("contact")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-[11px] uppercase tracking-[1.5px] font-bold text-text-tertiary mb-3">
            {t("resources")}
          </h4>
          <ul className="space-y-2 text-[14px]">
            <li><span className="text-text-tertiary cursor-default">{t("privacy")}</span></li>
            <li><span className="text-text-tertiary cursor-default">{t("terms")}</span></li>
          </ul>
        </div>

        <div>
          <h4 className="text-[11px] uppercase tracking-[1.5px] font-bold text-text-tertiary mb-3">
            {t("languages")}
          </h4>
          <LocaleSwitcher />
        </div>
      </div>

      <div className="marketing-container border-t border-border-emphasized">
        <p className="py-6 text-[12px] text-text-tertiary">
          {t("copyright", { year })}
        </p>
      </div>
    </footer>
  );
}
