import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { checkGoogleMerchantApi } from "../../../../lib/google-merchant-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorised(req: NextRequest) {
  const expected = process.env.GOOGLE_MERCHANT_DIAGNOSTICS_TOKEN;
  const received = req.headers.get("authorization")?.replace(/^Bearer\\s+/i, "") || "";
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) return new NextResponse(null, { status: 404 });
  try {
    const outcome = await checkGoogleMerchantApi();
    return NextResponse.json({ ...outcome, uploadEnabled: false }, { status: outcome.authenticated ? 200 : 502, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Merchant API connection test failed";
    const safe = /^(GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON is not configured|Service account JSON is malformed|Invalid service account JSON: missing identity or private key|Unexpected service account token endpoint|Google OAuth token exchange failed \\(HTTP \\d+\\)|Google OAuth did not return an access token)$/.test(msg)
      ? msg : "Merchant API connection test failed; inspect secure server logs";
    return NextResponse.json({ authenticated: false, uploadEnabled: false, message: safe }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
