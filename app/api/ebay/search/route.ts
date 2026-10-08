import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function authorized(request:NextRequest){
 const bearer=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 const mcp=process.env.YNOT_MCP_TOKEN||"";
 const dashboardPin=process.env.YNOT_EBAY_DASHBOARD_PIN||"";
 return Boolean(bearer&&((mcp&&bearer===mcp)||(dashboardPin&&bearer===dashboardPin)));
}
function appUrl(){
 return (process.env.NEXT_PUBLIC_APP_URL||process.env.APP_URL||"https://ynotworld.app").replace(/\/$/,"");
}
export async function POST(request:NextRequest){
 if(!authorized(request))return NextResponse.json({error:"unauthorized"},{status:401});
 try{
  const body=await request.json().catch(()=>({}));
  const query=String(body?.query||"").trim();
  const limit=Math.max(1,Math.min(40,Number(body?.limit||24)));
  if(!query)return NextResponse.json({error:"QUERY_REQUIRED"},{status:400});
  const url=new URL("/api/catalog",appUrl());
  url.searchParams.set("q",query);
  url.searchParams.set("country","FR");
  url.searchParams.set("source","all");
  const r=await fetch(url,{cache:"no-store"});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)return NextResponse.json({error:j?.error||`CATALOG_${r.status}`},{status:r.status});
  const products=(Array.isArray(j?.products)?j.products:[]).slice(0,limit).map((p:any)=>({
    id:p?.id||p?.ynotId||null,
    title:p?.title||"",
    brand:p?.brand||p?.sourceBrand||"",
    category:p?.category||"",
    price:p?.price??p?.ynotPrice??null,
    currency:p?.currency||p?.sourceCurrency||"EUR",
    image:p?.image||p?.images?.[0]||null,
    images:Array.isArray(p?.images)?p.images:[],
    url:p?.url||p?.merchant_url||p?.source_url||null,
    source:p?.source||j?.source||"YNOT"
  }));
  return NextResponse.json({query,source:j?.source||null,products});
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:"SEARCH_FAILED"},{status:500});
 }
}
