import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const error = req.nextUrl.searchParams.get("error");
  const errorDescription = req.nextUrl.searchParams.get("error_description");
  const code = req.nextUrl.searchParams.get("code");

  if (error) {
    const url = new URL("/", req.nextUrl.origin);
    url.searchParams.set("threads", "error");
    url.searchParams.set("reason", errorDescription || error);
    return NextResponse.redirect(url);
  }

  if (!code) {
    return NextResponse.json(
      { ok: false, error: "Missing Threads OAuth authorization code." },
      { status: 400 }
    );
  }

  // Token exchange is enabled once THREADS_APP_ID / THREADS_APP_SECRET are
  // added to the deployment environment. Keeping the callback live now lets
  // Meta validate the redirect URI during app setup.
  const url = new URL("/", req.nextUrl.origin);
  url.searchParams.set("threads", "authorized");
  url.searchParams.set("code_received", "1");
  return NextResponse.redirect(url);
}
