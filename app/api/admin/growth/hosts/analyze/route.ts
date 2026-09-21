import {NextRequest,NextResponse} from "next/server";
import {requireYnotAdmin,adminErrorStatus} from "@/lib/ynot/admin-server";
import {getAirbnbListing,getAirbnbReviews} from "@/lib/intelligence/fetchlayer-airbnb";
import {analyzeHostProperty} from "@/lib/intelligence/host-property-analysis";
import {enrichHostContact} from "@/lib/intelligence/fetchlayer-contacts";

export const runtime="nodejs";

function photos(x:any){
 const raw=x?.photos||x?.images||x?.photoUrls||[];
 return (Array.isArray(raw)?raw:[]).map((p:any)=>typeof p==="string"?p:p?.url||p?.large||p?.picture).filter(Boolean).slice(0,12);
}
function amt(v:any){const n=Number(v?.amount??v);return Number.isFinite(n)?n:null}
function reviewTexts(raw:any){
 const rows=Array.isArray(raw?.reviews)?raw.reviews:Array.isArray(raw?.results)?raw.results:[];
 return rows.map((r:any)=>String(r?.text||r?.comments||r?.comment||r?.translatedText||"").trim()).filter(Boolean).slice(0,20);
}
function normalizeDetail(raw:any,fallback:any){
 const x=raw?.listing||raw?.data||raw||{},host=x?.host||x?.hostProfile||{};
 const price=x?.price||{};
 return{
  id:String(x?.id||fallback?.id||""),title:String(x?.title||x?.name||fallback?.title||"Airbnb listing"),
  description:String(x?.description||x?.summary||""),
  propertyType:String(x?.propertyType||x?.property_type||fallback?.propertyType||""),roomType:String(x?.roomType||x?.room_type||fallback?.roomType||""),
  location:String(x?.location?.name||x?.location?.city||x?.city||fallback?.location||""),
  nightlyPrice:amt(price?.perNight??fallback?.nightlyPrice),currency:String(price?.perNight?.currency||price?.total?.currency||fallback?.currency||"EUR"),
  rating:amt(x?.rating?.overall??x?.rating??fallback?.rating),reviewCount:Number(x?.reviewCount??x?.rating?.reviewCount??fallback?.reviewCount??0)||0,
  amenities:(Array.isArray(x?.amenities)?x.amenities:[]).map((a:any)=>typeof a==="string"?a:a?.title||a?.name).filter(Boolean),
  photos:photos(x).length?photos(x):(fallback?.photos||[]),
  host:{name:String(host?.name||host?.firstName||fallback?.host?.name||""),isSuperhost:Boolean(host?.isSuperhost||host?.superhost||fallback?.host?.isSuperhost),profileUrl:String(host?.profileUrl||fallback?.host?.profileUrl||"")},
  url:String(x?.url||fallback?.url||"")
 };
}
async function matchProducts(req:NextRequest,queries:string[]){
 const seen=new Set<string>(),products:any[]=[];
 for(const q of queries.slice(0,4)){
  try{
   const url=new URL("/api/catalog",req.url);url.searchParams.set("q",q);url.searchParams.set("source","shopify");url.searchParams.set("country","FR");
   const r=await fetch(url,{cache:"no-store"});if(!r.ok)continue;const j=await r.json();
   for(const p of (j.products||[]).slice(0,8)){const id=String(p.id||"");if(!id||seen.has(id))continue;seen.add(id);products.push({...p,matchedQuery:q});if(products.length>=18)break}
   if(products.length>=18)break;
  }catch{}
 }
 return products;
}
export async function POST(req:NextRequest){
 try{
  await requireYnotAdmin(req);
  const b=await req.json(),listing=String(b.listing||b.id||b.url||"").trim();
  if(!listing)return NextResponse.json({error:"LISTING_REQUIRED"},{status:400});
  const [detailRaw,reviewsRaw]=await Promise.all([getAirbnbListing(listing),getAirbnbReviews(listing,20).catch(()=>({reviews:[]}))]);
  const property=normalizeDetail(detailRaw,b.fallback||{});
  const reviews=reviewTexts(reviewsRaw);
  const analyzed=await analyzeHostProperty({...property,reviews});
  const queries=Array.isArray(analyzed.analysis?.searchQueries)?analyzed.analysis.searchQueries.map((x:any)=>String(x)).filter(Boolean):[];
  const hero=String(analyzed.analysis?.heroOpportunity?.productSearch||"").trim();if(hero&&!queries.includes(hero))queries.unshift(hero);
  const products=await matchProducts(req,queries);
  let contact:any=null;
  if(b.enrich_contact!==false&&property.host?.name){
   try{contact=await enrichHostContact({hostName:property.host.name,listingTitle:property.title,city:property.location,knownTargets:[property.host.profileUrl].filter(Boolean)})}catch{}
  }
  return NextResponse.json({property,reviews:reviews.slice(0,8),qualificationScore:analyzed.qualificationScore,analysis:analyzed.analysis,model:analyzed.model,matchedProducts:products,contact});
 }catch(e){const m=e instanceof Error?e.message:"HOST_ANALYSIS_FAILED";return NextResponse.json({error:m},{status:/FETCHLAYER_NOT_CONFIGURED|GEMINI_NOT_CONFIGURED/.test(m)?503:adminErrorStatus(e)});}
}