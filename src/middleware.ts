import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * next-intl middleware. Rewrites `/` to `/en`, validates locale segments,
 * and 404s anything outside the supported locale list.
 *
 * The matcher excludes Next internals + the contact API + static assets so
 * the middleware never accidentally touches those paths.
 */
export default createMiddleware(routing);

export const config = {
  matcher: [
    // Everything except: Next internals, the contact API, static assets.
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
