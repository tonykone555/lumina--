import {NextRequest,NextResponse} from "next/server";
import {getCatalogProduct} from "@/lib/commerce/catalog-store";

export const runtime="nodejs";
const uniq=(xs:unknown[])=>[...new Set(xs.filter((x):x is string=>typeof x==="string"&&/^https?:\/\//i.test(x)))];
function mediaUrls(p:any){const raw=[...(Array.isArray(p.video_urls)?p.video_urls:[]),...(Array.isArray(p.videos)?p.videos:[]),...(Array.isArray(p.media_urls)?p.media_urls:[])];return uniq(raw)}
function reviews(p:any){const raw=Array.isArray(p.reviews)?p.reviews:Array.isArray(p.customer_reviews)?p.customer_reviews:[];return raw.slice(0,12).map((r:any)=>({rating:Number(r?.rating||r?.stars)||null,title:String(r?.title||""),body:String(r?.body||r?.text||r?.review||""),author:String(r?.author||r?.reviewer||""),image:typeof r?.image==="string"?r.image:null})).filter((r:any)=>r.rating||r.body)}
async function richShopifyProduct(req:NextRequest,base:any){
 try{
  const response=await fetch(new URL("/api/commerce/product-link",req.url),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(base),cache:"no-store",signal:AbortSignal.timeout(9000)});
  const data=await response.json().catch(()=>null);
  return response.ok&&data?.product?data.product:null;
 }catch{return null}
}
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;const product=await getCatalogProduct(id).catch(()=>null);
  if(!product||product.active===false||product.ad_eligible===false)return NextResponse.json({error:"Product not found"},{status:404});
  const images=uniq([product.image_url,...(Array.isArray(product.image_urls)?product.image_urls:[])]),videos=mediaUrls(product),tags=[...new Set([...(Array.isArray(product.intent_tags)?product.intent_tags:[]),...(Array.isArray(product.tags)?product.tags:[]),...(Array.isArray(product.attributes)?product.attributes:[])].map(String).filter(Boolean))],rating=Number(product.rating||product.review_rating||product.average_rating)||null,reviewCount=Number(product.review_count||product.reviews_count||product.rating_count)||0,reviewList=reviews(product);
  const base={id:product.ynot_id,title:product.title,brand:product.brand||product.source_brand||"YNOT",price:Number(product.ynot_price),currency:String(product.currency||"USD"),image:images[0]||product.image_url,images,videos,tags,rating,reviewCount,reviews:reviewList,url:product.best_source_url||`/p/${encodeURIComponent(product.ynot_id)}`,source:"shopify",category:product.category,description:product.description||`${product.title} available through YNOT.`};
  const rich=await richShopifyProduct(req,base);
  const mergedImages=uniq([base.image,...base.images,...(Array.isArray(rich?.images)?rich.images:[]),rich?.image,...(Array.isArray(rich?.variants)?rich.variants.map((v:any)=>v?.image):[])]);
  const result=rich?{...base,...rich,image:mergedImages[0]||base.image,images:mergedImages,videos:uniq([...base.videos,...(Array.isArray(rich.videos)?rich.videos:[])])}:{...base,images:mergedImages};
  return NextResponse.json({product:result},{headers:{"Cache-Control":"public, s-maxage=300, stale-while-revalidate=3600"}});
}
