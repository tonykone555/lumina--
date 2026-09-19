import { NextRequest, NextResponse } from "next/server";
import { requireYnotAdmin, adminErrorStatus } from "@/lib/ynot/admin-server";
import { publishImageThread, publishTextThread } from "@/lib/social/threads";
import { markQueue } from "@/lib/social/threads-growth";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    await requireYnotAdmin(req);
    const body = await req.json();
    const replyToId = String(body?.thread_id || "");
    const text = String(body?.text || "").trim().slice(0, 500);
    const imageUrl = String(body?.image_url || "").trim();
    if (!replyToId || !text) return NextResponse.json({ error: "thread_id and text are required" }, { status: 400 });

    const result = imageUrl
      ? await publishImageThread({ imageUrl, text, replyToId })
      : await publishTextThread(text, replyToId);

    const publishedId = String(result?.published?.id || "");
    await markQueue(replyToId, { status: "replied", reply_post_id: publishedId || null, error: null });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "THREADS_REPLY_FAILED" }, { status: adminErrorStatus(error) });
  }
}
