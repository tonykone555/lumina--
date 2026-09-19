import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  // YNOT currently stores no Threads user data at this endpoint.
  // Keep the callback live so Meta can notify us when a user deauthorizes.
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "YNOT Threads uninstall callback" });
}
