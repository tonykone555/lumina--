import { NextRequest, NextResponse } from "next/server";
import { requireYnotAdmin, adminErrorStatus } from "@/lib/ynot/admin-server";
import { publishImageThread, publishTextThread, publishVideoThread } from "@/lib/social/threads";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  try {
    await requireYnotAdmin(req);
    const body = await req.json();
    const text = String(body?.text || "").trim().slice(0, 500);
    const mediaUrl = String(body?.media_url || "").trim();
    const mediaType = String(body?.media_type || "TEXT").toUpperCase();
    if (!text && !mediaUrl) return NextResponse.json({ error: "Post content is required" }, { status: 400 });
    let result;
    if (mediaType === "VIDEO") result = await publishVideoThread({ videoUrl: mediaUrl, text });
    else if (mediaType === "IMAGE") result = await publishImageThread({ imageUrl: mediaUrl, text });
    else result = await publishTextThread(text);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "THREADS_PUBLISH_FAILED" }, { status: adminErrorStatus(error) });
  }
}
