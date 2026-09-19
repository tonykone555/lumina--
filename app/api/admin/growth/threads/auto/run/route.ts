import { NextRequest, NextResponse } from "next/server";
import { adminDb, requireYnotAdmin } from "@/lib/ynot/admin-server";
import { listThreadMentions, publishImageThread, publishTextThread, publishVideoThread, searchPublicThreads } from "@/lib/social/threads";
import { bestCatalogMatch, buildCatalogReply, getThreadsSettings, listWatchlists, markQueue, queueThread, relevanceScore, safeForAutoReply } from "@/lib/social/threads-growth";

export const runtime = "nodejs";
export const maxDuration = 120;

async function authorize(req: NextRequest) {
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return;
  await requireYnotAdmin(req);
}

async function publishDueScheduledPosts() {
  const settings = await getThreadsSettings();
  if (!settings?.auto_post_enabled) return { published: 0, failed: 0 };
  const due = await adminDb(`ynot_threads_posts?status=eq.scheduled&scheduled_for=lte.${encodeURIComponent(new Date().toISOString())}&select=*&order=scheduled_for.asc&limit=3`);
  let published = 0, failed = 0;
  for (const post of due || []) {
    try {
      let result: any;
      if (post.media_type === "VIDEO") result = await publishVideoThread({ videoUrl: post.media_url, text: post.text });
      else if (post.media_type === "IMAGE") result = await publishImageThread({ imageUrl: post.media_url, text: post.text });
      else result = await publishTextThread(post.text);
      await adminDb(`ynot_threads_posts?id=eq.${post.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "published", published_id: result?.published?.id || null, error: null, updated_at: new Date().toISOString() }),
      });
      published++;
    } catch (error) {
      failed++;
      await adminDb(`ynot_threads_posts?id=eq.${post.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "failed", error: error instanceof Error ? error.message : "PUBLISH_FAILED", updated_at: new Date().toISOString() }),
      });
    }
  }
  return { published, failed };
}

export async function GET(req: NextRequest) {
  try {
    await authorize(req);
    const settings = await getThreadsSettings();
    const scheduled = await publishDueScheduledPosts();
    if (!settings?.auto_reply_enabled) return NextResponse.json({ ok: true, scheduled, auto_reply: "disabled" });

    const since = new Date();
    since.setUTCHours(0,0,0,0);
    const already = await adminDb(`ynot_threads_queue?status=eq.replied&updated_at=gte.${encodeURIComponent(since.toISOString())}&select=id`);
    let remaining = Math.max(0, Number(settings.max_auto_replies_per_day || 0) - (already?.length || 0));
    if (!remaining) return NextResponse.json({ ok: true, scheduled, auto_reply: "daily_cap_reached" });

    const watchlists = (await listWatchlists()).filter((w: any) => w.enabled).slice(0, 6);
    let queued = 0, replied = 0;

    for (const watch of watchlists) {
      if (remaining <= 0) break;
      const raw: any = await searchPublicThreads({ query: watch.query, searchType: watch.search_type || "RECENT", limit: 20 });
      const posts = Array.isArray(raw?.data) ? raw.data : [];
      let repliedThisWatch = 0;
      for (const post of posts) {
        if (remaining <= 0 || repliedThisWatch >= Number(watch.max_replies_per_run || 2)) break;
        const text = String(post?.text || "");
        const relevance = relevanceScore(text, watch.query);
        const threshold = Math.max(Number(settings.min_relevance || 80), Number(watch.min_relevance || 70));
        if (relevance < threshold || !safeForAutoReply(text)) continue;

        const existing = await adminDb(`ynot_threads_queue?thread_id=eq.${encodeURIComponent(String(post.id))}&select=id,status&limit=1`);
        if (existing?.length) continue;

        const product = settings.attach_catalog ? await bestCatalogMatch(text, "FR") : null;
        const suggestedReply = buildCatalogReply(text, product);
        await queueThread({ thread: post, query: watch.query, relevance, suggestedReply, product });
        queued++;

        if (watch.auto_reply === true) {
          try {
            const result = product?.image && settings.attach_catalog
              ? await publishImageThread({ imageUrl: product.image, text: suggestedReply, replyToId: String(post.id) })
              : await publishTextThread(suggestedReply, String(post.id));
            await markQueue(String(post.id), { status: "replied", reply_post_id: result?.published?.id || null, error: null });
            replied++; repliedThisWatch++; remaining--;
          } catch (error) {
            await markQueue(String(post.id), { status: "failed", error: error instanceof Error ? error.message : "AUTO_REPLY_FAILED" });
          }
        }
      }
    }

    return NextResponse.json({ ok: true, scheduled, queued, replied, remaining_today: remaining });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "THREADS_AUTOMATION_FAILED" }, { status: 500 });
  }
}
