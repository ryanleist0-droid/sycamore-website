/**
 * ContactForm placeholder — D5 wires this to the Allium contact-intake
 * endpoint. Until then, the marketing contact MDX embeds `<ContactForm />`
 * and the renderer maps it to this disabled-but-visible panel so the page
 * isn't blank during the Phase 1A → 1B window.
 */
export function ContactFormPlaceholder({ locale }: { locale: "en" | "es" }) {
  const copy = locale === "es"
    ? {
        notice: "Formulario disponible próximamente — D5",
        body:
          "Mientras tanto, puedes escribirnos directamente a info@sycamorelogistics.org.",
        nameLabel: "Tu nombre",
        emailLabel: "Tu correo electrónico",
        messageLabel: "Tu mensaje",
        submit: "Enviar",
      }
    : {
        notice: "Form coming soon — D5",
        body:
          "In the meantime, drop us a line directly at info@sycamorelogistics.org.",
        nameLabel: "Your name",
        emailLabel: "Your email",
        messageLabel: "Your message",
        submit: "Send",
      };

  return (
    <div className="mt-6 rounded-2xl border border-border-subtle bg-bg-surface p-6 md:p-8">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-green-tint-bg border border-brand-green-tint-border px-3 py-1">
        <span className="size-1.5 rounded-full bg-brand-green" aria-hidden />
        <span className="text-[11px] uppercase tracking-[1.25px] font-bold text-brand-green-dark">
          {copy.notice}
        </span>
      </div>
      <p className="text-[14px] text-text-secondary mb-5">{copy.body}</p>

      <form className="space-y-4 opacity-60 pointer-events-none">
        <div>
          <label className="block text-[12px] font-bold text-text-secondary mb-1">
            {copy.nameLabel}
          </label>
          <input
            type="text"
            disabled
            className="w-full rounded-lg border border-border-subtle bg-bg-page px-3 py-2 text-[14px]"
          />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-text-secondary mb-1">
            {copy.emailLabel}
          </label>
          <input
            type="email"
            disabled
            className="w-full rounded-lg border border-border-subtle bg-bg-page px-3 py-2 text-[14px]"
          />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-text-secondary mb-1">
            {copy.messageLabel}
          </label>
          <textarea
            disabled
            rows={4}
            className="w-full rounded-lg border border-border-subtle bg-bg-page px-3 py-2 text-[14px]"
          />
        </div>
        <button
          type="button"
          disabled
          className="px-5 py-2.5 rounded-lg bg-brand-green text-white text-[14px] font-bold"
        >
          {copy.submit}
        </button>
      </form>
    </div>
  );
}
