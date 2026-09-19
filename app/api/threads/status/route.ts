import { NextResponse } from "next/server";
import { getThreadsProfile } from "@/lib/social/threads";

export const runtime = "nodejs";

export async function GET() {
  const configured = Boolean(process.env.THREADS_ACCESS_TOKEN);

  if (!configured) {
    return NextResponse.json(
      { ok: false, configured: false, error: "THREADS_ACCESS_TOKEN_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  try {
    const profile = await getThreadsProfile();
    return NextResponse.json({ ok: true, configured: true, profile });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        error: error instanceof Error ? error.message : "THREADS_STATUS_FAILED",
      },
      { status: 502 }
    );
  }
}
