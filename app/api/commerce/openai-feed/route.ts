import { NextRequest, NextResponse } from "next/server";
import { buildCatalogFeed, type FeedCategory, type FeedCountry } from "@/lib/commerce/catalog-feed";
import { persistCatalogProducts } from "@/lib/commerce/catalog-store";

export const runtime="nodejs";
export const maxDuration=60;

type BuildCategory=Exclude<FeedCategory,"general">;
const COUNTRIES=new Set<FeedCountry>(["FR","DE","ES","IT","NL","BE","GB","US","CA","AU"]);
const CATEGORIES=new Set<BuildCategory>([
  "home","fashion","beauty","tech","fitness","kitchen","pets","office","travel","outdoors","gifts"
]);

function csvEscape(value:unknown){
  const s=String(value??"");
  return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
}
function list<T extends string>(raw:string|null,allowed:Set<T>):T[]{
  if(!raw)return[];
  return raw.split(",").map(x=>x.trim() as T).filter(x=>allowed.has(x));
}
function appUrl(req:NextRequest){
  const raw=process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.NEXT_PUBLIC_APP_URL||req.nextUrl.origin;
  const url=/^https?:\/\//i.test(raw)?raw:`https://${raw}`;
  return url.replace(/\/$/,"");
}
function productUrl(base:string,p:{ynotId:string;country:string;category:string}){
  return `${base}/p/${encodeURIComponent(p.ynotId)}?country=${encodeURIComponent(p.country)}&category=${encodeURIComponent(p.category)}&src=chatgpt`;
}
function description(p:{title:string;category:string;country:string;pricePosition?:string;intentTags:string[]}){
  const tier=p.pricePosition? ` ${p.pricePosition} option.`:"";
  const tags=p.intentTags.slice(0,4).join(", ");
  return `${p.title} available from YNOT for shoppers in ${p.country}.${tier}${tags?` Useful for ${tags}.`:""}`.slice(0,5000);
}
function categoryPath(category:string){
  const map:Record<string,string>={
    fashion:"Apparel & Accessories",
    beauty:"Health & Beauty",
    tech:"Electronics",
    fitness:"Sporting Goods",
    home:"Home & Garden",
    kitchen:"Home & Garden > Kitchen & Dining",
    pets:"Animals & Pet Supplies",
    office:"Office Supplies",
    travel:"Luggage & Bags",
    outdoors:"Sporting Goods > Outdoor Recreation",
    gifts:"Arts & Entertainment > Party & Celebration"
  };
  return map[category]||category;
}

export async function GET(req:NextRequest){
  const countries=list(req.nextUrl.searchParams.get("countries"),COUNTRIES);
  const categories=list(req.nextUrl.searchParams.get("categories"),CATEGORIES);
  const perCategory=Math.max(20,Math.min(250,Number(req.nextUrl.searchParams.get("per_category")||100)));
  const persist=req.nextUrl.searchParams.get("persist")!=="0";
  const selectedCountries=countries.length?countries:["FR"];
  const selectedCategories=categories.length?categories:[...CATEGORIES];

  const products=await buildCatalogFeed({
    countries:selectedCountries,
    categories:selectedCategories,
    perCategory,
    adEligibleOnly:true,
    concurrency:6
  });

  if(persist){
    try{await persistCatalogProducts(products)}
    catch(error){console.error("YNOT feed persistence failed",error)}
  }

  const base=appUrl(req);
  const headers=[
    "item_id","title","description","url","brand","seller_name","marketplace_seller",
    "image_url","additional_image_urls","price","availability","condition","product_category",
    "is_ads_eligible","is_eligible_search","is_eligible_checkout","ads_metadata"
  ];

  const rows=products.map(p=>{
    const metadata={
      category:p.category,
      country:p.country,
      price_tier:p.pricePosition||"catalog",
      margin_tier:p.marginPct>=25?"high":p.marginPct>=18?"medium":"base",
      supplier_count:String(p.supplierOfferCount),
      ynot_score:String(Math.round(p.routingScore)),
      intent:p.intentTags.slice(0,4).join("|")
    };
    return[
      p.ynotId,
      p.title.slice(0,150),
      description(p),
      productUrl(base,p),
      (p.sourceBrand||p.brand||"YNOT").slice(0,70),
      "YNOT",
      "YNOT",
      p.image,
      p.images.slice(1,10).join(","),
      `${p.ynotPrice.toFixed(2)} ${p.sourceCurrency}`,
      "in_stock",
      "new",
      categoryPath(p.category),
      "true",
      "false",
      "false",
      JSON.stringify(metadata)
    ].map(csvEscape).join(",");
  });

  return new NextResponse([headers.join(","),...rows].join("\n"),{
    headers:{
      "Content-Type":"text/csv; charset=utf-8",
      "Content-Disposition":"inline; filename=ynot-openai-product-feed.csv",
      "Cache-Control":"s-maxage=300, stale-while-revalidate=1800",
      "X-YNOT-Product-Count":String(products.length)
    }
  });
}
