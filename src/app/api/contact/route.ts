import { NextResponse } from "next/server";

/**
 * D5 wires this. D1 stub returns 501 so the endpoint exists in routing but
 * actively signals "not yet implemented" to anyone probing.
 *
 * Phase-1A target shape:
 *   - Validates payload {name, email, phone?, category, message}
 *   - Validates Turnstile token via siteverify (server-only TURNSTILE_SECRET_KEY)
 *   - Logs the submission to Vercel logs (placeholder for Phase 1B Allium intake)
 *   - Returns {ok: true} on success
 */
export async function POST() {
  return NextResponse.json(
    { ok: false, error: "contact_endpoint_not_yet_implemented" },
    { status: 501 },
  );
}
