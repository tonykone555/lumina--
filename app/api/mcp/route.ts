import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Product = {
  id: string; title?: string; brand?: string; price?: number | null; currency?: string;
  image?: string; images?: string[]; url?: string; description?: string; tags?: string[];
  source?: string; category?: string; variants?: unknown[]; [key: string]: unknown;
};

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function appUrl() {
  // Always prefer Vercel's canonical production URL. NEXT_PUBLIC_APP_URL can point at
  // an older/preview deployment and previously caused MCP catalogue calls to see stale demo data.
  const raw = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  if (!raw) return "";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/$/, "");
}

function authorized(request: Request) {
  const secret = process.env.YNOT_MCP_TOKEN;
  if (!secret) return false;
  return (request.headers.get("authorization") || "") === `Bearer ${secret}`;
}

function inferCategory(p: Product) {
  const s = `${p.category || ""} ${p.title || ""} ${(p.tags || []).join(" ")} ${p.description || ""}`.toLowerCase();
  if (/sofa|sectional|chair|table|bench|bedroom|living room|dining|furniture|home|decor|lamp|kitchen|bedding/.test(s)) return "home";
  if (/dress|fashion|shirt|shoe|bag|jewel|accessor|apparel|clothing/.test(s)) return "fashion";
  if (/fitness|gym|training|running|recovery|sport/.test(s)) return "fitness";
  if (/skin|beauty|serum|cream|spf|cleanser/.test(s)) return "skin";
  if (/hair|scalp|shampoo|conditioner/.test(s)) return "hair";
  if (/tech|phone|audio|headphone|charger|gaming|smart/.test(s)) return "tech";
  return p.category || "other";
}

function safeProduct(p: Product) {
  const variants = Array.isArray(p.variants) ? p.variants : [];
  const variantUrl = variants.map((v: any) => v?.url).find((v: unknown) => typeof v === "string" && v.startsWith("http"));
  return {
    id: p.id,
    title: p.title,
    brand: p.brand,
    description: p.description || null,
    category: inferCategory(p),
    price: p.price,
    currency: p.currency,
    image: p.image,
    images: p.images?.length ? p.images : p.image ? [p.image] : [],
    variants,
    url: variantUrl || p.url || null,
    tags: p.tags || [],
    source: p.source,
  };
}

async function catalog(query: string, country: string, source: string, limit: number) {
  const base = appUrl();
  if (!base) throw new Error("YNOT_APP_URL_NOT_CONFIGURED");
  const url = new URL("/api/catalog", base);
  url.searchParams.set("q", query);
  url.searchParams.set("country", country);
  url.searchParams.set("source", source);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`CATALOG_${response.status}`);
  const data = await response.json();
  const isFallback = data?.source === "fallback" || (Array.isArray(data?.sources) && data.sources.includes("fallback"));
  const rawProducts = isFallback ? [] : (Array.isArray(data?.products) ? data.products : []);
  return {
    query: data?.query || query,
    source: data?.source,
    error: data?.error,
    products: rawProducts.slice(0, Math.min(20, limit)).map((p: Product) => safeProduct(p)),
  };
}

async function promotedProducts(niche: string, limit: number) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  const clean = niche.replace(/[^a-z0-9 _-]/gi, "");
  const params = new URLSearchParams({
    select: "id,source,source_product_id,merchant_name,source_url,title,description,image_urls,supplier_currency,ynot_price,category,variants,research_status,research_score,research_reasons,availability_status,tiktok_eligible,last_research_at",
    research_status: "eq.approved",
    order: "research_score.desc.nullslast,last_research_at.desc.nullslast",
    limit: String(Math.min(12, limit)),
  });
  if (clean.trim()) params.set("or", `(category.ilike.*${clean}*,title.ilike.*${clean}*)`);
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/ynot_sellable_products?${params}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store",
  });
  if (!res.ok) throw new Error(`PROMOTION_CATALOG_${res.status}`);
  return res.json();
}

function researchedDto(p: any) {
  return {
    id: p.id,
    source_product_id: p.source_product_id,
    title: p.title,
    brand: p.merchant_name,
    description: p.description || null,
    category: p.category || "other",
    price: p.ynot_price,
    currency: p.supplier_currency,
    images: Array.isArray(p.image_urls) ? p.image_urls : [],
    image: Array.isArray(p.image_urls) ? p.image_urls[0] : null,
    variants: Array.isArray(p.variants) ? p.variants : [],
    url: p.source_url,
    source: p.source,
    research_status: p.research_status,
    research_score: p.research_score,
    research_reasons: p.research_reasons,
    availability_status: p.availability_status,
    tiktok_eligible: p.tiktok_eligible,
    last_research_at: p.last_research_at,
  };
}

function makeHandler() {
  return createMcpHandler(
    (server) => {
      server.tool(
        "search_catalogue",
        "Search YNOT's live commerce catalogue. Returns only real live-source products, never UI demo products.",
        {
          query: z.string().min(2).max(200),
          country: z.string().length(2).default("FR"),
          source: z.enum(["shopify", "amazon", "all"]).default("shopify"),
          limit: z.number().int().min(1).max(20).default(10),
        },
        async ({ query, country, source, limit }) => text(await catalog(query, country.toUpperCase(), source, limit))
      );

      server.tool(
        "get_product",
        "Get one real YNOT product from a bounded catalogue search, including description, category, variants, images and merchant URL.",
        {
          product_id: z.string().min(1),
          query: z.string().min(2).max(200),
          country: z.string().length(2).default("FR"),
          source: z.enum(["shopify", "amazon", "all"]).default("shopify"),
        },
        async ({ product_id, query, country, source }) => {
          const data = await catalog(query, country.toUpperCase(), source, 20);
          const product = data.products.find((p: Product) => String(p.id) === product_id);
          return text(product || { error: "PRODUCT_NOT_FOUND", product_id });
        }
      );

      server.tool(
        "get_product_images",
        "Return original product image URLs and merchant product URL for a real YNOT product.",
        {
          product_id: z.string().min(1),
          query: z.string().min(2).max(200),
          country: z.string().length(2).default("FR"),
          source: z.enum(["shopify", "amazon", "all"]).default("shopify"),
        },
        async ({ product_id, query, country, source }) => {
          const data = await catalog(query, country.toUpperCase(), source, 20);
          const product = data.products.find((p: Product) => String(p.id) === product_id);
          if (!product) return text({ error: "PRODUCT_NOT_FOUND", product_id });
          return text({
            product_id,
            title: product.title,
            brand: product.brand,
            images: product.images?.length ? product.images : product.image ? [product.image] : [],
            source_url: product.url,
          });
        }
      );

      server.tool(
        "get_products_to_promote",
        "Find bounded real YNOT products for creative exploration: approved researched products first, then live Shopify candidates. Never returns demo merchandise.",
        {
          niche: z.string().min(2).max(100),
          country: z.string().length(2).default("FR"),
          limit: z.number().int().min(1).max(12).default(6),
        },
        async ({ niche, country, limit }) => {
          const researched = await promotedProducts(niche, limit);
          if (researched.length) {
            return text({ niche, source: "ynot-researched-products", candidates: researched.map(researchedDto) });
          }
          const data = await catalog(niche, country.toUpperCase(), "shopify", limit);
          if (!data.products.length) {
            return text({
              niche,
              source: "none",
              note: "No approved researched YNOT products or live Shopify candidates matched this niche.",
              candidates: [],
            });
          }
          return text({
            niche,
            source: "shopify-global-catalog",
            note: "No approved researched YNOT products matched yet; returning bounded real Shopify candidates for research.",
            candidates: data.products,
          });
        }
      );
    },
    {},
    { basePath: "/api", maxDuration: 60 }
  );
}

async function dispatch(request: Request) {
  if (!authorized(request)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json", "www-authenticate": 'Bearer realm="YNOT MCP"' },
    });
  }
  return makeHandler()(request);
}

export const GET = dispatch;
export const POST = dispatch;
export const DELETE = dispatch;
