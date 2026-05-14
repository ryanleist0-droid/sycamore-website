import { cn } from "@/lib/utils";

/**
 * FountainApplyButton — hero-primary green CTA. Opens the role's Fountain
 * application URL in a new tab (`target="_blank" rel="noopener noreferrer"`).
 *
 * Addendum §4.9 specifies the new-tab affordance so the candidate doesn't
 * lose the role description while filling out the application.
 */
export function FountainApplyButton({
  href,
  label = "Apply on Fountain",
  size = "hero",
  className,
}: {
  href: string;
  label?: string;
  size?: "hero" | "inline";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-bold rounded-xl bg-brand-green text-white hover:bg-brand-green-dark transition-colors";
  const sized =
    size === "hero" ? "px-6 py-3 text-base" : "px-4 py-2 text-sm";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(base, sized, className)}
    >
      {label}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
      </svg>
    </a>
  );
}
