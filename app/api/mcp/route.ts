import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Product = {
  id: string;
  title?: string;
  brand?: string;
  price?: number | null;
  supplierPrice?: number | null;
  retailPrice?: number | null;
  currency?: string;
  image?: string;
  images?: string[];
  url?: string;
  description?: string;
  tags?: string[];
  source?: string;
  category?: string;
  [key: string]: unknown;
};

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "").replace(/^([^h])/, "https://$1").replace(/\/$/, "");
}

function authorized(request: Request) {
  const secret = process.env.YNOT_MCP_TOKEN;
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
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
  const products = (Array.isArray(data?.products) ? data.products : []).slice(0, Math.min(20, limit));
  return { query: data?.query || query, source: data?.source, products };
}

function safeProduct(p: Product) {
  return {
    id: p.id,
    title: p.title,
    brand: p.brand,
    price: p.price,
    currency: p.currency,
    image: p.image,
    images: p.images || (p.image ? [p.image] : []),
    url: p.url,
    description: p.description,
    tags: p.tags || [],
    source: p.source,
    category: p.category,
  };
}

function makeHandler() {
  return createMcpHandler(
    (server) => {
      server.tool(
        "search_catalogue",
        "Search YNOT's live commerce catalogue. Returns at most 20 bounded product results; use this before selecting a product for marketing.",
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
        "Get a specific product from a bounded YNOT catalogue search. Supply the product id plus the search query that found it.",
        {
          product_id: z.string().min(1),
          query: z.string().min(2).max(200),
          country: z.string().length(2).default("FR"),
          source: z.enum(["shopify", "amazon", "all"]).default("shopify"),
        },
        async ({ product_id, query, country, source }) => {
          const data = await catalog(query, country.toUpperCase(), source, 20);
          const product = data.products.find((p: Product) => String(p.id) === product_id);
          return text(product ? safeProduct(product) : { error: "PRODUCT_NOT_FOUND", product_id });
        }
      );

      server.tool(
        "get_product_images",
        "Return the original product image URLs for a product selected from YNOT. Use these as source material for approved marketing creatives.",
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
        "Find a small set of YNOT products suitable for creative exploration. This is a bounded candidate finder, not an unrestricted catalogue dump.",
        {
          niche: z.string().min(2).max(100),
          country: z.string().length(2).default("FR"),
          limit: z.number().int().min(1).max(12).default(6),
        },
        async ({ niche, country, limit }) => {
          const data = await catalog(niche, country.toUpperCase(), "shopify", limit);
          return text({ niche, candidates: data.products.map((p: Product) => safeProduct(p)) });
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
  const handler = makeHandler();
  return handler(request);
}

export const GET = dispatch;
export const POST = dispatch;
export const DELETE = dispatch;
