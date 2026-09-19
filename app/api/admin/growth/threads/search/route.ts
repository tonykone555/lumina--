import { NextRequest, NextResponse } from "next/server";
import { requireYnotAdmin, adminErrorStatus } from "@/lib/ynot/admin-server";
import { searchPublicThreads } from "@/lib/social/threads";
import { bestCatalogMatch, buildCatalogReply, relevanceScore } from "@/lib/social/threads-growth";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function GET(req: NextRequest) {
  try {
    await requireYnotAdmin(req);
    const query = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 200);
    if (!query) return NextResponse.json({ error: "Missing q" }, { status: 400 });
    const searchType = req.nextUrl.searchParams.get("type") === "TOP" ? "TOP" : "RECENT";
    const limit = Math.max(1, Math.min(30, Number(req.nextUrl.searchParams.get("limit") || 20)));
    const raw: any = await searchPublicThreads({ query, searchType, limit });
    const posts = Array.isArray(raw?.data) ? raw.data : [];
    const results = posts.map((post: any) => ({
      ...post,
      relevance: relevanceScore(String(post?.text || ""), query),
    })).sort((a: any,b: any)=>b.relevance-a.relevance);
    return NextResponse.json({ query, searchType, results });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "THREADS_SEARCH_FAILED" }, { status: adminErrorStatus(error) });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireYnotAdmin(req);
    const body = await req.json();
    const text = String(body?.text || "").slice(0, 500);
    const country = String(body?.country || "FR").toUpperCase() as any;
    const product = await bestCatalogMatch(text, country);
    return NextResponse.json({
      product,
      suggested_reply: buildCatalogReply(text, product),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "THREADS_ANALYSIS_FAILED" }, { status: adminErrorStatus(error) });
  }
}
