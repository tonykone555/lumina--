import { NextRequest, NextResponse } from "next/server";
import { buildCatalogFeed, type FeedCategory, type FeedCountry } from "@/lib/commerce/catalog-feed";

export const runtime="nodejs";
export const maxDuration=60;

type FeedBuildCategory=Exclude<FeedCategory,"general">;

const COUNTRIES=new Set<FeedCountry>(["FR","DE","ES","IT","NL","BE","GB","US","CA","AU"]);
const CATEGORIES=new Set<FeedBuildCategory>([
  "home","fashion","beauty","health","tech","fitness","sports","music","gaming","photography","kitchen","cleaning","appliances","pets","office","travel","outdoors","garden","tools","automotive","baby","crafts","gifts"
]);

function csvList<T extends string>(value:string|null,allowed:Set<T>):T[]{
  if(!value)return[];
  return value.split(",").map(v=>v.trim() as T).filter(v=>allowed.has(v));
}
function csvEscape(value:unknown){
  const s=String(value??"");
  return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
}

export async function GET(req:NextRequest){
  const countries=csvList(req.nextUrl.searchParams.get("countries"),COUNTRIES);
  const categories=csvList(req.nextUrl.searchParams.get("categories"),CATEGORIES);
  const perCategory=Math.max(50,Math.min(1000,Number(req.nextUrl.searchParams.get("per_category")||400)));
  const eligible=req.nextUrl.searchParams.get("eligible")!=="0";
  const format=req.nextUrl.searchParams.get("format")==="csv"?"csv":"json";

  const products=await buildCatalogFeed({
    countries:countries.length?countries:undefined,
    categories:categories.length?categories:undefined,
    perCategory,
    adEligibleOnly:eligible
  });

  if(format==="csv"){
    const headers=[
      "ynot_id","title","category","country","price_position","source_price","currency",
      "shipping_reserve","ynot_price","gross_contribution","margin_pct","routing_score",
      "supplier_offer_count","source_url","image","intent_tags"
    ];
    const body=[
      headers.join(","),
      ...products.map(p=>[
        p.ynotId,p.title,p.category,p.country,p.pricePosition||"",p.sourcePrice,p.sourceCurrency,
        p.shippingReserve,p.ynotPrice,p.grossContribution,p.marginPct,p.routingScore,
        p.supplierOfferCount,p.sourceUrl,p.image,p.intentTags.join("|")
      ].map(csvEscape).join(","))
    ].join("\n");

    return new NextResponse(body,{
      headers:{
        "Content-Type":"text/csv; charset=utf-8",
        "Content-Disposition":"inline; filename=ynot-product-feed.csv",
        "Cache-Control":"s-maxage=300, stale-while-revalidate=1800"
      }
    });
  }

  const categoryCounts=Object.fromEntries(
    [...CATEGORIES].map(category=>[category,products.filter(p=>p.category===category).length])
  );
  const countryCounts=Object.fromEntries(
    [...COUNTRIES].map(country=>[country,products.filter(p=>p.country===country).length])
  );

  return NextResponse.json({
    brand:"YNOT",
    generatedAt:new Date().toISOString(),
    count:products.length,
    eligibleOnly:eligible,
    categoryCounts,
    countryCounts,
    products
  },{
    headers:{"Cache-Control":"s-maxage=300, stale-while-revalidate=1800"}
  });
}
