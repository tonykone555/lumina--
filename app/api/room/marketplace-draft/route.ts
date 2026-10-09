import {NextRequest,NextResponse} from "next/server";
import {requireYnotAdmin,adminErrorStatus} from "@/lib/ynot/admin-server";
import {createEbayDraftProduct,getEbayCategoryPreview,getEbayReadiness} from "@/lib/ebay/client";
import {getEtsyAccessToken,readEtsyConnection} from "@/lib/etsy/oauth";
import {etsyRequest} from "@/lib/etsy/client";
import {marketplaceOwnerAuthorized} from "@/lib/ynot/marketplace-owner";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type Product={
 id:string;title:string;brand?:string;price?:number|null;currency?:string;image?:string;images?:Array<string|{url?:string;src?:string}>;
 url?:string;source?:string;category?:string;description?:string;supplierPrice?:number;retailPrice?:number;
};

const clean=(v:any)=>String(v??"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
const safeSku=(p:Product)=>`YNOT-${String(p.id||Date.now()).replace(/[^a-zA-Z0-9_-]/g,"").slice(-36)}`;
const imageUrls=(p:Product)=>{
 const all=[p.image,...(Array.isArray(p.images)?p.images.map((x:any)=>typeof x==="string"?x:x?.url||x?.src):[])].filter((x):x is string=>typeof x==="string"&&/^https?:\/\//i.test(x));
 return [...new Set(all)].slice(0,10);
};
function description(p:Product){
 const d=clean(p.description);
 return (d||`${clean(p.title)}${p.brand?` by ${clean(p.brand)}`:""}.`).slice(0,4000);
}
function flatten(nodes:any[],trail:string[]=[],out:any[]=[]){
 for(const n of nodes||[]){
  const path=[...trail,String(n?.name||"")];
  out.push({id:Number(n?.id||0),name:String(n?.name||""),path:path.filter(Boolean).join(" > ")});
  flatten(n?.children||[],path,out);
 }
 return out;
}
function taxonomyScore(row:any,p:Product){
 const hay=`${p.title} ${p.brand||""} ${p.category||""}`.toLowerCase();
 const path=String(row?.path||"").toLowerCase();
 let score=0;
 const pairs=[
  [/pendant|chandelier|ceiling light|lamp|lighting|light fixture/,/lighting|light|lamp|chandelier|pendant|ceiling/],
  [/sofa|couch|sectional/,/furniture|sofa|couch|living room/],
  [/chair|armchair/,/furniture|chair|armchair/],
  [/table/,/furniture|table/],
  [/rug|carpet/,/rug|carpet|home decor/],
  [/mirror/,/mirror|home decor/]
 ];
 for(const [a,b] of pairs)if(a.test(hay)&&b.test(path))score+=100;
 for(const word of hay.split(/[^a-z0-9]+/).filter(x=>x.length>3))if(path.includes(word))score+=8;
 if(/digital|template|download|craft supply/.test(path))score-=250;
 return score;
}
async function etsyShop(){
 const token=await getEtsyAccessToken();
 if(!token)throw new Error("ETSY_NOT_CONNECTED");
 let connection:any=null;try{connection=await readEtsyConnection()}catch{}
 const uid=String(connection?.etsy_user_id||token.split(".")[0]||"");
 if(!/^\d+$/.test(uid))throw new Error("ETSY_USER_ID_MISSING");
 const data:any=await etsyRequest(`/users/${uid}/shops`,token);
 const shop=Array.isArray(data?.results)?data.results[0]:data;
 if(!shop?.shop_id)throw new Error("ETSY_SHOP_NOT_FOUND");
 return{token,shopId:Number(shop.shop_id)};
}
async function createEtsyPhysicalDraft(p:Product){
 const {token,shopId}=await etsyShop();
 const [taxData,shippingData,readinessData]:any[]=await Promise.all([
  etsyRequest("/seller-taxonomy/nodes",token),
  etsyRequest(`/shops/${shopId}/shipping-profiles`,token),
  etsyRequest(`/shops/${shopId}/readiness-state-definitions`,token)
 ]);
 const taxonomy=flatten(taxData?.results||[]).sort((a,b)=>taxonomyScore(b,p)-taxonomyScore(a,p))[0];
 if(!taxonomy?.id)throw new Error("ETSY_PHYSICAL_TAXONOMY_NOT_FOUND");
 const shipping=(shippingData?.results||[])[0];
 const readiness=(readinessData?.results||[])[0];
 const shippingProfileId=Number(shipping?.shipping_profile_id||shipping?.id||0);
 const readinessStateId=Number(readiness?.readiness_state_id||readiness?.id||0);
 if(!shippingProfileId)throw new Error("ETSY_SHIPPING_PROFILE_REQUIRED");
 if(!readinessStateId)throw new Error("ETSY_READINESS_PROFILE_REQUIRED");
 const price=Number(p.retailPrice??p.price??0);
 if(!Number.isFinite(price)||price<=0)throw new Error("ETSY_PRICE_INVALID");
 const body={
  quantity:10,
  title:clean(p.title).slice(0,140),
  description:description(p),
  price,
  who_made:"someone_else",
  when_made:"2020_2026",
  taxonomy_id:taxonomy.id,
  shipping_profile_id:shippingProfileId,
  readiness_state_id:readinessStateId,
  should_auto_renew:true,
  is_supply:false
 };
 const listing:any=await etsyRequest(`/shops/${shopId}/listings?legacy=false`,token,{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify(body)});
 const listingId=Number(listing?.listing_id||0);
 if(!listingId)throw new Error("ETSY_DRAFT_ID_MISSING");
 let uploaded=0;
 for(const [i,url] of imageUrls(p).entries()){
  try{
   const r=await fetch(url,{signal:AbortSignal.timeout(12000),cache:"force-cache"});
   if(!r.ok)continue;
   const blob=await r.blob();
   if(!blob.size)continue;
   const fd=new FormData();
   fd.set("image",new File([blob],`ynot-${i+1}.jpg`,{type:blob.type||"image/jpeg"}));
   fd.set("rank",String(i+1));
   await etsyRequest(`/shops/${shopId}/listings/${listingId}/images`,token,{method:"POST",body:fd});
   uploaded++;
  }catch{}
 }
 return{marketplace:"etsy",status:"draft",listingId,imagesUploaded:uploaded,taxonomy:{id:taxonomy.id,path:taxonomy.path}};
}
async function createEbayDraft(p:Product){
 const [taxonomy,readiness]=await Promise.all([getEbayCategoryPreview(p,p.title),getEbayReadiness("EBAY_FR")]);
 const item={
  sku:safeSku(p),
  title:clean(p.title).slice(0,80),
  description:description(p),
  imageUrls:imageUrls(p),
  quantity:10,
  price:Number(p.retailPrice??p.price??0),
  currency:String(p.currency||"EUR"),
  categoryId:taxonomy.categoryId,
  marketplaceId:"EBAY_FR" as const,
  merchantLocationKey:readiness.locations?.[0]?.merchantLocationKey||"",
  fulfillmentPolicyId:readiness.fulfillmentPolicies?.[0]?.id||"",
  paymentPolicyId:readiness.paymentPolicies?.[0]?.id||"",
  returnPolicyId:readiness.returnPolicies?.[0]?.id||"",
  condition:"NEW",
  brand:clean(p.brand)||undefined,
  aspects:taxonomy.aspects
 };
 if(!readiness.ready)throw new Error("EBAY_ACCOUNT_NOT_READY");
 if(taxonomy.categoryDomainOk!==true)throw new Error("EBAY_CATEGORY_DOMAIN_MISMATCH");
 if(taxonomy.missingRequiredAspects?.length)throw new Error(`EBAY_MISSING_REQUIRED_ASPECTS:${taxonomy.missingRequiredAspects.join(",")}`);
 const result=await createEbayDraftProduct(item);
 return{marketplace:"ebay",...result,category:{id:taxonomy.categoryId,name:taxonomy.categoryName}};
}

async function ownerAccess(request:NextRequest){
 if(marketplaceOwnerAuthorized(request))return true;
 try{await requireYnotAdmin(request);return true}catch{return false}
}

export async function GET(request:NextRequest){
 return NextResponse.json({ownerAccess:await ownerAccess(request)},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:NextRequest){
 try{
  if(!(await ownerAccess(request)))return NextResponse.json({error:"OWNER_ACCESS_REQUIRED"},{status:403});
  const body=await request.json().catch(()=>({}));
  const marketplace=String(body?.marketplace||"").toLowerCase();
  const product=body?.product as Product;
  if(!product?.id||!product?.title)throw new Error("PRODUCT_REQUIRED");
  if(marketplace==="ebay")return NextResponse.json(await createEbayDraft(product));
  if(marketplace==="etsy")return NextResponse.json(await createEtsyPhysicalDraft(product));
  throw new Error("MARKETPLACE_REQUIRED");
 }catch(error){
  const status=adminErrorStatus(error);
  return NextResponse.json({error:error instanceof Error?error.message:"MARKETPLACE_DRAFT_FAILED"},{status:status===500?400:status});
 }
}
