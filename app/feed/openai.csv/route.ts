import { NextRequest, NextResponse } from "next/server";
import { listCatalogProducts } from "@/lib/commerce/catalog-store";

export const runtime = "nodejs";
export const maxDuration = 20;

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function appUrl(req: NextRequest) {
  const raw =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    req.nextUrl.origin;
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return url.replace(/\/$/, "");
}

function categoryPath(category: string) {
  const map: Record<string, string> = {
    fashion: "Apparel & Accessories",
    beauty: "Health & Beauty",
    tech: "Electronics",
    fitness: "Sporting Goods",
    home: "Home & Garden",
    kitchen: "Home & Garden > Kitchen & Dining",
    pets: "Animals & Pet Supplies",
    office: "Office Supplies",
    travel: "Luggage & Bags",
    outdoors: "Sporting Goods > Outdoor Recreation",
    gifts: "Arts & Entertainment > Party & Celebration",
  };
  return map[category] || category;
}

export async function GET(req: NextRequest) {
  const products = await listCatalogProducts(10000);
  const base = appUrl(req);

  const headers = [
    "item_id",
    "title",
    "description",
    "url",
    "brand",
    "seller_name",
    "marketplace_seller",
    "image_url",
    "additional_image_urls",
    "price",
    "availability",
    "condition",
    "product_category",
    "is_ads_eligible",
    "is_eligible_search",
    "is_eligible_checkout",
    "ads_metadata",
  ];

  const rows = products.map((p: any) => {
    const metadata = {
      category: p.category,
      country: p.country,
      price_tier: p.price_position || "catalog",
      margin_tier:
        Number(p.margin_pct || 0) >= 25
          ? "high"
          : Number(p.margin_pct || 0) >= 18
            ? "medium"
            : "base",
      supplier_count: String(p.supplier_offer_count || 1),
      ynot_score: String(Math.round(Number(p.routing_score || 0))),
      intent: Array.isArray(p.intent_tags) ? p.intent_tags.slice(0, 4).join("|") : "",
    };

    const description = `${p.title} available from YNOT for shoppers in ${p.country}.${
      p.price_position ? ` ${p.price_position} option.` : ""
    }${
      Array.isArray(p.intent_tags) && p.intent_tags.length
        ? ` Useful for ${p.intent_tags.slice(0, 4).join(", ")}.`
        : ""
    }`.slice(0, 5000);

    return [
      p.ynot_id,
      String(p.title || "").slice(0, 150),
      description,
      `${base}/p/${encodeURIComponent(p.ynot_id)}?country=${encodeURIComponent(
        p.country
      )}&category=${encodeURIComponent(p.category)}&src=chatgpt`,
      String(p.source_brand || p.brand || "YNOT").slice(0, 70),
      "YNOT",
      "YNOT",
      p.image_url || "",
      Array.isArray(p.image_urls) ? p.image_urls.slice(1, 10).join(",") : "",
      `${Number(p.ynot_price || 0).toFixed(2)} ${p.currency || "EUR"}`,
      "in_stock",
      "new",
      categoryPath(String(p.category || "")),
      "true",
      "false",
      "false",
      JSON.stringify(metadata),
    ]
      .map(csvEscape)
      .join(",");
  });

  return new NextResponse([headers.join(","), ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "inline; filename=ynot-openai-product-feed.csv",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      "X-YNOT-Product-Count": String(products.length),
    },
  });
}
