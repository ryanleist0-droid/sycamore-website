/**
 * JSON-LD generators. Organization schema is rendered once at the root
 * locale layout; JobPosting schema is rendered per-role page.
 */

import type { Job, Locale } from "./jobs";
import { jobDescription, jobTitle } from "./jobs";

const ORIGIN = "https://sycamore-logistics.com";

// Type is Organization, NOT LocalBusiness, and we publish NO street address.
// Sycamore is colocated inside an Amazon delivery station — there is no
// independent, customer-facing storefront and no verified Google Business
// Profile. A LocalBusiness + PostalAddress makes a physical-location claim
// Google can't corroborate (and the station street address belongs to Amazon),
// which is a worse trust signal than omitting it. The hiring-discovery play is
// Google for Jobs via per-role JobPosting (see buildJobPostingJsonLd), which
// needs no GBP. Upgrade to LocalBusiness + exact NAP once a GBP is verified.
export const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${ORIGIN}/#organization`,
  name: "Sycamore Logistics",
  legalName: "Sycamore Logistics LLC",
  url: ORIGIN,
  logo: `${ORIGIN}/images/sycamore_logo_horizontal_color.png`,
  image: `${ORIGIN}/og/og-default.jpg`,
  description:
    "Small, local, veteran-owned Amazon Delivery Service Partner based in the " +
    "Hagerstown, MD area, serving Maryland, West Virginia, Virginia, and Pennsylvania.",
  telephone: "+1-240-707-1802",
  foundingDate: "2020",
  // Locality only (no street / ZIP) — matches the site copy's "Hagerstown, MD
  // area" and gives geographic context without an unverifiable storefront claim.
  address: {
    "@type": "PostalAddress",
    addressLocality: "Hagerstown",
    addressRegion: "MD",
    addressCountry: "US",
  },
  areaServed: [
    { "@type": "State", name: "Maryland" },
    { "@type": "State", name: "West Virginia" },
    { "@type": "State", name: "Virginia" },
    { "@type": "State", name: "Pennsylvania" },
  ],
  numberOfEmployees: { "@type": "QuantitativeValue", minValue: 100 },
  sameAs: ["https://www.facebook.com/sycamorelogistics/"],
  // No public inbox — inquiries route through the on-site contact form.
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    telephone: "+1-240-707-1802",
    url: `${ORIGIN}/en/contact`,
    areaServed: "US",
    availableLanguage: ["en"],
  },
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
