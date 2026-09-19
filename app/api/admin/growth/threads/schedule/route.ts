import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminErrorStatus, requireYnotAdmin } from "@/lib/ynot/admin-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireYnotAdmin(req);
    const posts = await adminDb("ynot_threads_posts?select=*&order=created_at.desc&limit=50");
    return NextResponse.json({ posts });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "THREADS_POSTS_FAILED" }, { status: adminErrorStatus(error) });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireYnotAdmin(req);
    const body = await req.json();
    const text = String(body?.text || "").trim().slice(0, 500);
    const mediaType = ["TEXT","IMAGE","VIDEO"].includes(String(body?.media_type || "").toUpperCase()) ? String(body.media_type).toUpperCase() : "TEXT";
    const mediaUrl = String(body?.media_url || "").trim() || null;
    const scheduledFor = body?.scheduled_for ? new Date(body.scheduled_for).toISOString() : null;
    if (!text && !mediaUrl) return NextResponse.json({ error: "Post content is required" }, { status: 400 });
    const rows = await adminDb("ynot_threads_posts", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ text, media_type: mediaType, media_url: mediaUrl, status: scheduledFor ? "scheduled" : "draft", scheduled_for: scheduledFor }),
    });
    return NextResponse.json({ ok: true, post: rows?.[0] || null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "THREADS_SCHEDULE_FAILED" }, { status: adminErrorStatus(error) });
  }
}
