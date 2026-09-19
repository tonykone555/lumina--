import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";

function confirmationCode(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 24);
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const signedRequest = String(form?.get("signed_request") || "");
  const code = confirmationCode(signedRequest || String(Date.now()));

  // No Threads user data is currently persisted by YNOT, so the deletion
  // request is complete immediately. This response shape gives Meta a stable
  // confirmation reference and status URL.
  return NextResponse.json({
    url: `${req.nextUrl.origin}/api/threads/delete?confirmation_code=${code}`,
    confirmation_code: code,
  });
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    ok: true,
    confirmation_code: req.nextUrl.searchParams.get("confirmation_code"),
    status: "completed",
  });
}
