import { NextRequest, NextResponse } from "next/server";

const AMAZON_DOMAINS: Record<string, string> = {
  US: "amazon.com",
  GB: "amazon.co.uk",
  UK: "amazon.co.uk",
  FR: "amazon.fr",
  DE: "amazon.de",
  ES: "amazon.es",
  IT: "amazon.it",
  CA: "amazon.ca",
  AU: "amazon.com.au",
  NL: "amazon.nl",
  SE: "amazon.se",
  PL: "amazon.pl",
  BE: "amazon.com.be",
};

function normalizePrice(result: any) {
  const raw = result?.price?.value ?? result?.price?.raw ?? result?.prices?.[0]?.value ?? null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[^0-9,.-]/g, "").replace(",", ".");
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeCurrency(result: any, domain: string) {
  return result?.price?.currency || result?.currency || (
    domain === "amazon.co.uk" ? "GBP" :
    domain === "amazon.com" ? "USD" :
    domain === "amazon.ca" ? "CAD" :
    domain === "amazon.com.au" ? "AUD" : "EUR"
  );
}

function normalizeImage(result: any) {
  return result?.image || result?.main_image?.link || result?.images?.[0]?.link || result?.thumbnail || "";
}

function normalizeUrl(result: any, domain: string) {
  return result?.link || result?.url || (result?.asin ? `https://${domain}/dp/${result.asin}` : "#");
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.RAINFOREST_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      source: "amazon-rainforest-disabled",
      enabled: false,
      products: [],
      message: "Set RAINFOREST_API_KEY to enable Amazon results.",
    });
  }

  const search = req.nextUrl.searchParams;
  const q = (search.get("q") || "popular products").slice(0, 300);
  const direction = (search.get("direction") || "").slice(0, 120);
  const country = (search.get("country") || "FR").toUpperCase().slice(0, 2);
  const domain = AMAZON_DOMAINS[country] || "amazon.com";
  const query = direction ? `${q}, ${direction}` : q;
  const page = Math.max(1, Number.parseInt(search.get("page") || "1", 10) || 1);

  const params = new URLSearchParams({
    api_key: apiKey,
    type: "search",
    amazon_domain: domain,
    search_term: query,
    number_of_results: "12",
    exclude_sponsored: "true",
    page: String(page),
  });

  try {
    const response = await fetch(`https://api.rainforestapi.com/request?${params.toString()}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!response.ok) throw new Error(`Rainforest ${response.status}`);
    const data: any = await response.json();
    const results = Array.isArray(data?.search_results) ? data.search_results : [];

    const products = results
      .filter((r: any) => r?.asin && normalizeImage(r))
      .map((r: any) => ({
        id: `amazon-${r.asin}`,
        title: r.title || "Amazon product",
        brand: r.brand || r?.manufacturer || "Amazon",
        price: normalizePrice(r),
        currency: normalizeCurrency(r, domain),
        image: normalizeImage(r),
        url: normalizeUrl(r, domain),
        tags: [
          "Amazon",
          ...(r?.is_prime ? ["Prime"] : []),
          ...(typeof r?.rating === "number" ? [`${r.rating}★`] : []),
          ...(r?.categories || []).map((c: any) => typeof c === "string" ? c : c?.name).filter(Boolean),
        ].slice(0, 6),
        source: "amazon-rainforest",
        asin: r.asin,
        rating: r.rating ?? null,
        ratings_total: r.ratings_total ?? null,
      }));

    return NextResponse.json({
      source: "amazon-rainforest",
      enabled: true,
      query,
      domain,
      products,
      pagination: data?.pagination || {},
    }, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    return NextResponse.json({
      source: "amazon-rainforest-error",
      enabled: true,
      query,
      domain,
      products: [],
      error: error instanceof Error ? error.message : "Amazon search unavailable",
    }, { status: 200 });
  }
}
