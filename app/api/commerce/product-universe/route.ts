import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const maxDuration=30;

function db(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("SUPABASE_NOT_CONFIGURED");
  return{url:url.replace(/\/$/,""),key};
}

async function get(path:string){
  const {url,key}=db();
  const res=await fetch(url+"/rest/v1/"+path,{
    headers:{apikey:key,Authorization:"Bearer "+key},
    cache:"no-store"
  });
  if(!res.ok)throw new Error("PRODUCT_UNIVERSE_"+res.status+":"+await res.text());
  return res.json();
}

export async function GET(req:NextRequest){
  const sp=req.nextUrl.searchParams;
  const root=String(sp.get("root")||"").trim();
  const q=String(sp.get("q")||"").trim().slice(0,120);
  const minScore=Math.max(0,Math.min(100,Number(sp.get("min_score")||0)));
  const limit=Math.max(1,Math.min(200,Number(sp.get("limit")||50)));
  const status=String(sp.get("status")||"researched");

  const filters=[
    "select=taxonomy_id,query_text,root_key,status,search_mode,sampled_products,estimated_total,merchant_count,brand_count,min_price,median_price,max_price,currencies,top_merchants,top_brands,commercial_score,supply_score,diversity_score,price_score,researched_at",
    "status=eq."+encodeURIComponent(status),
    "commercial_score=gte."+encodeURIComponent(String(minScore)),
    "order=commercial_score.desc.nullslast,supply_score.desc.nullslast",
    "limit="+limit
  ];
  if(root)filters.push("root_key=eq."+encodeURIComponent(root));
  if(q)filters.push("query_text=ilike."+encodeURIComponent("*"+q+"*"));

  const niches=await get("ynot_product_research?"+filters.join("&"));

  const summaryRows=await get(
    "ynot_product_research?select=status,root_key,commercial_score,sampled_products,merchant_count&limit=20000"
  );
  const summary={
    total:summaryRows.length,
    researched:0,pending:0,retry:0,processing:0,blocked:0,
    strong:0,
    byRoot:{} as Record<string,{total:number;researched:number;strong:number}>
  };
  for(const row of summaryRows as any[]){
    const s=String(row.status||"pending") as keyof typeof summary;
    if(typeof (summary as any)[s]==="number")(summary as any)[s]++;
    const rootKey=String(row.root_key||"other");
    const bucket=summary.byRoot[rootKey]||{total:0,researched:0,strong:0};
    bucket.total++;
    if(row.status==="researched")bucket.researched++;
    if(Number(row.commercial_score||0)>=70){bucket.strong++;summary.strong++}
    summary.byRoot[rootKey]=bucket;
  }

  return NextResponse.json({
    generatedAt:new Date().toISOString(),
    filters:{root:root||null,q:q||null,minScore,status,limit},
    summary,
    niches
  },{
    headers:{"Cache-Control":"s-maxage=60, stale-while-revalidate=300"}
  });
}
