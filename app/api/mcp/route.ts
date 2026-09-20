import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { getThreadsProfile, hideThreadReply, listRecentThreads, listThreadMentions, listThreadReplies, publishImageThread, publishTextThread, publishVideoThread, searchPublicThreads } from "@/lib/social/threads";

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

function ynotProductUrl(productId: string, country = "FR", category = "other", src = "mcp-growth") {
  const base = appUrl();
  if (!base || !/^ynot-/i.test(String(productId || ""))) return null;
  return `${base}/p/${encodeURIComponent(productId)}?country=${encodeURIComponent(country)}&category=${encodeURIComponent(category || "other")}&src=${encodeURIComponent(src)}`;
}

function normalizeGrowthProducts(products: unknown, defaultCountry = "FR") {
  if (!Array.isArray(products)) return [];
  return products.slice(0, 20).map((raw: any) => {
    const p = raw && typeof raw === "object" ? { ...raw } : {};
    const id = String(p.id || p.ynot_id || p.ynotId || "");
    const category = String(p.category || "other");
    const country = String(p.country || defaultCountry || "FR").toUpperCase();
    const customerUrl = ynotProductUrl(id, country, category);
    const merchantUrl =
      typeof p.merchant_url === "string" ? p.merchant_url :
      typeof p.source_url === "string" ? p.source_url :
      typeof p.url === "string" && !/^https?:\/\/[^/]*ynotworld\.app\//i.test(p.url) ? p.url :
      null;
    return {
      ...p,
      id: id || p.id,
      url: customerUrl || (typeof p.url === "string" && /ynotworld\.app/i.test(p.url) ? p.url : null),
      ynot_url: customerUrl || (typeof p.ynot_url === "string" ? p.ynot_url : null),
      merchant_url: merchantUrl,
    };
  });
}

function words(value: unknown) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9€$£]+/g, " ").split(/\s+/).filter((w) => w.length > 2);
}

function scoreGrowthProduct(product: any, opportunity: any) {
  const haystack = words([
    product.title, product.original_title, product.brand, product.source_brand, product.category,
    ...(Array.isArray(product.intent_tags) ? product.intent_tags : []),
  ].join(" "));
  const hay = new Set(haystack);
  const wanted = Array.from(new Set(words([
    opportunity.niche, opportunity.source_quote, opportunity.summary, opportunity.reason,
    opportunity.personalization_context, ...(Array.isArray(opportunity.intent_tags) ? opportunity.intent_tags : []),
  ].join(" ")))).slice(0, 80);
  const lexicalHits = wanted.filter((w) => hay.has(w)).length;
  const semanticScore = Math.min(40, lexicalHits * 6);
  const categoryWanted = words(opportunity.niche || "");
  const categoryHit = categoryWanted.some((w) => hay.has(w)) ? 24 : 0;

  const price = Number(product.ynot_price || 0);
  const budgetMin = Number(opportunity.budget_min || 0);
  const budgetMax = Number(opportunity.budget_max || 0);
  const tags = new Set((opportunity.intent_tags || []).map((x: any) => String(x).toLowerCase()));
  const hardCap = tags.has("hard cap") || tags.has("hard_cap") || tags.has("strict budget");
  if (hardCap && budgetMax > 0 && price > budgetMax) return { rejected: true, score: 0, reasons: [], warnings: ["above hard budget cap"] };

  let budgetScore = 10;
  const warnings: string[] = [];
  if (budgetMax > 0) {
    if (price <= budgetMax && (!budgetMin || price >= budgetMin)) budgetScore = 24;
    else if (price < budgetMin) budgetScore = 18;
    else if (price <= budgetMax * 1.15) { budgetScore = 12; warnings.push("stretch: slightly above budget"); }
    else { budgetScore = 2; warnings.push("well above stated budget"); }
  }

  const reliability = Math.max(0, Math.min(10, Number(product.reliability_score || 0) / 10));
  const presentation = (product.image_url ? 4 : 0) + (product.ynot_id ? 4 : 0);
  const score = Math.round(Math.min(100, semanticScore + categoryHit + budgetScore + reliability + presentation));
  const reasons = [];
  if (categoryHit) reasons.push("category match");
  if (lexicalHits) reasons.push(`${lexicalHits} intent/detail matches`);
  if (budgetMax > 0 && price <= budgetMax) reasons.push("within stated budget");
  if (Number(product.reliability_score || 0) >= 70) reasons.push("strong supplier reliability");
  return { rejected: false, score, reasons, warnings };
}

async function matchGrowthProducts(externalKey: string, requestedLimit: number) {
  const rows = await dbRows(`ynot_growth_opportunities?external_key=eq.${encodeURIComponent(externalKey)}&select=*&limit=1`);
  const opportunity = rows?.[0];
  if (!opportunity) return { error: "OPPORTUNITY_NOT_FOUND", external_key: externalKey, products: [] };

  const country = String(opportunity.country || "FR").toUpperCase();
  const fields = "ynot_id,country,category,title,original_title,brand,source_brand,image_url,image_urls,ynot_price,currency,intent_tags,price_position,reliability_score,routing_score,supplier_offer_count";
  let candidates = await dbRows(`ynot_catalog_products?active=eq.true&country=eq.${encodeURIComponent(country)}&select=${fields}&limit=5000`);
  if (!candidates?.length) candidates = await dbRows(`ynot_catalog_products?active=eq.true&select=${fields}&limit=5000`);

  const scored = (candidates || []).map((p: any) => {
    const evaluation = scoreGrowthProduct(p, opportunity);
    const ynotUrl = ynotProductUrl(p.ynot_id, p.country || country, p.category || opportunity.niche || "other",);
    return {
      id: p.ynot_id,
      ynot_id: p.ynot_id,
      title: p.title,
      brand: p.source_brand || p.brand || "YNOT",
      category: p.category,
      country: p.country || country,
      price: p.ynot_price,
      currency: p.currency,
      image: p.image_url,
      images: p.image_urls,
      ynot_url: ynotUrl,
      url: ynotUrl,
      match_score: evaluation.score,
      match_reasons: evaluation.reasons,
      constraint_warnings: evaluation.warnings,
      reliability_score: p.reliability_score,
      routing_score: p.routing_score,
      supplier_offer_count: p.supplier_offer_count,
      rejected: evaluation.rejected,
    };
  }).filter((p: any) => !p.rejected && p.match_score >= 25).sort((a: any,b: any)=>b.match_score-a.match_score);

  const limit = Math.max(2, Math.min(5, requestedLimit));
  const picked: any[] = [];
  const best = scored[0];
  if (best) picked.push({...best, match_role: "best", selected_for_outreach: true});

  const budgetMax = Number(opportunity.budget_max || 0);
  const value = scored
    .filter((p: any) => p.id !== best?.id && Number(p.price || 0) > 0 && (!budgetMax || Number(p.price) <= budgetMax))
    .sort((a: any,b: any)=>Number(a.price)-Number(b.price))[0];
  if (value && picked.length < limit) picked.push({...value, match_role: "value", selected_for_outreach: true});

  const stretch = budgetMax > 0 ? scored
    .filter((p: any) => !picked.some((x: any)=>x.id===p.id) && Number(p.price||0) > budgetMax && Number(p.price||0) <= budgetMax*1.2)
    .sort((a: any,b: any)=>b.match_score-a.match_score)[0] : null;
  if (stretch && picked.length < limit) picked.push({...stretch, match_role: "stretch", selected_for_outreach: false});

  for (const p of scored) {
    if (picked.length >= limit) break;
    if (!picked.some((x: any)=>x.id===p.id)) picked.push({...p, match_role: picked.length===0?"best":"alternative", selected_for_outreach: picked.length < 3});
  }
  return { opportunity, products: picked, scanned: candidates?.length || 0 };
}

async function catalog(query: string, country: string, source: string, limit: number) {
  const base = appUrl();
  if (!base) throw new Error("YNOT_APP_URL_NOT_CONFIGURED");

  if (source === "shopify") {
    const recUrl = new URL("/api/commerce/recommendations", base);
    recUrl.searchParams.set("q", query);
    recUrl.searchParams.set("country", country);
    recUrl.searchParams.set("limit", String(Math.min(20, limit)));
    const recResponse = await fetch(recUrl, { cache: "no-store" });
    if (!recResponse.ok) throw new Error(`YNOT_RECOMMENDATIONS_${recResponse.status}`);
    const recData: any = await recResponse.json();
    const products = Array.isArray(recData?.products) ? recData.products : [];
    return {
      query: recData?.query || query,
      source: "ynot-canonical-catalog",
      error: recData?.error,
      products: products.slice(0, Math.min(20, limit)).map((p: any) => ({
        id: p.ynotId,
        title: p.title,
        brand: p.sourceBrand || p.brand || "YNOT",
        description: p.originalTitle || p.title,
        category: p.category || "other",
        price: p.ynotPrice,
        currency: p.sourceCurrency,
        image: p.image,
        images: Array.isArray(p.images) ? p.images : p.image ? [p.image] : [],
        variants: [],
        url: `${base}/p/${encodeURIComponent(p.ynotId)}?country=${encodeURIComponent(p.country)}&category=${encodeURIComponent(p.category)}&src=mcp`,
        tags: p.intentTags || [],
        source: "ynot-canonical-catalog",
        supplier_offer_count: p.supplierOfferCount,
        price_position: p.pricePosition,
      })),
    };
  }

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
        "Search YNOT's live commerce catalogue. For outreach and customer-facing recommendations, use the returned YNOT product URL from the default Shopify/YNOT canonical path. Never send raw merchant/Shopify URLs when a YNOT URL is available.",
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
        "Find bounded real YNOT products for creative exploration. For any customer-facing outreach, prefer candidates with a YNOT URL and use that URL instead of raw Shopify/merchant links. Never returns demo merchandise.",
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


      server.tool(
        "save_growth_opportunity",
        "Create or update a qualified YNOT Growth opportunity discovered from X, TikTok, Threads, Reddit, YouTube or the web. This writes to the private Growth CRM only; it does not contact anyone.",
        {
          external_key: z.string().min(3).max(500),
          kind: z.enum(["intent","creator","ugc","affiliate"]),
          platform: z.string().min(1).max(40).default("web"),
          handle: z.string().max(200).optional(),
          display_name: z.string().max(300).optional(),
          profile_url: z.string().url().optional(),
          source_post_url: z.string().url().optional(),
          niche: z.string().max(200).optional(),
          country: z.string().max(8).optional(),
          followers: z.number().int().min(0).optional(),
          engagement: z.number().min(0).optional(),
          intent_strength: z.number().int().min(0).max(100).optional(),
          creator_fit: z.number().int().min(0).max(100).optional(),
          summary: z.string().max(3000).optional(),
          reason: z.string().max(3000).optional(),
          source_quote: z.string().max(5000).optional(),
          budget_min: z.number().min(0).optional(),
          budget_max: z.number().min(0).optional(),
          budget_currency: z.string().max(8).optional(),
          intent_tags: z.array(z.string().max(80)).max(20).default([]),
          constraints: z.record(z.unknown()).optional(),
          personalization_context: z.string().max(5000).optional(),
          matched_product_ids: z.array(z.string().max(300)).max(20).default([]),
          matched_products: z.array(z.record(z.unknown())).max(20).default([]),
          draft_message: z.string().max(5000).optional(),
          channel: z.string().max(60).optional(),
          status: z.enum(["new","qualified","ready","contacted","replied","won","lost","dismissed"]).default("new"),
          owner: z.enum(["RADAR","STORE","ARROW"]).default("RADAR"),
          next_action: z.string().max(1000).optional(),
          metadata: z.record(z.unknown()).optional(),
        },
        async (input) => {
          const payload = {
            ...input,
            handle: input.handle || null,
            display_name: input.display_name || null,
            profile_url: input.profile_url || null,
            source_post_url: input.source_post_url || null,
            niche: input.niche || null,
            country: input.country || null,
            followers: input.followers ?? null,
            engagement: input.engagement ?? null,
            intent_strength: input.intent_strength ?? null,
            creator_fit: input.creator_fit ?? null,
            summary: input.summary || null,
            reason: input.reason || null,
            source_quote: input.source_quote || null,
            budget_min: input.budget_min ?? null,
            budget_max: input.budget_max ?? null,
            budget_currency: input.budget_currency || null,
            intent_tags: input.intent_tags || [],
            constraints: input.constraints || {},
            personalization_context: input.personalization_context || null,
            draft_message: input.draft_message || null,
            channel: input.channel || null,
            next_action: input.next_action || null,
            metadata: {...(input.metadata || {}), origin: "ynot-mcp"},
            outreach_approved: false,
            updated_at: new Date().toISOString(),
          };
          const rows = await dbRows("ynot_growth_opportunities?on_conflict=external_key", {
            method: "POST",
            headers: { Prefer: "resolution=merge-duplicates,return=representation" },
            body: JSON.stringify(payload),
          });
          const opportunity = rows[0] || null;
          if (opportunity?.id) {
            await dbRows("ynot_growth_activity", {
              method: "POST",
              body: JSON.stringify({
                opportunity_id: opportunity.id,
                event_type: "upserted",
                actor: "RADAR",
                detail: { kind: input.kind, platform: input.platform, origin: "ynot-mcp" },
              }),
            });
          }
          return text({ saved: true, contact_sent: false, approval_required: true, opportunity });
        }
      );

      server.tool(
        "update_growth_opportunity",
        "Update qualification, product matches, draft outreach, ownership or pipeline status for an existing Growth opportunity. This cannot approve or send outreach.",
        {
          external_key: z.string().min(3).max(500),
          status: z.enum(["new","qualified","ready","contacted","replied","won","lost","dismissed"]).optional(),
          owner: z.enum(["RADAR","STORE","ARROW"]).optional(),
          matched_product_ids: z.array(z.string().max(300)).max(20).optional(),
          matched_products: z.array(z.record(z.unknown())).max(20).optional(),
          draft_message: z.string().max(5000).optional(),
          channel: z.string().max(60).optional(),
          next_action: z.string().max(1000).optional(),
          intent_strength: z.number().int().min(0).max(100).optional(),
          creator_fit: z.number().int().min(0).max(100).optional(),
          reason: z.string().max(3000).optional(),
          source_quote: z.string().max(5000).optional(),
          budget_min: z.number().min(0).optional(),
          budget_max: z.number().min(0).optional(),
          budget_currency: z.string().max(8).optional(),
          intent_tags: z.array(z.string().max(80)).max(20).optional(),
          constraints: z.record(z.unknown()).optional(),
          personalization_context: z.string().max(5000).optional(),
        },
        async ({ external_key, ...patch }) => {
          const clean = Object.fromEntries(Object.entries(patch).filter(([,value]) => value !== undefined));
          if (Array.isArray(clean.matched_products)) clean.matched_products = normalizeGrowthProducts(clean.matched_products);
          const rows = await dbRows(`ynot_growth_opportunities?external_key=eq.${encodeURIComponent(external_key)}`, {
            method: "PATCH",
            body: JSON.stringify({...clean, updated_at: new Date().toISOString()}),
          });
          const opportunity = rows[0] || null;
          if (opportunity?.id) {
            await dbRows("ynot_growth_activity", {
              method: "POST",
              body: JSON.stringify({
                opportunity_id: opportunity.id,
                event_type: "updated",
                actor: clean.owner || "RADAR",
                detail: { fields: Object.keys(clean), origin: "ynot-mcp" },
              }),
            });
          }
          return text({ updated: Boolean(opportunity), contact_sent: false, approval_required: true, opportunity });
        }
      );

      server.tool(
        "get_growth_queue",
        "Read the private YNOT Growth opportunity queue. Use it to avoid duplicates and continue work already discovered by RADAR, STORE or ARROW.",
        {
          kind: z.enum(["intent","creator","ugc","affiliate"]).optional(),
          status: z.enum(["new","qualified","ready","contacted","replied","won","lost","dismissed"]).optional(),
          owner: z.enum(["RADAR","STORE","ARROW"]).optional(),
          limit: z.number().int().min(1).max(100).default(30),
        },
        async ({ kind, status, owner, limit }) => {
          let path = "ynot_growth_opportunities?select=*&order=updated_at.desc";
          if (kind) path += `&kind=eq.${kind}`;
          if (status) path += `&status=eq.${status}`;
          if (owner) path += `&owner=eq.${owner}`;
          path += `&limit=${limit}`;
          return text({ opportunities: await dbRows(path) });
        }
      );

      server.tool(
        "match_growth_products",
        "Search the full canonical YNOT catalogue for one Growth opportunity, hard-filter stated constraints, rank 2-5 products, attach YNOT popup-card links and save roles such as best, value and stretch. This invalidates any old draft so ARROW can rewrite it around the new matches.",
        {
          external_key: z.string().min(3).max(500),
          limit: z.number().int().min(2).max(5).default(3),
          save: z.boolean().default(true),
        },
        async ({ external_key, limit, save }) => {
          const result: any = await matchGrowthProducts(external_key, limit);
          if (result.error) return text(result);
          if (!save) return text({ saved: false, scanned: result.scanned, opportunity: result.opportunity, products: result.products });

          const matchedIds = result.products.map((p: any) => p.id);
          const updated = await dbRows(`ynot_growth_opportunities?external_key=eq.${encodeURIComponent(external_key)}`, {
            method: "PATCH",
            body: JSON.stringify({
              matched_product_ids: matchedIds,
              matched_products: result.products,
              owner: "STORE",
              status: "qualified",
              outreach_approved: false,
              draft_message: null,
              next_action: "ARROW: write a fresh tailored response using the selected YNOT product matches and the saved source context.",
              updated_at: new Date().toISOString(),
            }),
          });
          const opportunity = updated?.[0] || result.opportunity;
          if (opportunity?.id) {
            await dbRows("ynot_growth_activity", {
              method: "POST",
              body: JSON.stringify({
                opportunity_id: opportunity.id,
                event_type: "products_rematched",
                actor: "STORE",
                detail: { product_ids: matchedIds, scanned: result.scanned, roles: result.products.map((p: any)=>({id:p.id,role:p.match_role,score:p.match_score})) },
              }),
            });
          }
          return text({ saved: true, scanned: result.scanned, opportunity, products: result.products });
        }
      );

      server.tool(
        "save_growth_trend",
        "Create or update a YNOT product/category trend with evidence and catalogue matches. This is research storage only.",
        {
          external_key: z.string().min(3).max(500),
          name: z.string().min(2).max(300),
          platform: z.string().max(80).optional(),
          niche: z.string().max(200).optional(),
          audience: z.string().max(1000).optional(),
          lifecycle: z.enum(["early","growing","saturated","declining"]).optional(),
          velocity_score: z.number().int().min(0).max(100).optional(),
          evidence: z.array(z.record(z.unknown())).max(50).default([]),
          matched_product_ids: z.array(z.string().max(300)).max(30).default([]),
          matched_products: z.array(z.record(z.unknown())).max(30).default([]),
          recommendation: z.string().max(3000).optional(),
          metadata: z.record(z.unknown()).optional(),
        },
        async (input) => {
          const rows = await dbRows("ynot_growth_trends?on_conflict=external_key", {
            method: "POST",
            headers: { Prefer: "resolution=merge-duplicates,return=representation" },
            body: JSON.stringify({...input, metadata: {...(input.metadata || {}), origin: "ynot-mcp"}, updated_at: new Date().toISOString()}),
          });
          return text({ saved: true, trend: rows[0] || null });
        }
      );

      server.tool(
        "save_catalogue_gap",
        "Save a demand-backed catalogue gap for STORE to research or source. This does not purchase inventory or contact suppliers.",
        {
          external_key: z.string().min(3).max(500),
          niche: z.string().min(2).max(300),
          demand_signal: z.string().max(3000).optional(),
          reason: z.string().max(3000).optional(),
          priority_score: z.number().int().min(0).max(100).optional(),
          source_refs: z.array(z.record(z.unknown())).max(50).default([]),
          metadata: z.record(z.unknown()).optional(),
        },
        async (input) => {
          const rows = await dbRows("ynot_growth_catalog_gaps?on_conflict=external_key", {
            method: "POST",
            headers: { Prefer: "resolution=merge-duplicates,return=representation" },
            body: JSON.stringify({...input, owner: "STORE", metadata: {...(input.metadata || {}), origin: "ynot-mcp"}, updated_at: new Date().toISOString()}),
          });
          return text({ saved: true, gap: rows[0] || null });
        }
      );


      server.tool(
        "threads_get_profile",
        "Read the connected YNOT Threads profile. No posting or modification occurs.",
        {},
        async () => text(await getThreadsProfile())
      );

      server.tool(
        "threads_list_recent",
        "Read recent posts from the connected YNOT Threads account.",
        { limit: z.number().int().min(1).max(25).default(10) },
        async ({ limit }) => text(await listRecentThreads(limit))
      );

      server.tool(
        "threads_list_replies",
        "Read replies to a specific YNOT Threads post.",
        {
          thread_id: z.string().min(1).max(200),
          limit: z.number().int().min(1).max(50).default(25),
        },
        async ({ thread_id, limit }) => text(await listThreadReplies(thread_id, limit))
      );

      server.tool(
        "threads_publish_text",
        "Publish a text post to the connected YNOT Threads account. This is an external public action; call it only when the user has explicitly asked to publish the supplied text.",
        {
          text: z.string().min(1).max(500),
          reply_to_id: z.string().min(1).max(200).optional(),
        },
        async ({ text: postText, reply_to_id }) =>
          text(await publishTextThread(postText, reply_to_id))
      );

      server.tool(
        "threads_publish_image",
        "Publish an image post to the connected YNOT Threads account using a public image URL. This is an external public action; call it only when the user explicitly asks to publish.",
        {
          image_url: z.string().url(),
          text: z.string().max(500).default(""),
          reply_to_id: z.string().min(1).max(200).optional(),
        },
        async ({ image_url, text: postText, reply_to_id }) =>
          text(await publishImageThread({ imageUrl: image_url, text: postText, replyToId: reply_to_id }))
      );

      server.tool(
        "threads_reply",
        "Reply publicly to a Threads post or reply from the connected YNOT account. Call only when the user explicitly asks to send the reply.",
        {
          reply_to_id: z.string().min(1).max(200),
          text: z.string().min(1).max(500),
        },
        async ({ reply_to_id, text: replyText }) =>
          text(await publishTextThread(replyText, reply_to_id))
      );

      server.tool(
        "threads_hide_reply",
        "Hide or unhide a reply on a YNOT Threads conversation. This changes public moderation state and should only be used on explicit instruction.",
        {
          reply_id: z.string().min(1).max(200),
          hide: z.boolean().default(true),
        },
        async ({ reply_id, hide }) => text(await hideThreadReply(reply_id, hide))
      );


      server.tool(
        "threads_publish_video",
        "Publish a video post to the connected YNOT Threads account from a public video URL. The tool waits for Meta to finish processing the media before publishing. This is a public external action; call only when the user explicitly asks to publish.",
        {
          video_url: z.string().url(),
          text: z.string().max(500).default(""),
          alt_text: z.string().max(1000).default(""),
          reply_to_id: z.string().min(1).max(200).optional(),
        },
        async ({ video_url, text: postText, alt_text, reply_to_id }) =>
          text(
            await publishVideoThread({
              videoUrl: video_url,
              text: postText,
              altText: alt_text,
              replyToId: reply_to_id,
            })
          )
      );

      server.tool(
        "threads_search_public",
        "Search public Threads posts by keyword or topic using the connected YNOT account permissions. Use TOP for relevance or RECENT for fresh conversations. This is read-only.",
        {
          query: z.string().min(1).max(200),
          search_type: z.enum(["TOP", "RECENT"]).default("TOP"),
          limit: z.number().int().min(1).max(50).default(25),
        },
        async ({ query, search_type, limit }) =>
          text(await searchPublicThreads({ query, searchType: search_type, limit }))
      );

      server.tool(
        "threads_list_mentions",
        "Read public Threads posts that mention the connected YNOT account. This is read-only.",
        { limit: z.number().int().min(1).max(50).default(25) },
        async ({ limit }) => text(await listThreadMentions(limit))
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
