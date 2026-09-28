import "server-only";

const BASE_URL = "https://api.linksynergy.com";
const RAKUTEN_ACCOUNT_ID = process.env.RAKUTEN_ACCOUNT_ID?.trim() || "4756570";

export type RakutenProduct = {
  id: string;
  source: "rakuten";
  title: string;
  description?: string;
  image?: string;
  images: string[];
  price?: number;
  salePrice?: number;
  currency?: string;
  url?: string;
  sku?: string;
  upc?: string;
  category?: string;
  subcategory?: string;
  merchantId?: string;
  merchantName?: string;
  affiliate: true;
};

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  token_type?: string;
};

let cachedToken: { accessToken: string; refreshToken?: string; expiresAt: number } | null = null;
let tokenPromise: Promise<string> | null = null;

function clientCredentials() {
  const clientId = process.env.RAKUTEN_CLIENT_ID?.trim();
  const clientSecret = process.env.RAKUTEN_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function tokenKey() {
  const credentials = clientCredentials();
  if (!credentials) throw new Error("RAKUTEN_CLIENT_CREDENTIALS_MISSING");
  return Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`, "utf8").toString("base64");
}

async function requestAccessToken(refreshToken?: string): Promise<string> {
  const body = new URLSearchParams({ scope: RAKUTEN_ACCOUNT_ID });
  if (refreshToken) body.set("refresh_token", refreshToken);

  const response = await fetch(`${BASE_URL}/token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(9000),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`RAKUTEN_TOKEN_${response.status}:${raw.replace(/\s+/g, " ").trim().slice(0, 300)}`);
  }

  let payload: TokenResponse;
  try {
    payload = JSON.parse(raw) as TokenResponse;
  } catch {
    throw new Error("RAKUTEN_TOKEN_INVALID_RESPONSE");
  }
  if (!payload.access_token) throw new Error("RAKUTEN_TOKEN_ACCESS_TOKEN_MISSING");

  const ttl = Math.max(60, Number(payload.expires_in) || 3600);
  cachedToken = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || refreshToken,
    expiresAt: Date.now() + ttl * 1000,
  };
  return cachedToken.accessToken;
}

async function accessToken(forceRefresh = false): Promise<string> {
  // Prefer the durable client-credential flow whenever configured.
  if (clientCredentials()) {
    if (!forceRefresh && cachedToken && cachedToken.expiresAt - Date.now() > 60_000) {
      return cachedToken.accessToken;
    }
    if (!tokenPromise) {
      const refresh = cachedToken?.refreshToken;
      tokenPromise = requestAccessToken(refresh).finally(() => {
        tokenPromise = null;
      });
    }
    return tokenPromise;
  }

  // Backwards-compatible fallback for a manually generated 60-minute token.
  const manual = process.env.RAKUTEN_ADVERTISING_TOKEN?.trim();
  if (!manual) throw new Error("RAKUTEN_AUTH_MISSING");
  return manual;
}

function decodeXml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

function field(xml: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? decodeXml(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")) : "";
}

function money(xml: string, name: string) {
  const match = xml.match(new RegExp(`<${name}\\s+currency=["']([^"']+)["'][^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  if (!match) return {};
  const amount = Number(decodeXml(match[2]));
  return { currency: match[1], amount: Number.isFinite(amount) ? amount : undefined };
}

export function rakutenConfigured() {
  return Boolean(clientCredentials() || process.env.RAKUTEN_ADVERTISING_TOKEN?.trim());
}

export async function searchRakutenProducts(query: string, options: { max?: number; page?: number; language?: string; mid?: string } = {}) {
  const clean = query.replace(/[&=?{}\\()[\]\-;~|$!><*%]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return { products: [] as RakutenProduct[], totalMatches: 0, totalPages: 0, page: 1 };

  const params = new URLSearchParams({
    keyword: clean,
    max: String(Math.min(100, Math.max(1, options.max ?? 40))),
    pagenumber: String(Math.max(1, options.page ?? 1)),
  });
  if (options.language) params.set("language", options.language);
  if (options.mid) params.set("mid", options.mid);

  const runSearch = async (bearer: string) => {
    return fetch(`${BASE_URL}/productsearch/1.0?${params}`, {
      headers: { Authorization: `Bearer ${bearer}`, Accept: "application/xml,text/xml" },
      cache: "no-store",
      signal: AbortSignal.timeout(9000),
    });
  };

  let response = await runSearch(await accessToken());
  if (response.status === 401 && clientCredentials()) {
    cachedToken = null;
    response = await runSearch(await accessToken(true));
  }

  const xml = await response.text();
  if (!response.ok) throw new Error(`RAKUTEN_PRODUCT_SEARCH_${response.status}:${xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 240)}`);

  const products: RakutenProduct[] = [];
  const blocks = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? [];
  for (const item of blocks) {
    const retail = money(item, "price");
    const sale = money(item, "saleprice");
    const title = field(item, "productname");
    if (!title) continue;
    const image = field(item, "imageurl");
    const merchantId = field(item, "mid");
    const sku = field(item, "sku");
    products.push({
      id: `rakuten:${merchantId}:${sku || field(item, "linkid")}`,
      source: "rakuten",
      title,
      description: field(item, "long") || field(item, "short") || undefined,
      image: image || undefined,
      images: image ? [image] : [],
      price: sale.amount ?? retail.amount,
      salePrice: sale.amount,
      currency: sale.currency || retail.currency || undefined,
      url: field(item, "linkurl") || undefined,
      sku: sku || undefined,
      upc: field(item, "upccode") || undefined,
      category: field(item, "primary") || undefined,
      subcategory: field(item, "secondary") || undefined,
      merchantId: merchantId || undefined,
      merchantName: field(item, "merchantname") || undefined,
      affiliate: true,
    });
  }

  return {
    products,
    totalMatches: Number(field(xml, "TotalMatches")) || products.length,
    totalPages: Number(field(xml, "TotalPages")) || 0,
    page: Number(field(xml, "PageNumber")) || options.page || 1,
  };
}
