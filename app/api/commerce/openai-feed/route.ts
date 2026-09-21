import {NextRequest,NextResponse} from "next/server";
import {buildCatalogFeed,type FeedCategory,type FeedCountry} from "@/lib/commerce/catalog-feed";
import {listSelectedCommerceProducts,persistCatalogProducts} from "@/lib/commerce/catalog-store";

export const runtime="nodejs";
export const maxDuration=60;

type BuildCategory=Exclude<FeedCategory,"general">;
const COUNTRIES=new Set<FeedCountry>(["FR","DE","ES","IT","NL","BE","GB","US","CA","AU"]);
const CATEGORIES=new Set<BuildCategory>(["home","fashion","beauty","health","tech","fitness","sports","music","gaming","photography","kitchen","cleaning","appliances","pets","office","travel","outdoors","garden","tools","automotive","baby","crafts","gifts"]);

function csvEscape(value:unknown){
  const s=String(value??"");
  return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
}
function list<T extends string>(raw:string|null,allowed:Set<T>):T[]{
  if(!raw)return[];
  return raw.split(",").map(x=>x.trim() as T).filter(x=>allowed.has(x));
}
function appUrl(req:NextRequest){
  const raw=process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.NEXT_PUBLIC_APP_URL||req.nextUrl.origin;
  return (/^https?:\/\//i.test(raw)?raw:"https://"+raw).replace(/\/$/,"");
}
function productUrl(base:string,p:any){
  return base+"/p/"+encodeURIComponent(p.ynot_id)+"?country="+encodeURIComponent(p.country)+"&category="+encodeURIComponent(p.category)+"&src=chatgpt";
}

export async function GET(req:NextRequest){
  const countries=list(req.nextUrl.searchParams.get("countries"),COUNTRIES);
  const categories=list(req.nextUrl.searchParams.get("categories"),CATEGORIES);
  const refresh=req.nextUrl.searchParams.get("refresh")==="1";

  if(refresh){
    const fresh=await buildCatalogFeed({
      countries:countries.length?countries:["FR"],
      categories:categories.length?categories:[...CATEGORIES],
      perCategory:Math.max(50,Math.min(1000,Number(req.nextUrl.searchParams.get("per_category")||400))),
      adEligibleOnly:true,
      concurrency:6
    });
    try{await persistCatalogProducts(fresh)}
    catch(error){console.error("YNOT feed refresh persistence failed",error)}
  }

  let products=await listSelectedCommerceProducts(10000);
  if(countries.length)products=products.filter((p:any)=>countries.includes(p.country));
  if(categories.length)products=products.filter((p:any)=>categories.includes(p.category));

  const base=appUrl(req);
  const headers=[
    "item_id","title","description","url","brand","seller_name","marketplace_seller",
    "image_url","additional_image_urls","price","availability","condition","product_category",
    "is_ads_eligible","is_eligible_search","is_eligible_checkout","ads_metadata"
  ];

  const rows=products.map((p:any)=>{
    const attrs=p.normalized_attributes||{};
    const metadata={
      category:p.category,
      country:p.country,
      quality_score:String(p.quality_score||0),
      commerce_status:p.commerce_status,
      price_tier:p.price_position||"catalog",
      supplier_count:String(p.supplier_offer_count||1),
      routing_score:String(Math.round(Number(p.routing_score||0))),
      intent:(p.search_terms||p.intent_tags||[]).slice(0,8).join("|"),
      color:attrs.color||"",
      material:attrs.material||"",
      audience:attrs.audience||""
    };
    const images=Array.isArray(p.image_urls)?p.image_urls:[];
    return[
      p.ynot_id,
      String(p.cleaned_title||p.title||"").slice(0,150),
      String(p.enriched_description||p.title||"").slice(0,5000),
      productUrl(base,p),
      String(p.source_brand||p.brand||"YNOT").slice(0,70),
      "YNOT",
      "YNOT",
      p.image_url||"",
      images.slice(1,10).join(","),
      Number(p.ynot_price||0).toFixed(2)+" "+p.currency,
      "in_stock",
      "new",
      p.category_path||p.category,
      "true",
      "true",
      "false",
      JSON.stringify(metadata)
    ].map(csvEscape).join(",");
  });

  return new NextResponse([headers.join(","),...rows].join("\n"),{
    headers:{
      "Content-Type":"text/csv; charset=utf-8",
      "Content-Disposition":"inline; filename=ynot-openai-product-feed.csv",
      "Cache-Control":"s-maxage=300, stale-while-revalidate=1800",
      "X-YNOT-Product-Count":String(products.length),
      "X-YNOT-Feed-State":"commerce-ready-only"
    }
  });
}
