import {NextRequest,NextResponse} from "next/server";
import {getCatalogProduct} from "@/lib/commerce/catalog-store";

export const runtime="nodejs";

const SHOPIFY_PROFILE="https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json";

function mediaUrl(m:any){
  const value=String(m?.url||m?.image?.url||m?.previewImage?.url||m?.preview_image?.url||m?.src||m?.originalSource?.url||"");
  return /^https?:\/\//i.test(value)?value:"";
}

async function liveShopifyDetail(sourceProductId:string){
  if(!sourceProductId)return null;
  try{
    const payload={
      jsonrpc:"2.0",method:"tools/call",id:1,
      params:{name:"get_product",arguments:{meta:{"ucp-agent":{profile:SHOPIFY_PROFILE}},catalog:{id:sourceProductId}}}
    };
    const response=await fetch("https://catalog.shopify.com/api/ucp/mcp",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload),
      cache:"no-store",
      signal:AbortSignal.timeout(8000)
    });
    const raw:any=await response.json();
    if(!response.ok||raw?.error)return null;
    return raw?.result?.structuredContent?.product||null;
  }catch{return null}
}

export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const product=await getCatalogProduct(id).catch(()=>null);
  if(!product||product.active===false||product.ad_eligible===false){
    return NextResponse.json({error:"Product not found"},{status:404});
  }

  let images=Array.isArray(product.image_urls)?product.image_urls.filter(Boolean):product.image_url?[product.image_url]:[];
  const detail=images.length<2?await liveShopifyDetail(String(product.source_product_id||"")):null;
  if(detail){
    const liveMedia=(Array.isArray(detail?.media)?detail.media:[]).map(mediaUrl).filter(Boolean);
    const variantMedia=(Array.isArray(detail?.variants)?detail.variants:[]).flatMap((v:any)=>[
      mediaUrl(v?.image),
      ...(Array.isArray(v?.media)?v.media.map(mediaUrl):[])
    ]).filter(Boolean);
    images=[...new Set<string>([...images,...liveMedia,...variantMedia])].slice(0,12);
  }

  const sourcePrice=Number(product.source_price);
  const storedRetail=Number(product.ynot_price);
  const safeRetail=Number.isFinite(storedRetail)&&storedRetail>0?storedRetail:
    Number.isFinite(sourcePrice)&&sourcePrice>0?sourcePrice:null;

  return NextResponse.json({
    product:{
      id:product.ynot_id,
      title:product.title,
      brand:product.brand||product.source_brand||"YNOT",
      price:safeRetail,
      retailPrice:safeRetail,
      supplierPrice:Number.isFinite(sourcePrice)&&sourcePrice>0?sourcePrice:null,
      currency:String(product.currency||"USD"),
      image:images[0]||product.image_url,
      images,
      url:product.best_source_url||`/p/${encodeURIComponent(product.ynot_id)}`,
      tags:Array.isArray(product.intent_tags)?product.intent_tags:[],
      source:"shopify",
      category:product.category,
      description:`${product.title} available through YNOT.`
    }
  },{
    headers:{"Cache-Control":"public, s-maxage=120, stale-while-revalidate=600"}
  });
}
