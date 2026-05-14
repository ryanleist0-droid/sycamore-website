/**
 * JSON-LD generators. Organization schema is rendered once at the root
 * locale layout; JobPosting schema is rendered per-role page.
 */

import type { Job, Locale } from "./jobs";
import { jobDescription, jobTitle } from "./jobs";

export const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Sycamore Logistics",
  url: "https://sycamore-logistics.com",
  // Logo / sameAs / contactPoint / address all land in D2 alongside the
  // proof-points conversation.
};

/**
 * Build a schema.org JobPosting object from a Job record + URL locale.
 *
 * Field-by-field mapping to https://schema.org/JobPosting :
 *
 *   title             ← jobTitle(job, locale)
 *   description       ← jobDescription(job, locale)
 *   datePosted        ← MDX frontmatter (ISO 8601)
 *   validThrough      ← MDX frontmatter (ISO 8601)
 *   employmentType    ← MDX frontmatter (FULL_TIME etc., enum from schema.org)
 *   hiringOrganization → reuses Organization schema at the locale layout
 *   jobLocation       ← MDX frontmatter (PostalAddress with addressLocality
 *                       / addressRegion / postalCode / addressCountry)
 *   applicantLocationRequirements ← Country "US" (safe default; switch to
 *                       countryCode list when stations expand internationally)
 *   baseSalary        ← MonetaryAmount with QuantitativeValue (minValue,
 *                       optional maxValue, unitText, currency)
 *   directApply       ← true — Fountain is a first-party application form,
 *                       not a job-board redirect; Google for Jobs uses this
 *                       to bias toward direct-apply listings
 *   applicationContact / url → applicationUrl from MDX fountainApplyUrl
 *   identifier        ← PropertyValue with the slug as a stable identifier
 *   inLanguage        ← URL locale
 */
export function buildJobPostingJsonLd(
  job: Job,
  locale: Locale,
  origin = "https://sycamore-logistics.com",
) {
  const title = jobTitle(job, locale);
  const description = jobDescription(job, locale);

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title,
    description,
    datePosted: job.datePosted,
    validThrough: job.validThrough,
    employmentType: job.employmentType,
    hiringOrganization: {
      "@type": "Organization",
      name: ORGANIZATION_JSON_LD.name,
      sameAs: ORGANIZATION_JSON_LD.url,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location.city,
        addressRegion: job.location.state,
        postalCode: job.location.postalCode,
        addressCountry: job.location.country,
      },
    },
    applicantLocationRequirements: {
      "@type": "Country",
      name: job.location.country,
    },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: job.baseSalary.currency,
      value: {
        "@type": "QuantitativeValue",
        minValue: job.baseSalary.minValue,
        ...(job.baseSalary.maxValue !== undefined
          ? { maxValue: job.baseSalary.maxValue }
          : {}),
        unitText: job.baseSalary.unitText,
      },
    },
    directApply: true,
    applicationContact: {
      "@type": "ContactPoint",
      url: job.fountainApplyUrl,
    },
    url: `${origin}/${locale}/careers/${job.slug}`,
    identifier: {
      "@type": "PropertyValue",
      name: "Sycamore Logistics — Job ID",
      value: job.slug,
    },
    inLanguage: locale,
  };
}
