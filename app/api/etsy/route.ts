import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";

type EtsyMoney={amount?:number;divisor?:number;currency_code?:string};
type EtsyImage={listing_image_id?:number;url_fullxfull?:string;url_570xN?:string;rank?:number};
type EtsyShop={shop_id?:number;shop_name?:string;title?:string};
type EtsyListing={listing_id:number;shop_id?:number;title?:string;description?:string;url?:string;price?:EtsyMoney;tags?:string[];images?:EtsyImage[];shop?:EtsyShop;quantity?:number};
type EtsyReview={rating?:number;review?:string;created_timestamp?:number;create_timestamp?:number;image_url_fullxfull?:string};
type EtsyInventoryProduct={product_id?:number;property_values?:Array<{property_name?:string;values?:string[];value_ids?:number[]}>;offerings?:Array<{offering_id?:number;quantity?:number;is_enabled?:boolean;price?:EtsyMoney}>};

function apiKey(){return process.env.ETSY_API_KEY||process.env.ETSY_API_KEYSTRING||""}
function authHeaders(){const headers:Record<string,string>={"x-api-key":apiKey()};const token=process.env.ETSY_ACCESS_TOKEN;if(token)headers.Authorization=`Bearer ${token}`;return headers}
function money(value?:EtsyMoney){if(!value)return{value:null,currency:"EUR"};const divisor=Number(value.divisor||100)||100;const amount=Number(value.amount||0);return{value:amount/divisor,currency:value.currency_code||"EUR"}}
async function etsy(path:string){const response=await fetch(`https://openapi.etsy.com/v3/application${path}`,{headers:authHeaders(),cache:"no-store"});if(!response.ok)throw new Error(`ETSY_${response.status}`);return response.json()}

async function reviewsFor(listingId:number){try{const data=await etsy(`/listings/${listingId}/reviews?limit=8&offset=0`) as {count?:number;results?:EtsyReview[]};const reviews=Array.isArray(data.results)?data.results:[];const valid=reviews.filter(r=>Number(r.rating)>0);const average=valid.length?valid.reduce((sum,r)=>sum+Number(r.rating||0),0)/valid.length:null;return{rating:average?Math.round(average*10)/10:null,reviewCount:Number(data.count||reviews.length),reviews:reviews.slice(0,5).map(r=>({rating:Number(r.rating||0),text:String(r.review||"").trim(),createdAt:Number(r.created_timestamp||r.create_timestamp||0),image:r.image_url_fullxfull||null}))}}catch{return{rating:null,reviewCount:0,reviews:[]}}
}

async function inventoryFor(ids:number[]){const token=process.env.ETSY_ACCESS_TOKEN;if(!token||!ids.length)return new Map<number,EtsyInventoryProduct[]>();try{const data=await etsy(`/listings/batch/inventory?listing_ids=${ids.join(",")}`) as {results?:Array<{listing_id?:number;products?:EtsyInventoryProduct[]}>};return new Map((data.results||[]).map(item=>[Number(item.listing_id),item.products||[]]))}catch{return new Map<number,EtsyInventoryProduct[]>()}
}

function normalizeVariants(products:EtsyInventoryProduct[]){return products.flatMap(product=>{const offering=(product.offerings||[]).find(o=>o.is_enabled!==false);if(!offering)return[];const p=money(offering.price);const label=(product.property_values||[]).map(v=>`${v.property_name||"Option"}: ${(v.values||[]).join(" / ")}`).join(" · ")||"Option";return[{id:String(product.product_id||offering.offering_id||label),label,price:p.value,currency:p.currency,available:Number(offering.quantity||0)>0,quantity:Number(offering.quantity||0)}]})}

export async function GET(request:NextRequest){
 const key=apiKey();
 if(!key)return NextResponse.json({error:"ETSY_API_KEY_MISSING"},{status:503});
 const {searchParams}=new URL(request.url);
 const mode=searchParams.get("mode")||"catalog";
 if(mode==="reviews"){
  const listingId=Number(searchParams.get("listingId")||0);
  if(!listingId)return NextResponse.json({error:"LISTING_ID_REQUIRED"},{status:400});
  return NextResponse.json(await reviewsFor(listingId));
 }
 const q=(searchParams.get("q")||"gifts").trim().slice(0,120);
 const page=Math.max(0,Number(searchParams.get("page")||0));
 const country=(searchParams.get("country")||"FR").toUpperCase().slice(0,2);
 const currency=(searchParams.get("currency")||"EUR").toUpperCase().slice(0,3);
 try{
  const active=await etsy(`/listings/active?keywords=${encodeURIComponent(q)}&limit=24&offset=${page*24}&sort_on=score&sort_order=desc`) as {count?:number;results?:EtsyListing[]};
  const ids=(active.results||[]).map(x=>Number(x.listing_id)).filter(Boolean);
  if(!ids.length)return NextResponse.json({products:[],source:"etsy",page,total:Number(active.count||0)});
  const details=await etsy(`/listings/batch?listing_ids=${ids.join(",")}&includes=Images,Shop&buyer_country=${country}&currency=${currency}`) as {results?:EtsyListing[]};
  const inventory=await inventoryFor(ids);
  const enriched=await Promise.all((details.results||[]).map(async listing=>{
   const price=money(listing.price);const review=await reviewsFor(listing.listing_id);const images=[...(listing.images||[])].sort((a,b)=>Number(a.rank||0)-Number(b.rank||0)).map(img=>img.url_fullxfull||img.url_570xN).filter(Boolean) as string[];const variants=normalizeVariants(inventory.get(listing.listing_id)||[]);
   return{id:`etsy-${listing.listing_id}`,listingId:listing.listing_id,shopId:Number(listing.shop_id||listing.shop?.shop_id||0),title:String(listing.title||"Etsy product"),brand:String(listing.shop?.shop_name||listing.shop?.title||"Etsy seller"),description:String(listing.description||""),price:price.value,currency:price.currency,image:images[0]||"",images,url:listing.url||`https://www.etsy.com/listing/${listing.listing_id}`,tags:["Etsy",...(listing.tags||[])],source:"etsy",variants,rating:review.rating,reviewCount:review.reviewCount,reviews:review.reviews,quantity:Number(listing.quantity||0)}
  }));
  return NextResponse.json({products:enriched.filter(p=>p.image),source:"etsy",page,total:Number(active.count||0),nextPage:page+1});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"ETSY_UNAVAILABLE"},{status:502})}
}
