import { adminDb } from "@/lib/ynot/admin-server";
import { searchCatalogIntent, type FeedCountry } from "@/lib/commerce/catalog-feed";

export type ThreadsCandidate = {
  id: string;
  text?: string;
  username?: string;
  permalink?: string;
  timestamp?: string;
  media_url?: string;
  profile_picture_url?: string;
};

const BUY_INTENT = [
  "where can i", "where do i", "looking for", "recommend", "suggest", "need a",
  "need an", "best", "under", "buy", "find", "shopping", "anyone know",
  "which one", "worth it", "alternative", "similar", "dupe", "gift",
];

const BLOCKED_TOPICS = [
  "election", "vote", "candidate", "war", "religion", "medical", "diagnosis",
  "self harm", "suicide", "weapon", "gun", "drug",
];

function tokens(value: string) {
  return value.toLowerCase().match(/[a-z0-9€$£]+/g) || [];
}

export function relevanceScore(text: string, query: string) {
  const t = text.toLowerCase();
  const q = [...new Set(tokens(query).filter((x) => x.length > 2))];
  const overlap = q.length ? q.filter((x) => t.includes(x)).length / q.length : 0;
  const intent = BUY_INTENT.some((x) => t.includes(x)) ? 1 : 0;
  const question = /\?|where|which|recommend|looking|find|need/.test(t) ? 1 : 0;
  return Math.max(0, Math.min(100, Math.round(overlap * 55 + intent * 30 + question * 15)));
}

export function safeForAutoReply(text: string) {
  const t = text.toLowerCase();
  return text.trim().length >= 12 && !BLOCKED_TOPICS.some((x) => t.includes(x));
}

export async function bestCatalogMatch(text: string, country: FeedCountry = "FR") {
  const result = await searchCatalogIntent(text.slice(0, 220), country, 4);
  const p = result.products?.[0];
  if (!p) return null;
  const base = (process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.NEXT_PUBLIC_APP_URL || "ynotworld.app").replace(/^https?:\/\//, "").replace(/\/$/, "");
  return {
    id: p.ynotId,
    title: p.title,
    price: p.ynotPrice,
    currency: p.sourceCurrency,
    image: p.image,
    url: `https://${base}/p/${encodeURIComponent(p.ynotId)}?country=${country}&src=threads`,
  };
}

export function buildCatalogReply(postText: string, product: Awaited<ReturnType<typeof bestCatalogMatch>>) {
  if (!product) {
    return "YNOT can help narrow this down — what budget, style, or must-have matters most?";
  }
  const price = Number.isFinite(Number(product.price)) ? ` around ${product.currency} ${Number(product.price).toFixed(0)}` : "";
  return `This looks close to what you're describing: ${product.title}${price}. I found it on YNOT: ${product.url}`;
}

export async function queueThread(input: {
  thread: ThreadsCandidate;
  query: string;
  relevance: number;
  suggestedReply?: string;
  product?: Awaited<ReturnType<typeof bestCatalogMatch>>;
}) {
  const row = {
    thread_id: input.thread.id,
    source_query: input.query,
    username: input.thread.username || null,
    thread_text: input.thread.text || "",
    permalink: input.thread.permalink || null,
    thread_timestamp: input.thread.timestamp || null,
    relevance: input.relevance,
    status: "queued",
    suggested_reply: input.suggestedReply || null,
    product_id: input.product?.id || null,
    product_title: input.product?.title || null,
    product_url: input.product?.url || null,
    image_url: input.product?.image || null,
    updated_at: new Date().toISOString(),
  };
  const rows = await adminDb("ynot_threads_queue?on_conflict=thread_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(row),
  });
  return rows?.[0] || row;
}

export async function listQueue(limit = 80) {
  return adminDb(`ynot_threads_queue?select=*&order=created_at.desc&limit=${Math.max(1, Math.min(200, limit))}`);
}

export async function listWatchlists() {
  return adminDb("ynot_threads_watchlists?select=*&order=created_at.asc");
}

export async function getThreadsSettings() {
  const rows = await adminDb("ynot_threads_settings?id=eq.default&select=*&limit=1");
  return rows?.[0] || null;
}

export async function updateThreadsSettings(patch: Record<string, unknown>) {
  const rows = await adminDb("ynot_threads_settings?id=eq.default", {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
  return rows?.[0] || null;
}

export async function markQueue(threadId: string, patch: Record<string, unknown>) {
  const rows = await adminDb(`ynot_threads_queue?thread_id=eq.${encodeURIComponent(threadId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
  return rows?.[0] || null;
}
