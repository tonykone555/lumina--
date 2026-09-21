import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const maxDuration=300;

function supabase(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("SUPABASE_NOT_CONFIGURED");
  return{url:url.replace(/\/$/,""),key};
}

async function sb(path:string,init:RequestInit={}){
  const {url,key}=supabase();
  const res=await fetch(`${url}/rest/v1/${path}`,{
    ...init,
    headers:{
      apikey:key,
      Authorization:`Bearer ${key}`,
      "Content-Type":"application/json",
      Prefer:"return=representation",
      ...(init.headers||{})
    },
    cache:"no-store"
  });
  if(!res.ok)throw new Error(`SUPABASE_${res.status}:${await res.text()}`);
  const text=await res.text();
  return text?JSON.parse(text):[];
}

async function catalogSearch(taxonomyId:string,query:string,country:string){
  const payload={
    jsonrpc:"2.0",
    method:"tools/call",
    id:1,
    params:{
      name:"search_catalog",
      arguments:{
        meta:{"ucp-agent":{profile:"https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json"}},
        catalog:{
          query,
          filters:{
            available:true,
            ships_to:{country},
            categories:[{id:taxonomyId}]
          },
          context:{address_country:country,intent:query},
          pagination:{limit:50}
        }
      }
    }
  };
  const res=await fetch("https://catalog.shopify.com/api/ucp/mcp",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload),
    cache:"no-store",
    signal:AbortSignal.timeout(15000)
  });
  const raw:any=await res.json().catch(()=>null);
  if(!res.ok)throw new Error(`CATALOG_${res.status}`);
  const sc=raw?.result?.structuredContent||{};
  return{
    products:Array.isArray(sc.products)?sc.products:[],
    estimatedTotal:Number(sc?.pagination?.total_count??sc?.total_count??0)||0
  };
}

function merchantDomain(raw:any){
  const variants=Array.isArray(raw?.variants)?raw.variants:[];
  const url=String(raw?.url||variants[0]?.url||variants[0]?.seller?.url||"");
  try{return new URL(url).hostname.toLowerCase().replace(/^www\./,"")}catch{return""}
}
function sellerName(raw:any){
  const variants=Array.isArray(raw?.variants)?raw.variants:[];
  return String(variants[0]?.seller?.name||raw?.seller?.name||raw?.brand||raw?.vendor||"").trim();
}
function brandName(raw:any){
  return String(raw?.brand||raw?.vendor||raw?.manufacturer||sellerName(raw)||"").trim();
}
function priceOf(raw:any){
  const variants=Array.isArray(raw?.variants)?raw.variants:[];
  const price=raw?.price_range?.min||variants[0]?.price;
  const amount=Number(price?.amount);
  if(!Number.isFinite(amount))return null;
  return{amount:amount/100,currency:String(price?.currency||"")};
}

export async function POST(req:NextRequest){
  const secret=process.env.YNOT_ADMIN_SECRET;
  const provided=req.headers.get("x-ynot-admin-secret");
  if(secret&&provided!==secret)return NextResponse.json({error:"UNAUTHORIZED"},{status:401});

  const body=await req.json().catch(()=>({}));
  const limit=Math.max(1,Math.min(50,Number(body?.limit||20)));
  const country=String(body?.country||"US").toUpperCase();

  const queue=await sb(
    `ynot_product_research_queue?status=eq.pending&select=*&order=priority.desc,updated_at.asc&limit=${limit}`
  );
  const results:any[]=[];

  for(const item of queue){
    try{
      const found=await catalogSearch(item.taxonomy_id,item.object_name,country);
      const merchants=[...new Set(found.products.map(merchantDomain).filter(Boolean))].slice(0,25);
      const brands=[...new Set(found.products.map(brandName).filter(Boolean))].slice(0,25);
      const prices=found.products.map(priceOf).filter(Boolean) as Array<{amount:number;currency:string}>;
      const currency=prices.find(x=>x.currency)?.currency||null;
      const minPrice=prices.length?Math.min(...prices.map(x=>x.amount)):null;
      const maxPrice=prices.length?Math.max(...prices.map(x=>x.amount)):null;
      const status=found.products.length?"validated":"no_sample";

      await sb(`ynot_product_research_queue?taxonomy_id=eq.${encodeURIComponent(item.taxonomy_id)}`,{
        method:"PATCH",
        body:JSON.stringify({
          status,
          estimated_total:found.estimatedTotal||null,
          sample_product_count:found.products.length,
          sample_merchant_count:merchants.length,
          sample_brands:brands,
          sample_merchants:merchants,
          min_price:minPrice,
          max_price:maxPrice,
          currency,
          last_error:null,
          last_researched_at:new Date().toISOString(),
          updated_at:new Date().toISOString()
        })
      });
      results.push({taxonomyId:item.taxonomy_id,object:item.object_name,status,products:found.products.length,merchants:merchants.length,estimatedTotal:found.estimatedTotal||null});
    }catch(error){
      await sb(`ynot_product_research_queue?taxonomy_id=eq.${encodeURIComponent(item.taxonomy_id)}`,{
        method:"PATCH",
        body:JSON.stringify({
          status:"retry",
          last_error:String(error).slice(0,500),
          last_researched_at:new Date().toISOString(),
          updated_at:new Date().toISOString()
        })
      }).catch(()=>{});
      results.push({taxonomyId:item.taxonomy_id,object:item.object_name,status:"retry"});
    }
  }

  return NextResponse.json({
    ok:true,
    country,
    processed:results.length,
    validated:results.filter(x=>x.status==="validated").length,
    results
  });
}
