import { NextRequest, NextResponse } from "next/server";
import { checkoutEnabled, checkoutMode, shippingFor, type CheckoutProduct } from "@/lib/commerce/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Each feed is market-specific. Add a market only once YNOT actually serves it.
const MARKETS: Record<string, string> = {
  FR: "EUR", DE: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR",
};
const SITE = "https://ynotworld.app";
type Row = Record<string, any>;
const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const clean = (v: unknown) => String(v ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const validHttps = (v: unknown) => { try { return new URL(String(v)).protocol === "https:"; } catch { return false; } };
const normalizeStock = (v: unknown) => {
  const s = String(v ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  return ["in_stock", "out_of_stock", "preorder", "backorder"].includes(s) ? s : "";
};
const normalizeCondition = (v: unknown) => {
  const s = String(v ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  return ["new", "used", "refurbished"].includes(s) ? s : "";
};

async function catalogPages(country: string): Promise<Row[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("CATALOG_NOT_CONFIGURED");
  const out: Row[] = [];
  // Paginate across the persisted catalog rather than sampling a few keyword searches.
  for (let offset = 0; offset < 100000; offset += 1000) {
    const query = new URL(url.replace(/\/$/, "") + "/rest/v1/ynot_catalog_products");
    query.searchParams.set("select", "*");
    query.searchParams.set("country", "eq." + country);
    query.searchParams.set("active", "eq.true");
    query.searchParams.set("ad_eligible", "eq.true");
    query.searchParams.set("commerce_status", "eq.commerce_ready");
    query.searchParams.set("order", "ynot_id.asc");
    query.searchParams.set("limit", "1000");
    query.searchParams.set("offset", String(offset));
    const response = await fetch(query, {
      headers: { apikey: key, Authorization: "Bearer " + key },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error("CATALOG_READ_FAILED_" + response.status);
    const rows: Row[] = await response.json();
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
  throw new Error("CATALOG_PAGINATION_LIMIT_REACHED");
}

function assess(p: Row, country: string, expectedCurrency: string) {
  const reasons: string[] = [];
  const attrs: Row = p.normalized_attributes && typeof p.normalized_attributes === "object" ? p.normalized_attributes : {};
  const id = String(p.ynot_id || "");
  const title = clean(p.cleaned_title || p.title);
  const description = clean(p.enriched_description || p.description || "");
  const image = String(p.image_url || "");
  const price = Number(p.ynot_price);
  const currency = String(p.currency || "").toUpperCase();
  const availability = normalizeStock(p.availability ?? attrs.availability);
  const condition = normalizeCondition(p.condition ?? attrs.condition);
  const supplierUrl = String(p.best_source_url || "");
  const source = String(p.source || "shopify-global-catalog");
  const supplier: CheckoutProduct = {
    id, title, price, currency, image, url: supplierUrl,
    source, category: String(p.category || ""), variantId: p.source_variant_id || undefined,
  };
  if (!id) reasons.push("missing_id");
  if (!title) reasons.push("missing_title");
  if (!description) reasons.push("missing_description");
  if (!validHttps(image)) reasons.push("invalid_image");
  if (!Number.isFinite(price) || price <= 0) reasons.push("invalid_price");
  if (currency !== expectedCurrency) reasons.push("market_currency_mismatch");
  if (!availability) reasons.push("unverified_stock");
  if (!condition) reasons.push("unverified_condition");
  if (!validHttps(supplierUrl) || checkoutMode(supplier).mode !== "ynot") reasons.push("not_ynot_checkout");
  if (!checkoutEnabled()) reasons.push("checkout_disabled");
  // No guessed shipping prices. A region must have an explicit verified rule.
  try {
    const quote = shippingFor(supplier, { country });
    if (quote.currency !== expectedCurrency) reasons.push("shipping_currency_mismatch");
  } catch {
    reasons.push("unverified_shipping");
  }
  if (p.feed_selected === false) reasons.push("not_selected");
  return { eligible: reasons.length === 0, reasons, id, title, description, image, price, currency, availability, condition, attrs };
}

export async function GET(req: NextRequest) {
  const country = String(req.nextUrl.searchParams.get("country") || "FR").toUpperCase();
  const currency = MARKETS[country];
  if (!currency) return NextResponse.json({ error: "UNSUPPORTED_MARKET", supported: Object.keys(MARKETS) }, { status: 400 });
  try {
    const products = await catalogPages(country);
    const assessed = products.map(p => ({ p, audit: assess(p, country, currency) }));
    const accepted = assessed.filter(x => x.audit.eligible);
    const rejected = assessed.filter(x => !x.audit.eligible);
    if (req.nextUrl.searchParams.get("diagnostics") === "1") {
      const reasons: Record<string, number> = {};
      for (const x of rejected) for (const reason of x.audit.reasons) reasons[reason] = (reasons[reason] || 0) + 1;
      return NextResponse.json({ country, scanned: assessed.length, eligible: accepted.length, withheld: rejected.length, reasons, published: process.env.YNOT_GOOGLE_MERCHANT_LAUNCH_ENABLED === "true" }, { headers: { "Cache-Control": "no-store" } });
    }
    // An empty feed is intentional until the merchant account, website and operational rules are approved.
    const published = process.env.YNOT_GOOGLE_MERCHANT_LAUNCH_ENABLED === "true";
    const items = (published ? accepted : []).map(({ p, audit: a }) => {
      const brand = clean(p.source_brand || p.brand);
      const gtin = clean(p.gtin || a.attrs.gtin);
      const mpn = clean(p.mpn || a.attrs.mpn);
      const extra = Array.isArray(p.image_urls) ? p.image_urls.filter((u: unknown) => validHttps(u) && u !== a.image).slice(0, 10) : [];
      const tags = [
        brand ? `<g:brand>${esc(brand)}</g:brand>` : "",
        gtin ? `<g:gtin>${esc(gtin)}</g:gtin>` : "",
        mpn ? `<g:mpn>${esc(mpn)}</g:mpn>` : "",
        ...extra.map((url: string) => `<g:additional_image_link>${esc(url)}</g:additional_image_link>`),
      ].join("");
      const link = SITE + "/p/" + encodeURIComponent(a.id) + "?country=" + country + "&src=google";
      return `<item><g:id>${esc(country + ":" + a.id)}</g:id><g:title>${esc(a.title.slice(0, 150))}</g:title><g:description>${esc(a.description.slice(0, 5000))}</g:description><g:link>${esc(link)}</g:link><g:image_link>${esc(a.image)}</g:image_link><g:price>${a.price.toFixed(2)} ${currency}</g:price><g:availability>${a.availability}</g:availability><g:condition>${a.condition}</g:condition>${tags}</item>`;
    }).join("");
    const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>YNOT World — ${country}</title><link>${SITE}</link><description>Verified eligible products offered by YNOT.</description>${items}</channel></rss>`;
    return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store", "X-YNOT-Feed-Country": country, "X-YNOT-Feed-Items": String(published ? accepted.length : 0) } });
  } catch (error) {
    console.error("MERCHANT_FEED_ERROR", error);
    return NextResponse.json({ error: "MERCHANT_FEED_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
