import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminErrorStatus, requireYnotAdmin } from "@/lib/ynot/admin-server";
import { getThreadsSettings, listQueue, listWatchlists, updateThreadsSettings } from "@/lib/social/threads-growth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireYnotAdmin(req);
    const [queue, watchlists, settings] = await Promise.all([listQueue(), listWatchlists(), getThreadsSettings()]);
    return NextResponse.json({ queue, watchlists, settings });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "THREADS_DATA_FAILED" }, { status: adminErrorStatus(error) });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireYnotAdmin(req);
    const body = await req.json();
    const action = String(body?.action || "");
    if (action === "watchlist") {
      const query = String(body?.query || "").trim().slice(0, 200);
      if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });
      const rows = await adminDb("ynot_threads_watchlists?on_conflict=query", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({
          query,
          search_type: body?.search_type === "TOP" ? "TOP" : "RECENT",
          enabled: body?.enabled !== false,
          min_relevance: Math.max(0, Math.min(100, Number(body?.min_relevance ?? 70))),
          auto_reply: body?.auto_reply === true,
          max_replies_per_run: Math.max(0, Math.min(5, Number(body?.max_replies_per_run ?? 2))),
          updated_at: new Date().toISOString(),
        }),
      });
      return NextResponse.json({ ok: true, watchlist: rows?.[0] || null });
    }
    if (action === "settings") {
      const allowed: Record<string, unknown> = {};
      for (const key of ["auto_post_enabled","auto_reply_enabled","attach_catalog"]) {
        if (typeof body?.[key] === "boolean") allowed[key] = body[key];
      }
      for (const key of ["max_auto_replies_per_day","max_auto_posts_per_day","min_relevance"]) {
        if (body?.[key] !== undefined) allowed[key] = Number(body[key]);
      }
      return NextResponse.json({ ok: true, settings: await updateThreadsSettings(allowed) });
    }
    if (action === "ignore") {
      const id = String(body?.thread_id || "");
      await adminDb(`ynot_threads_queue?thread_id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ status: "ignored", updated_at: new Date().toISOString() }),
      });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "THREADS_UPDATE_FAILED" }, { status: adminErrorStatus(error) });
  }
}
