import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// careers.sycamore-logistics.com is the hiring-funnel subdomain; the generic
// contact form lives only on the main marketing site. Anyone hitting
// /{locale}/contact on the careers host gets a permanent redirect to the
// canonical URL on www., preserving locale + query string + hash fragment.
const CAREERS_CONTACT_RE = /^\/(en|es)\/contact(\/.*)?$/;
const CANONICAL_CONTACT_ORIGIN = "https://www.sycamore-logistics.com";

/**
 * next-intl middleware. Rewrites `/` to `/en`, validates locale segments,
 * and 404s anything outside the supported locale list. We wrap it so the
 * careers-subdomain contact redirect can run first.
 *
 * The matcher excludes Next internals + the contact API + static assets so
 * the middleware never accidentally touches those paths.
 */
export default function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  const { pathname, search, hash } = request.nextUrl;

  if (host.startsWith("careers.") && CAREERS_CONTACT_RE.test(pathname)) {
    const target = new URL(
      `${pathname}${search}${hash}`,
      CANONICAL_CONTACT_ORIGIN,
    );
    return NextResponse.redirect(target, 301);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Everything except: Next internals, the contact API, static assets.
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
