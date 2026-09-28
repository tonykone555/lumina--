import "server-only";

const BASE_URL = "https://api.linksynergy.com";

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

function token() {
  const value = process.env.RAKUTEN_ADVERTISING_TOKEN?.trim();
  if (!value) throw new Error("RAKUTEN_ADVERTISING_TOKEN_MISSING");
  return value;
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
  return Boolean(process.env.RAKUTEN_ADVERTISING_TOKEN?.trim());
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

  const response = await fetch(`${BASE_URL}/productsearch/1.0?${params}`, {
    headers: { Authorization: `Bearer ${token()}`, Accept: "application/xml,text/xml" },
    cache: "no-store",
    signal: AbortSignal.timeout(9000),
  });
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
