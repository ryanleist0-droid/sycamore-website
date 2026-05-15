import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * MarketingHero — addendum §4.3.
 *
 * D1 ships variants A (home) and B (inner page).
 * Variant C (per-role) lives in src/components/careers/JobPostingPage.
 *
 * Hero CTAs use the hero-scale button variants (addendum §4.6) inline below.
 */
type MarketingRoute = "/services" | "/about" | "/careers" | "/contact";

type CTA = {
  label: string;
  href: MarketingRoute;
};

export function MarketingHero({
  variant,
  eyebrow,
  title,
  subtitle,
  ctaPrimary,
  ctaSecondary,
  right,
}: {
  variant: "home" | "inner";
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctaPrimary?: CTA;
  ctaSecondary?: CTA;
  right?: React.ReactNode;
}) {
  if (variant === "home") {
    return (
      <section
        className="marketing-container py-16 md:py-[120px] grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
      >
        <div>
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1 className="mt-4 text-[40px] md:text-[56px] lg:text-[64px] font-extrabold text-text-primary leading-[1.05] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-5 text-[18px] md:text-[20px] font-medium text-text-secondary max-w-[480px]">
              {subtitle}
            </p>
          )}
          {(ctaPrimary || ctaSecondary) && (
            <div className="mt-8 flex flex-wrap gap-3">
              {ctaPrimary && (
                <Link
                  href={ctaPrimary.href}
                  className={cn(
                    "px-6 py-3 text-base font-bold rounded-xl bg-brand-green text-white hover:bg-brand-green-dark transition-colors",
                  )}
                >
                  {ctaPrimary.label}
                </Link>
              )}
              {ctaSecondary && (
                <Link
                  href={ctaSecondary.href}
                  className={cn(
                    "px-6 py-3 text-base font-bold rounded-xl border-2 border-brand-green text-brand-green hover:bg-brand-green-tint-bg transition-colors",
                  )}
                >
                  {ctaSecondary.label}
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="lg:justify-self-end w-full">{right}</div>
      </section>
    );
  }

  // variant === "inner"
  return (
    <section className="marketing-container py-12 md:py-20">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="mt-4 text-[32px] md:text-[40px] lg:text-[48px] font-extrabold text-text-primary leading-[1.1] tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-4 text-[16px] md:text-[18px] text-text-secondary max-w-[720px]">
          {subtitle}
        </p>
      )}
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[12px] uppercase tracking-[1.5px] font-bold text-brand-green">
      {children}
    </span>
  );
}
