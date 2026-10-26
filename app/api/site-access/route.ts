import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function signature(expires: string, secret: string) {
  return createHmac("sha256", secret).update("ynot-site-access:" + expires).digest("hex");
}

export async function POST(request: NextRequest) {
  const expected = process.env.YNOT_SITE_PASSWORD;
  const secret = process.env.YNOT_SITE_SESSION_SECRET;
  if (!expected || !secret) {
    return NextResponse.json({ error: "ACCESS_NOT_CONFIGURED" }, { status: 503 });
  }

  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  const supplied = typeof body.password === "string" ? body.password : "";
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "INVALID_PASSWORD" }, { status: 401 });
  }

  const expires = String(Date.now() + 12 * 60 * 60 * 1000);
  const token = expires + "." + signature(expires, secret);
  const response = NextResponse.json({ ok: true });
  response.cookies.set("ynot-site-access", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
