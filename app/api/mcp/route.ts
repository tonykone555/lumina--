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
  // Shopify Global Catalog can occasionally return a transient service error. Retry the
  // same canonical YNOT catalogue path before reporting an empty search so search_catalogue
  // and get_products_to_promote have identical live-source behaviour.
  let data: any = null;
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, { cache: "no-store" });
    lastStatus = response.status;
    if (!response.ok) {
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        continue;
      }
      throw new Error(`CATALOG_${response.status}`);
    }
    data = await response.json();
    const products = Array.isArray(data?.products) ? data.products : [];
    const transientShopifyError =
      source === "shopify" &&
      products.length === 0 &&
      typeof data?.error === "string" &&
      /temporarily unavailable|catalog unavailable|service error/i.test(data.error);
    if (!transientShopifyError || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  if (!data) throw new Error(`CATALOG_${lastStatus || "UNAVAILABLE"}`);
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

function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVER_NOT_CONFIGURED");
  return { url: url.replace(/\/$/, ""), key };
}

async function dbRows(path: string, init?: RequestInit) {
  const { url, key } = supabaseServer();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`YNOT_DB_${res.status}`);
  const body = await res.text();
  return body ? JSON.parse(body) : [];
}

async function previousCreatives(productId: string, limit: number) {
  const ids = encodeURIComponent(JSON.stringify([productId]));
  return dbRows(`ynot_ad_creatives?source_product_ids=cs.${ids}&select=id,source_product_ids,template_key,aspect_ratio,hook,primary_text,headline,cta,voice_script,payload,status,quality_score,render_url,thumbnail_url,destination_url,created_at,updated_at&order=created_at.desc&limit=${limit}`);
}

async function creativePerformance(productId: string, limit: number) {
  const creatives = await previousCreatives(productId, 50);
  if (!creatives.length) return { product_id: productId, creatives: [], performance: [] };
  const creativeIds = creatives.map((c: any) => c.id).join(",");
  const performance = await dbRows(`ynot_ad_performance?creative_id=in.(${creativeIds})&select=creative_id,campaign_id,platform,date,impressions,clicks,spend,saves,product_opens,add_to_bag,purchases,revenue,metadata&order=date.desc&limit=${limit}`);
  return { product_id: productId, creatives, performance };
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
      server.tool(
        "save_creative",
        "Save a structured YNOT creative hypothesis for human review. This does not generate media, schedule, publish or spend.",
        {
          product_id: z.string().min(1).max(300),
          hook: z.string().min(2).max(500),
          primary_text: z.string().max(3000).default(""),
          headline: z.string().max(300).default(""),
          cta: z.string().max(100).default("Learn more"),
          voice_script: z.string().max(5000).default(""),
          aspect_ratio: z.string().max(20).default("9:16"),
          destination_url: z.string().url().optional(),
          audience: z.string().max(1000).default(""),
          creative_concept: z.string().max(3000).default(""),
          video_prompt: z.string().max(6000).default(""),
          platform_notes: z.record(z.unknown()).optional(),
        },
        async (input) => {
          const payload = {
            source_product_ids: [input.product_id],
            template_key: "grok-mcp",
            aspect_ratio: input.aspect_ratio,
            hook: input.hook,
            primary_text: input.primary_text,
            headline: input.headline,
            cta: input.cta,
            voice_script: input.voice_script,
            destination_url: input.destination_url || null,
            status: "review",
            payload: {
              audience: input.audience,
              creative_concept: input.creative_concept,
              video_prompt: input.video_prompt,
              platform_notes: input.platform_notes || {},
              origin: "ynot-mcp",
              approval_required: true,
            },
          };
          const rows = await dbRows("ynot_ad_creatives", { method: "POST", body: JSON.stringify(payload) });
          return text({ saved: true, publishing_enabled: false, approval_required: true, creative: rows[0] || null });
        }
      );

      server.tool(
        "get_previous_creatives",
        "Read previous YNOT creative hypotheses for a product.",
        {
          product_id: z.string().min(1).max(300),
          limit: z.number().int().min(1).max(30).default(10),
        },
        async ({ product_id, limit }) => text({ product_id, creatives: await previousCreatives(product_id, limit) })
      );

      server.tool(
        "get_creative_performance",
        "Read recorded platform and commerce performance for creatives associated with a YNOT product. Returns evidence only; no inferred winner claims.",
        {
          product_id: z.string().min(1).max(300),
          limit: z.number().int().min(1).max(200).default(100),
        },
        async ({ product_id, limit }) => text(await creativePerformance(product_id, limit))
      );

      server.tool(
        "find_ad_opportunities",
        "Read YNOT product research scores as candidate signals for creative research. Scores are research signals, not sales predictions.",
        {
          query: z.string().max(100).default(""),
          limit: z.number().int().min(1).max(20).default(10),
        },
        async ({ query, limit }) => {
          const clean = query.replace(/[^a-z0-9 _-]/gi, "").trim();
          const filter = clean ? `&or=(title.ilike.*${encodeURIComponent(clean)}*,source.ilike.*${encodeURIComponent(clean)}*)` : "";
          const rows = await dbRows(`ynot_ad_product_scores?select=source,product_id,title,product_url,image_url,price,currency,image_quality,image_variety,visual_distinctiveness,offer_clarity,niche_relevance,metadata_quality,social_proof,ynot_signal,advertability_score,metadata,scored_at${filter}&order=advertability_score.desc.nullslast&limit=${limit}`);
          return text({ query, note: "Research signals only; not evidence of sales performance.", opportunities: rows });
        }
      );

      server.tool("get_approved_creatives","Get approved YNOT creatives that are ready for prompt enhancement or generation.",{limit:z.number().int().min(1).max(30).default(10)},async({limit})=>text({creatives:await dbRows(`ynot_ad_creatives?status=eq.approved&select=id,source_product_ids,hook,headline,voice_script,payload,destination_url,status,created_at&order=created_at.asc&limit=${limit}`)}));

      server.tool("create_generation_job","Create an approval-gated generation job. Use the enhanced production prompt when supplied; this does not call a video provider or publish.",{creative_id:z.string().uuid(),provider:z.string().max(80).default("grok-imagine"),enhanced_prompt:z.string().min(20).max(12000),source_prompt:z.string().max(6000).default(""),product_context:z.record(z.unknown()).optional()},async(input)=>{const creative=await dbRows(`ynot_ad_creatives?id=eq.${encodeURIComponent(input.creative_id)}&select=id,status,payload&limit=1`);if(!creative[0]||creative[0].status!=="approved")return text({created:false,error:"CREATIVE_NOT_APPROVED"});const rows=await dbRows("ynot_generation_jobs",{method:"POST",body:JSON.stringify({creative_id:input.creative_id,provider:input.provider,status:"queued",enhanced_prompt:input.enhanced_prompt,source_prompt:input.source_prompt,product_context:input.product_context||{},metadata:{origin:"ynot-mcp",approval_required:true}})});return text({created:true,generation_started:false,job:rows[0]||null})});

      server.tool("get_generation_job","Read a YNOT video-generation job and its generated assets.",{generation_job_id:z.string().uuid()},async({generation_job_id})=>{const jobs=await dbRows(`ynot_generation_jobs?id=eq.${generation_job_id}&select=*&limit=1`);const assets=await dbRows(`ynot_generated_assets?generation_job_id=eq.${generation_job_id}&select=*&order=created_at.desc`);return text({job:jobs[0]||null,assets})});

      server.tool("get_generated_assets","Get generated videos/assets for a creative so Grok can inspect the output and generation context.",{creative_id:z.string().uuid()},async({creative_id})=>text({creative_id,assets:await dbRows(`ynot_generated_assets?creative_id=eq.${creative_id}&select=*&order=created_at.desc`),jobs:await dbRows(`ynot_generation_jobs?creative_id=eq.${creative_id}&select=*&order=created_at.desc&limit=10`)}));

      server.tool("review_generated_video","Record Grok's structured review of a generated video. This does not approve publishing.",{asset_id:z.string().uuid(),verdict:z.enum(["good","needs_changes","reject"]),notes:z.string().max(5000),improved_prompt:z.string().max(12000).default("")},async(input)=>{const rows=await dbRows(`ynot_generated_assets?id=eq.${input.asset_id}`,{method:"PATCH",body:JSON.stringify({review_status:input.verdict,review_notes:input.notes,metadata:{grok_review:true,improved_prompt:input.improved_prompt}})});return text({saved:true,publishing_enabled:false,asset:rows[0]||null})});

      server.tool("request_regeneration","Create a new queued generation job from a reviewed asset with an improved prompt. Human creative approval remains required.",{asset_id:z.string().uuid(),improved_prompt:z.string().min(20).max(12000),provider:z.string().max(80).default("grok-imagine")},async(input)=>{const assets=await dbRows(`ynot_generated_assets?id=eq.${input.asset_id}&select=creative_id,generation_job_id&limit=1`);if(!assets[0])return text({created:false,error:"ASSET_NOT_FOUND"});const rows=await dbRows("ynot_generation_jobs",{method:"POST",body:JSON.stringify({creative_id:assets[0].creative_id,provider:input.provider,status:"queued",enhanced_prompt:input.improved_prompt,metadata:{origin:"grok-regeneration",source_asset_id:input.asset_id,approval_required:true}})});return text({created:true,generation_started:false,job:rows[0]||null})});

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
