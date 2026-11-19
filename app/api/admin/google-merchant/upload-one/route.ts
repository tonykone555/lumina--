import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { googleMerchantAccessToken } from "../../../../../lib/google-merchant-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Manual single-product upload only. Never auto-submit catalog rows without verified inventory.
function authorised(req: NextRequest) {
  const expected = process.env.GOOGLE_MERCHANT_DIAGNOSTICS_TOKEN;
  const received = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Review = {
  offerId?: string; title?: string; description?: string; link?: string; imageLink?: string;
  price?: number; currency?: string; country?: string; language?: string;
  brand?: string; availability?: string; condition?: string;
  inventoryVerifiedAt?: string; purchasePageVerifiedAt?: string;
  shippingVerifiedAt?: string; supplierAuthorized?: boolean;
};

function validHttps(value: string) {
  try { const u = new URL(value); return u.protocol === "https:" && !!u.hostname; } catch { return false; }
}

function validate(x: Review) {
  const errors: string[] = [];
  if (!x.offerId || !/^[A-Za-z0-9._-]{1,80}$/.test(x.offerId)) errors.push("valid offerId required");
  if (!x.title || x.title.trim().length < 5 || x.title.length > 150) errors.push("title required (5-150 characters)");
  if (!x.description || x.description.trim().length < 15) errors.push("description required");
  if (!x.link || !validHttps(x.link) || new URL(x.link).hostname !== "ynotworld.app") errors.push("verified YNOT product page URL required");
  if (!x.imageLink || !validHttps(x.imageLink)) errors.push("image URL required");
  if (!Number.isFinite(x.price) || Number(x.price) <= 0) errors.push("valid positive price required");
  if (!x.currency || !/^[A-Z]{3}$/.test(x.currency)) errors.push("currency required");
  if (!x.country || !/^[A-Z]{2}$/.test(x.country)) errors.push("country required");
  if (!x.language || !/^[a-z]{2}$/.test(x.language)) errors.push("language required");
  if (!["IN_STOCK", "OUT_OF_STOCK", "PREORDER", "BACKORDER"].includes(x.availability || "")) errors.push("verified availability required");
  if (!["NEW", "USED", "REFURBISHED"].includes(x.condition || "")) errors.push("verified condition required");
  const recent = (s?: string) => {
    if (!s) return false;
    const d = Date.parse(s);
    return Number.isFinite(d) && d <= Date.now() && d > Date.now() - 86400000;
  };
  if (!recent(x.inventoryVerifiedAt)) errors.push("inventory verification within last 24h required");
  if (!recent(x.purchasePageVerifiedAt)) errors.push("working checkout verification within last 24h required");
  if (!recent(x.shippingVerifiedAt)) errors.push("shipping verification within last 24h required");
  if (x.supplierAuthorized !== true) errors.push("supplier authorization must be confirmed");
  return errors;
}

export async function POST(req: NextRequest) {
  if (!authorised(req)) return new NextResponse(null, { status: 404 });
  let value: Review;
  try { value = await req.json() as Review; } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const errors = validate(value);
  if (errors.length) return NextResponse.json({ submitted: false, errors }, { status: 422 });
  const account = process.env.GOOGLE_MERCHANT_ACCOUNT_ID;
  const source = process.env.GOOGLE_MERCHANT_DATA_SOURCE_ID;
  if (!account || !/^\d+$/.test(account) || !source || !/^\d+$/.test(source)) {
    return NextResponse.json({ submitted: false, error: "Merchant account or source not configured" }, { status: 503 });
  }
  const priceMicros = Math.round(Number(value.price) * 1_000_000);
  const input = {
    offerId: value.offerId,
    contentLanguage: value.language,
    feedLabel: value.country,
    productAttributes: {
      title: value.title,
      description: value.description,
      link: value.link,
      imageLink: value.imageLink,
      availability: value.availability,
      condition: value.condition,
      price: { amountMicros: String(priceMicros), currencyCode: value.currency },
      ...(value.brand ? { brand: value.brand } : {}),
    },
  };
  // Dry-run must be the default: an operator must explicitly opt in to write.
  if (req.nextUrl.searchParams.get("commit") !== "true") {
    return NextResponse.json({ submitted: false, dryRun: true, dataSource: source, offerId: value.offerId, payload: input });
  }
  try {
    const token = await googleMerchantAccessToken();
    const url = new URL("https://merchantapi.googleapis.com/products/v1/accounts/" + account + "/productInputs:insert");
    url.searchParams.set("dataSource", "accounts/" + account + "/dataSources/" + source);
    const response = await fetch(url, {
      method: "POST",
      headers: { authorization: "Bearer " + token, "content-type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return NextResponse.json({ submitted: false, googleStatus: response.status, error: "Google rejected product input; inspect server logs for policy details" }, { status: 502 });
    const result = await response.json() as { name?: string; product?: string; offerId?: string };
    return NextResponse.json({ submitted: true, dataSource: source, productInput: result.name, product: result.product, offerId: result.offerId });
  } catch {
    return NextResponse.json({ submitted: false, error: "Merchant API connection or submission failed" }, { status: 502 });
  }
}
