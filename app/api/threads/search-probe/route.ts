import { NextResponse } from "next/server";
import { publicThreadsApiError, searchPublicThreads } from "@/lib/social/threads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const raw: any = await searchPublicThreads({
      query: "AI shopping",
      searchType: "RECENT",
      limit: 3,
    });
    return NextResponse.json({
      ok: true,
      result_count: Array.isArray(raw?.data) ? raw.data.length : 0,
    });
  } catch (error) {
    const meta = publicThreadsApiError(error);
    return NextResponse.json(
      meta ? { ok: false, provider: "meta_threads", meta } : { ok: false, error: "THREADS_SEARCH_PROBE_FAILED" },
      { status: 502 }
    );
  }
}
