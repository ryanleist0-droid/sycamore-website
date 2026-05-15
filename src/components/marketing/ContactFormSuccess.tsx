import { useTranslations } from "next-intl";

/**
 * ContactFormSuccess — design strawman §3.10 success state.
 *
 * Replaces the form in-place once the Allium endpoint accepts a submission.
 * Pure presentational; no callbacks. The form clearing itself away is enough
 * confirmation that the message was received — no "send another" affordance
 * in v1 (deliberate: the page already has the contact email below for power
 * users who want to follow up).
 */
export function ContactFormSuccess() {
  const t = useTranslations("contact.success");

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 rounded-2xl border border-brand-green-tint-border bg-brand-green-tint-bg p-6 md:p-8"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-green text-white"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
          >
            <path
              d="M4 10.5l3.5 3.5L16 5.5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <h3 className="text-[18px] md:text-[20px] font-extrabold text-text-primary leading-tight">
            {t("title")}
          </h3>
          <p className="mt-2 text-[14px] md:text-[15px] text-text-secondary leading-relaxed">
            {t("body")}
          </p>
        </div>
      </div>
    </div>
  );
}
