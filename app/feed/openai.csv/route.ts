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
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
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

function adsItemId(ynotId: string) {
  return String(ynotId || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 100);
}

function isSupportedImage(url: string) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return /\.(?:jpe?g|png)$/.test(pathname);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const sourceProducts = await listCatalogProducts(10000);
  const base = appUrl(req);

  // Keep the Ads feed deliberately strict: required OpenAI Ads fields plus a
  // small set of useful optional fields. Invalid image formats are excluded so
  // one malformed asset cannot poison hosted/SFTP validation.
  const products = sourceProducts.filter((p: any) => {
    return (
      p?.ynot_id &&
      p?.title &&
      p?.ynot_price > 0 &&
      p?.currency &&
      p?.image_url &&
      isSupportedImage(String(p.image_url))
    );
  });

  const headers = [
    "item_id",
    "title",
    "description",
    "url",
    "brand",
    "seller_name",
    "image_url",
    "price",
    "availability",
    "condition",
    "product_category",
    "is_ads_eligible",
    "ads_metadata",
  ];

  const rows = products.map((p: any) => {
    const metadata = {
      category: String(p.category || ""),
      country: String(p.country || ""),
      price_tier: String(p.price_position || "catalog"),
      margin_tier:
        Number(p.margin_pct || 0) >= 25
          ? "high"
          : Number(p.margin_pct || 0) >= 18
            ? "medium"
            : "base",
    };

    const description = `${p.title} available from YNOT for shoppers in ${p.country}.${
      p.price_position ? ` ${p.price_position} option.` : ""
    }${
      Array.isArray(p.intent_tags) && p.intent_tags.length
        ? ` Useful for ${p.intent_tags.slice(0, 4).join(", ")}.`
        : ""
    }`.slice(0, 5000);

    return [
      adsItemId(p.ynot_id),
      String(p.title).slice(0, 150),
      description,
      `${base}/p/${encodeURIComponent(p.ynot_id)}?country=${encodeURIComponent(
        p.country
      )}&category=${encodeURIComponent(p.category)}&src=chatgpt`,
      String(p.source_brand || p.brand || "YNOT").slice(0, 70),
      "YNOT",
      String(p.image_url),
      `${Number(p.ynot_price).toFixed(2)} ${String(p.currency).toUpperCase()}`,
      "in_stock",
      "new",
      categoryPath(String(p.category || "")),
      "true",
      JSON.stringify(metadata),
    ]
      .map(csvEscape)
      .join(",");
  });

  return new NextResponse([headers.join(","), ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=ynot-openai-product-feed.csv",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      "X-YNOT-Product-Count": String(products.length),
      "X-YNOT-Source-Product-Count": String(sourceProducts.length),
    },
  });
}
