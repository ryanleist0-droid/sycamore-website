"use client";

import { useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useLocale, useTranslations } from "next-intl";
import { ContactFormSuccess } from "./ContactFormSuccess";

/**
 * Real contact form — Phase 1A D5.
 *
 * Posts to the Allium contact-intake endpoint shipped in Phase 1B-a. Validates
 * client-side, renders the Cloudflare Turnstile widget, and maps server
 * responses to user-facing messages per the design strawman §3.10 error matrix.
 *
 * The endpoint URL is hardcoded — the production Allium origin is the only
 * destination this form ever talks to, and it's not configurable per
 * environment (preview deploys hit the same endpoint per the marketing-origin
 * CORS allowlist on the Flask side).
 */

const CONTACT_ENDPOINT = "https://allium.sycamore-logistics.com/api/contact/submit";
const CATEGORY_VALUES = ["sales", "careers", "press", "other"] as const;
type Category = (typeof CATEGORY_VALUES)[number];

// Minimal RFC 5322 shape check — must match the server-side regex closely
// enough to avoid 400s on payloads that passed client validation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 5000;

type FieldErrors = Partial<{
  name: string;
  email: string;
  phone: string;
  category: string;
  message: string;
}>;

type FormBanner =
  | { kind: "turnstile_failed" }
  | { kind: "turnstile_missing" }
  | { kind: "rate_limited" }
  | { kind: "network" }
  | { kind: "server_error" }
  | { kind: "site_key_missing" }
  | null;

export function ContactForm() {
  const tErr = useTranslations("contact.errors");
  const tLabel = useTranslations("contact.labels");
  const tPlace = useTranslations("contact.placeholders");
  const tCat = useTranslations("contact.categories");
  const locale = useLocale();

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<FormBanner>(
    siteKey ? null : { kind: "site_key_missing" },
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!name.trim()) errs.name = tErr("required");
    if (!email.trim()) errs.email = tErr("required");
    else if (!EMAIL_RE.test(email.trim())) errs.email = tErr("emailInvalid");
    if (!category) errs.category = tErr("categoryRequired");
    const msg = message.trim();
    if (!msg) errs.message = tErr("required");
    else if (msg.length < MESSAGE_MIN) errs.message = tErr("messageTooShort");
    else if (msg.length > MESSAGE_MAX) errs.message = tErr("messageTooLong");
    return errs;
  }

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      // Surface the first invalid field — improves keyboard UX over scrolling
      // to the top banner alone.
      const firstField = ["name", "email", "category", "message"].find(
        (f) => (errs as Record<string, string | undefined>)[f],
      );
      if (firstField) {
        const el = document.getElementById(`contact-${firstField}`);
        el?.focus();
      }
      return;
    }

    if (!turnstileToken) {
      setBanner({ kind: "turnstile_missing" });
      return;
    }

    setBanner(null);
    setSubmitting(true);

    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      category,
      message: message.trim(),
      turnstileToken,
    };

    let res: Response;
    try {
      res = await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      setBanner({ kind: "network" });
      setSubmitting(false);
      return;
    }

    if (res.status === 200) {
      setSubmitted(true);
      setSubmitting(false);
      return;
    }

    // Reset the Turnstile widget on any failure so a retry doesn't reuse
    // the spent token (Cloudflare rejects duplicates with
    // timeout-or-duplicate, which would lock the user into a loop).
    turnstileRef.current?.reset();
    setTurnstileToken(null);

    if (res.status === 400) {
      // Map server-side details[] back to field errors.
      try {
        const body = (await res.json()) as {
          details?: Array<{ field?: string; error?: string }>;
        };
        const mapped: FieldErrors = {};
        for (const d of body.details ?? []) {
          if (!d.field) continue;
          if (d.field in payload) {
            mapped[d.field as keyof FieldErrors] = tErr("serverError");
          }
        }
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped);
        } else {
          setBanner({ kind: "server_error" });
        }
      } catch {
        setBanner({ kind: "server_error" });
      }
    } else if (res.status === 429) {
      setBanner({ kind: "rate_limited" });
    } else if (res.status === 502) {
      setBanner({ kind: "turnstile_failed" });
    } else {
      setBanner({ kind: "server_error" });
    }

    setSubmitting(false);
  }

  if (submitted) {
    return <ContactFormSuccess />;
  }

  if (!siteKey) {
    return (
      <div
        role="alert"
        className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-6"
      >
        <p className="text-[14px] text-text-primary font-semibold">
          {tErr("siteKeyMissing")}
        </p>
      </div>
    );
  }

  const bannerMessage = (() => {
    if (!banner) return null;
    switch (banner.kind) {
      case "turnstile_missing":
        return tErr("turnstileMissing");
      case "turnstile_failed":
        return tErr("turnstileFailed");
      case "rate_limited":
        return tErr("rateLimited");
      case "network":
        return tErr("network");
      case "server_error":
        return tErr("serverError");
      case "site_key_missing":
        return tErr("siteKeyMissing");
    }
  })();

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="mt-6 rounded-2xl border border-border-subtle bg-bg-surface p-6 md:p-8 space-y-5"
    >
      {bannerMessage && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-[14px] text-text-primary"
        >
          {bannerMessage}
        </div>
      )}

      <Field
        id="contact-name"
        label={tLabel("name")}
        error={fieldErrors.name}
        required
      >
        <input
          id="contact-name"
          type="text"
          autoComplete="name"
          required
          maxLength={255}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearFieldError("name");
          }}
          placeholder={tPlace("name")}
          className={inputClass(fieldErrors.name)}
        />
      </Field>

      <Field
        id="contact-email"
        label={tLabel("email")}
        error={fieldErrors.email}
        required
      >
        <input
          id="contact-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={255}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearFieldError("email");
          }}
          placeholder={tPlace("email")}
          className={inputClass(fieldErrors.email)}
        />
      </Field>

      <Field
        id="contact-phone"
        label={tLabel("phone")}
        error={fieldErrors.phone}
      >
        <input
          id="contact-phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          maxLength={50}
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            clearFieldError("phone");
          }}
          placeholder={tPlace("phone")}
          className={inputClass(fieldErrors.phone)}
        />
      </Field>

      <Field
        id="contact-category"
        label={tLabel("category")}
        error={fieldErrors.category}
        required
      >
        <select
          id="contact-category"
          required
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as Category);
            clearFieldError("category");
          }}
          className={inputClass(fieldErrors.category)}
        >
          <option value="" disabled>
            {tPlace("categoryPrompt")}
          </option>
          {CATEGORY_VALUES.map((c) => (
            <option key={c} value={c}>
              {tCat(c)}
            </option>
          ))}
        </select>
      </Field>

      <Field
        id="contact-message"
        label={tLabel("message")}
        error={fieldErrors.message}
        required
      >
        <textarea
          id="contact-message"
          required
          rows={5}
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            clearFieldError("message");
          }}
          placeholder={tPlace("message")}
          className={inputClass(fieldErrors.message)}
        />
      </Field>

      <div className="pt-1">
        <Turnstile
          ref={turnstileRef}
          siteKey={siteKey}
          onSuccess={(token) => {
            setTurnstileToken(token);
            if (banner?.kind === "turnstile_missing" || banner?.kind === "turnstile_failed") {
              setBanner(null);
            }
          }}
          onError={() => {
            setTurnstileToken(null);
            setBanner({ kind: "turnstile_failed" });
          }}
          onExpire={() => {
            setTurnstileToken(null);
            turnstileRef.current?.reset();
          }}
          options={{
            theme: "light",
            language: locale === "es" ? "es" : "en",
            appearance: "always",
            size: "flexible",
          }}
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={submitting || !turnstileToken}
          className="px-5 py-2.5 rounded-lg bg-brand-green text-white text-[14px] font-bold transition-colors hover:bg-brand-green-dark disabled:bg-bg-subtle disabled:text-text-tertiary disabled:cursor-not-allowed"
        >
          {submitting ? tLabel("submitting") : tLabel("submit")}
        </button>
      </div>
    </form>
  );
}

function inputClass(error?: string): string {
  return [
    "w-full rounded-lg border bg-bg-page px-3 py-2 text-[14px]",
    "placeholder:text-text-tertiary",
    "focus:outline-none focus:ring-2 focus:ring-brand-green/40 focus:border-brand-green",
    error ? "border-destructive" : "border-border-subtle",
  ].join(" ");
}

function Field({
  id,
  label,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[12px] font-bold text-text-secondary mb-1"
      >
        {label}
        {required ? <span aria-hidden> *</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-[12px] text-destructive font-semibold">{error}</p>
      ) : null}
    </div>
  );
}
