import { NextRequest, NextResponse } from "next/server";
import { rakutenConfigured, searchRakutenProducts } from "@/lib/commerce/rakuten";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!rakutenConfigured()) {
    return NextResponse.json({ ok: false, error: "RAKUTEN_ADVERTISING_TOKEN_MISSING" }, { status: 503 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (!query) return NextResponse.json({ ok: false, error: "QUERY_REQUIRED" }, { status: 400 });

  const max = Number(request.nextUrl.searchParams.get("max") || 40);
  const page = Number(request.nextUrl.searchParams.get("page") || 1);
  const language = request.nextUrl.searchParams.get("language") || undefined;
  const mid = request.nextUrl.searchParams.get("mid") || undefined;

  try {
    const result = await searchRakutenProducts(query, { max, page, language, mid });
    return NextResponse.json({ ok: true, source: "rakuten", query, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RAKUTEN_UNKNOWN_ERROR";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
