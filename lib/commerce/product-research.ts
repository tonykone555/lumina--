type QueueItem={
  taxonomy_id:string;
  object_name:string;
  full_name:string;
  root_key:string;
  priority:number;
};

type ResearchResult={
  taxonomyId:string;
  query:string;
  estimatedTotal:number|null;
  productCount:number;
  merchantCount:number;
  brandCount:number;
  minPrice:number|null;
  medianPrice:number|null;
  maxPrice:number|null;
  currency:string|null;
  sampleBrands:string[];
  sampleMerchants:string[];
  validationScore:number;
};

function supabase(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("SUPABASE_NOT_CONFIGURED");
  return{url:url.replace(/\/$/,""),key};
}

async function sb(path:string,init:RequestInit={}){
  const {url,key}=supabase();
  const res=await fetch(url+"/rest/v1/"+path,{
    ...init,
    headers:{
      apikey:key,
      Authorization:"Bearer "+key,
      "Content-Type":"application/json",
      ...(init.headers||{})
    },
    cache:"no-store"
  });
  if(!res.ok)throw new Error("PRODUCT_RESEARCH_DB_"+res.status+":"+await res.text());
  const text=await res.text();
  return text?JSON.parse(text):[];
}

async function rpc(name:string,args:any){
  return sb("rpc/"+name,{method:"POST",body:JSON.stringify(args),headers:{Prefer:"return=representation"}});
}

function domain(raw:string){
  try{return new URL(raw).hostname.toLowerCase().replace(/^www\./,"")}catch{return""}
}
function clean(v:any){return String(v||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()}
function median(values:number[]){
  if(!values.length)return null;
  const x=[...values].sort((a,b)=>a-b),m=Math.floor(x.length/2);
  return x.length%2?x[m]:(x[m-1]+x[m])/2;
}

async function catalogSearch(item:QueueItem,country:string):Promise<ResearchResult>{
  const payload={
    jsonrpc:"2.0",
    method:"tools/call",
    id:1,
    params:{
      name:"search_catalog",
      arguments:{
        meta:{"ucp-agent":{profile:"https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json"}},
        catalog:{
          query:item.object_name,
          filters:{
            available:true,
            ships_to:{country},
            categories:[{id:item.taxonomy_id}]
          },
          context:{address_country:country,intent:item.full_name},
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
    signal:AbortSignal.timeout(20000)
  });
  const raw:any=await res.json().catch(()=>null);
  let content:any=raw?.result?.structuredContent||null;
  if(!content&&Array.isArray(raw?.result?.content)){
    for(const part of raw.result.content){
      if(part?.type!=="text"||typeof part?.text!=="string")continue;
      try{
        const parsed=JSON.parse(part.text);
        content=parsed?.structuredContent||parsed?.result?.structuredContent||parsed;
        if(content)break;
      }catch{}
    }
  }
  if(!content&&raw?.result&&typeof raw.result==="object"&&Array.isArray(raw.result.products))content=raw.result;
  const embeddedError=
    clean(raw?.error?.message)||
    clean(raw?.result?.error?.message)||
    clean(raw?.result?.message)||
    (raw?.result?.isError?clean(raw?.result?.content?.[0]?.text):"");
  if(!res.ok||!content||!Array.isArray(content?.products)){
    throw new Error("SHOPIFY_CATALOG_"+res.status+":"+(embeddedError||"unrecognized MCP response"));
  }
  const products=content.products;
  const merchants=new Set<string>(),brands=new Set<string>(),prices:number[]=[];
  let currency:string|null=null;
  for(const p of products){
    const variants=Array.isArray(p?.variants)?p.variants:[];
    const sellers=[
      p?.seller,
      ...variants.map((v:any)=>v?.seller)
    ].filter(Boolean);
    for(const s of sellers){
      const name=clean(s?.name);
      const url=clean(s?.url||s?.links?.[0]?.url);
      const merchant=domain(url)||name.toLowerCase();
      if(merchant)merchants.add(merchant);
    }
    const brand=clean(p?.brand||p?.vendor||p?.manufacturer||p?.seller?.name);
    if(brand)brands.add(brand);
    const price=p?.price_range?.min||variants.find((v:any)=>v?.price)?.price;
    const amount=Number(price?.amount);
    if(Number.isFinite(amount)&&amount>0){
      prices.push(amount/100);
      currency=currency||clean(price?.currency)||null;
    }
  }
  const estimated=Number(content?.pagination?.total_count??content?.total_count??content?.estimated_total);
  const estimatedTotal=Number.isFinite(estimated)?estimated:null;
  const supply=Math.min(40,products.length*.8);
  const merchantDepth=Math.min(25,merchants.size*2.5);
  const brandDepth=Math.min(15,brands.size*1.5);
  const scale=estimatedTotal==null?0:Math.min(20,Math.log10(Math.max(1,estimatedTotal))*6);
  const validationScore=Math.round(Math.min(100,supply+merchantDepth+brandDepth+scale)*100)/100;
  return{
    taxonomyId:item.taxonomy_id,
    query:item.object_name,
    estimatedTotal,
    productCount:products.length,
    merchantCount:merchants.size,
    brandCount:brands.size,
    minPrice:prices.length?Math.min(...prices):null,
    medianPrice:median(prices),
    maxPrice:prices.length?Math.max(...prices):null,
    currency,
    sampleBrands:[...brands].slice(0,20),
    sampleMerchants:[...merchants].slice(0,20),
    validationScore
  };
}

async function updateSuccess(item:QueueItem,result:ResearchResult,country:string){
  const now=new Date().toISOString();
  await sb("ynot_product_research_queue?taxonomy_id=eq."+encodeURIComponent(item.taxonomy_id),{
    method:"PATCH",
    headers:{Prefer:"return=minimal"},
    body:JSON.stringify({
      status:result.productCount>0?"researched":"no_supply",
      estimated_total:result.estimatedTotal,
      sample_product_count:result.productCount,
      sample_merchant_count:result.merchantCount,
      sample_brands:result.sampleBrands,
      sample_merchants:result.sampleMerchants,
      min_price:result.minPrice,
      max_price:result.maxPrice,
      currency:result.currency,
      last_error:null,
      last_researched_at:now,
      updated_at:now
    })
  });
  await sb("ynot_product_universe_validation?on_conflict=taxonomy_id,country,query_text",{
    method:"POST",
    headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
    body:JSON.stringify({
      taxonomy_id:item.taxonomy_id,
      country,
      query_text:result.query,
      estimated_results:result.estimatedTotal,
      sampled_products:result.productCount,
      sampled_merchants:result.merchantCount,
      sampled_brands:result.brandCount,
      min_price:result.minPrice,
      median_price:result.medianPrice,
      max_price:result.maxPrice,
      brand_grade_products:Math.min(result.productCount,result.brandCount*2),
      validation_score:result.validationScore,
      status:result.productCount>0?"validated":"no_supply",
      last_validated_at:now,
      metadata:{sample_brands:result.sampleBrands,sample_merchants:result.sampleMerchants,currency:result.currency}
    })
  });
}
async function updateFailure(item:QueueItem,error:any){
  const now=new Date().toISOString();
  await sb("ynot_product_research_queue?taxonomy_id=eq."+encodeURIComponent(item.taxonomy_id),{
    method:"PATCH",
    headers:{Prefer:"return=minimal"},
    body:JSON.stringify({status:"pending",last_error:String(error?.message||error).slice(0,500),updated_at:now})
  }).catch(()=>{});
}

export async function researchProductUniverse(opts:{limit?:number;country?:string}={}){
  const country=String(opts.country||"US").toUpperCase();
  const limit=Math.max(1,Math.min(25,opts.limit||8));
  const claimed=await rpc("ynot_claim_product_research_batch",{p_limit:limit}) as QueueItem[];
  const results:ResearchResult[]=[];
  for(let i=0;i<claimed.length;i+=3){
    const group=claimed.slice(i,i+3);
    const settled=await Promise.allSettled(group.map(async item=>{
      const result=await catalogSearch(item,country);
      await updateSuccess(item,result,country);
      return result;
    }));
    for(let j=0;j<settled.length;j++){
      const s=settled[j];
      if(s.status==="fulfilled")results.push(s.value);
      else await updateFailure(group[j],s.reason);
    }
  }
  return{
    country,
    claimed:claimed.length,
    completed:results.length,
    productsSampled:results.reduce((n,r)=>n+r.productCount,0),
    merchantsSampled:results.reduce((n,r)=>n+r.merchantCount,0),
    top:results.sort((a,b)=>b.validationScore-a.validationScore).slice(0,10)
  };
}
