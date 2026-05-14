/**
 * JSON-LD generators. Organization schema is rendered once at the root
 * locale layout; JobPosting schema is rendered per-role in D3.
 *
 * Phase 1A: shape locked, content fields will be populated by Ryan
 * during D2 / D3 content drafting.
 */
export const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Sycamore Logistics",
  url: "https://sycamore-logistics.com",
  // Logo/sameAs/contactPoint/address all land in D2 when the
  // proof-points + tagline conversation completes.
};
