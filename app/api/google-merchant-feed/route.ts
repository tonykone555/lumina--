import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = "https://ynotworld.app";
const QUERIES = [
  "fashion clothing dresses bags accessories",
  "kids baby clothing toys nursery",
  "fitness activewear training equipment",
  "beauty skincare self care",
  "hair care styling tools",
  "home furniture lighting decor",
  "tech electronics audio accessories",
];

type Variant = { available?: boolean };
type Product = {
  id?: string; title?: string; description?: string; brand?: string; price?: number | null;
  currency?: string; image?: string; images?: string[]; url?: string; source?: string;
  variants?: Variant[]; gtin?: string; mpn?: string; condition?: string; availability?: string;
};

const esc = (v: unknown) => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const text = (v: unknown) => String(v ?? "").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
function knownAvailability(p: Product) {
  const raw = String(p.availability || "").toLowerCase();
  if (["in_stock","out_of_stock","preorder","backorder"].includes(raw)) return raw;
  if (Array.isArray(p.variants) && p.variants.length) return p.variants.some(v => v.available === true) ? "in_stock" : p.variants.every(v => v.available === false) ? "out_of_stock" : "";
  return "";
}
function knownCondition(p: Product) {
  const raw = String(p.condition || "").toLowerCase().replace(/\s+/g,"_");
  return ["new","used","refurbished"].includes(raw) ? raw : "";
}
function quality(p: Product) {
  const availability = knownAvailability(p), condition = knownCondition(p);
  const reasons: string[] = [];
  if (!p.id) reasons.push("missing_id"); if (!text(p.title)) reasons.push("missing_title");
  if (!p.image) reasons.push("missing_image"); if (!p.url) reasons.push("missing_merchant_url");
  if (!(Number(p.price) > 0)) reasons.push("missing_price"); if (!p.currency) reasons.push("missing_currency");
  if (!availability) reasons.push("unknown_availability"); if (!condition) reasons.push("unknown_condition");
  return { ok: reasons.length === 0, reasons, availability, condition };
}
async function catalogue(req: NextRequest) {
  const products: Product[] = [];
  for (const q of QUERIES) {
    const u = new URL("/api/catalog", req.nextUrl.origin);
    u.searchParams.set("q", q); u.searchParams.set("country", "FR"); u.searchParams.set("source", "shopify"); u.searchParams.set("category_load", "1");
    const r = await fetch(u, { cache: "no-store", headers: { accept: "application/json" } });
    if (!r.ok) continue;
    const j = await r.json(); if (Array.isArray(j?.products)) products.push(...j.products);
  }
  const seen = new Set<string>();
  return products.filter(p => { const k = String(p.id || ""); if (!k || seen.has(k)) return false; seen.add(k); return true; });
}

export async function GET(req: NextRequest) {
  const all = await catalogue(req);
  const accepted = all.map(p => ({ p, q: quality(p) })).filter(x => x.q.ok);
  const rejected = all.map(p => ({ id:p.id,title:p.title,reasons:quality(p).reasons })).filter(x => x.reasons.length);
  if (req.nextUrl.searchParams.get("diagnostics") === "1") return NextResponse.json({ generated_at:new Date().toISOString(), scanned:all.length, eligible:accepted.length, withheld:rejected.length, withheld_products:rejected.slice(0,200) }, { headers:{"Cache-Control":"no-store"} });
  const items = accepted.map(({p,q}) => `<item><g:id>${esc(p.id)}</g:id><g:title>${esc(text(p.title).slice(0,150))}</g:title><g:description>${esc(text(p.description || p.title).slice(0,5000))}</g:description><g:link>${esc(`${SITE}/p/${encodeURIComponent(String(p.id))}`)}</g:link><g:image_link>${esc(p.image)}</g:image_link><g:availability>${q.availability}</g:availability><g:price>${Number(p.price).toFixed(2)} ${esc(p.currency)}</g:price><g:condition>${q.condition}</g:condition>${p.brand?`<g:brand>${esc(p.brand)}</g:brand>`:""}${p.gtin?`<g:gtin>${esc(p.gtin)}</g:gtin>`:p.mpn?`<g:mpn>${esc(p.mpn)}</g:mpn>`:"<g:identifier_exists>no</g:identifier_exists>"}<g:custom_label_0>YNOT</g:custom_label_0><g:custom_label_1>${esc(p.source||"shopify")}</g:custom_label_1></item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel><title>YNOT World Product Feed</title><link>${SITE}</link><description>Eligible YNOT products prepared for Google Merchant Center.</description>${items}</channel></rss>`;
  return new NextResponse(xml,{status:200,headers:{"Content-Type":"application/xml; charset=utf-8","Cache-Control":"public, max-age=0, s-maxage=1800"}});
}
