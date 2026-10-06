import {NextRequest,NextResponse} from "next/server";
import {getEbayCategoryPreview,getEbayReadiness} from "@/lib/ebay/client";
import {ebayMarketplaceConfig,parseEbayMarketplaces} from "@/lib/ebay/marketplaces";
import {requireYnotAdmin,adminErrorStatus} from "@/lib/ynot/admin-server";
import {evaluateEbayEligibility} from "@/lib/ebay/eligibility";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function clean(s:any){
 if(s==null)return "";
 if(typeof s==="string")return s.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
 if(typeof s==="number"||typeof s==="boolean")return String(s);
 if(Array.isArray(s))return s.map(clean).filter(Boolean).join(" ");
 if(typeof s==="object"){
  for(const key of ["text","value","description","plainText","html","body"]){
   if(s[key]!=null){const v=clean(s[key]);if(v&&v!=="[object Object]")return v}
  }
 }
 return "";
}

async function catalogSearch(request:NextRequest,q:string,country:string){
 const url=new URL("/api/catalog",request.url);
 url.searchParams.set("q",q);
 url.searchParams.set("country",country);
 const response=await fetch(url,{cache:"no-store"});
 const data=await response.json().catch(()=>({}));
 return Array.isArray(data?.products)?data.products:[];
}

function sameProduct(a:any,b:any){
 if(!a||!b)return false;
 if(String(a.id||"")&&String(a.id||"")===String(b.id||""))return true;
 const au=String(a.url||"").replace(/\/$/,""),bu=String(b.url||"").replace(/\/$/,"");
 if(au&&bu&&au===bu&&clean(a.title).toLowerCase()===clean(b.title).toLowerCase())return true;
 return false;
}

export async function GET(request:NextRequest){
 try{
  await requireYnotAdmin(request);
  const q=(request.nextUrl.searchParams.get("q")||"sofa").slice(0,180);
  const marketplaces=parseEbayMarketplaces(request.nextUrl.searchParams.get("marketplaces")||"global");
  const seedMarket=ebayMarketplaceConfig(marketplaces[0]);
  const seedProducts=await catalogSearch(request,q,seedMarket.country);
  const product=seedProducts.find((p:any)=>p?.id&&p?.title&&p?.image&&Number(p?.price)>0);
  if(!product)throw new Error("YNOT_PRODUCT_NOT_FOUND");

  const rows=await Promise.all(marketplaces.map(async id=>{
   const market=ebayMarketplaceConfig(id);
   try{
    const candidates=market.country===seedMarket.country?seedProducts:await catalogSearch(request,clean(product.title),market.country);
    const matched=candidates.find((p:any)=>sameProduct(product,p));
    if(!matched){
     return{marketplaceId:id,label:market.label,country:market.country,currency:market.currency,shipsTo:false,eligible:false,reason:"SOURCE_PRODUCT_NOT_AVAILABLE_FOR_DESTINATION"};
    }
    const [taxonomy,readiness]=await Promise.all([
     getEbayCategoryPreview(matched,q,id),
     getEbayReadiness(id)
    ]);
    const description=clean(matched.description);
    const sourceOrigin=clean((matched as any).shipFromCountry||(matched as any).originCountry||(matched as any).merchantCountry||(matched as any).countryOfOrigin);
    const originVerified=Boolean(sourceOrigin);
    const eligibility=evaluateEbayEligibility({
     shipsTo:true,
     sellerReady:readiness.ready,
     categoryDomainOk:taxonomy.categoryDomainOk===true,
     missingRequiredAspects:taxonomy.missingRequiredAspects,
     originVerified,
     deliveryDaysMax:Number.isFinite(Number((matched as any).deliveryDaysMax))?Number((matched as any).deliveryDaysMax):null,
     shippingCost:Number.isFinite(Number((matched as any).shippingCost))?Number((matched as any).shippingCost):null,
     supplierPrice:Number.isFinite(Number((matched as any).supplierPrice))?Number((matched as any).supplierPrice):null,
     retailPrice:Number(matched.price),
     available:(matched as any).available!==false
    });
    return{
     marketplaceId:id,label:market.label,country:market.country,currency:market.currency,
     shipsTo:true,
     sourceOrigin:sourceOrigin||null,
     originVerified,
     sellerReady:readiness.ready,
     categoryDomainOk:taxonomy.categoryDomainOk,
     categoryId:taxonomy.categoryId,
     categoryName:taxonomy.categoryName,
     missingRequiredAspects:taxonomy.missingRequiredAspects,
     eligible:taxonomy.categoryDomainOk===true&&taxonomy.missingRequiredAspects.length===0,
     publishable:eligibility.publishable,
     blockers:eligibility.blockers,
     warnings:eligibility.warnings,
     marginPct:eligibility.marginPct,
     deliveryDaysMax:eligibility.deliveryDaysMax,
     shippingCost:eligibility.shippingCost,
     sellerDefaults:{
      merchantLocationKey:readiness.locations?.[0]?.merchantLocationKey||"",
      fulfillmentPolicyId:readiness.fulfillmentPolicies?.[0]?.id||"",
      paymentPolicyId:readiness.paymentPolicies?.[0]?.id||"",
      returnPolicyId:readiness.returnPolicies?.[0]?.id||""
     },
     preview:{
      sku:`YNOT-${id.replace(/^EBAY_/,"")}-${String(matched.id||"").replace(/[^a-zA-Z0-9_-]/g,"").slice(-30)||Date.now()}`,
      title:clean(matched.title).slice(0,80),
      description:(description&&description!=="[object Object]"?description:`${clean(matched.title)} — ${clean(matched.brand)}`).slice(0,4000),
      imageUrls:(Array.isArray(matched.images)&&matched.images.length?matched.images:[matched.image]).filter(Boolean).slice(0,12),
      price:Number(matched.price),
      currency:String(matched.currency||market.currency),
      brand:clean(matched.brand)||undefined,
      aspects:taxonomy.aspects,
      categoryId:taxonomy.categoryId,
      marketplaceId:id
     }
    };
   }catch(error){
    return{marketplaceId:id,label:market.label,country:market.country,currency:market.currency,shipsTo:null,eligible:false,publishable:false,error:error instanceof Error?error.message:"EBAY_GLOBAL_PREVIEW_FAILED"};
   }
  }));

  return NextResponse.json({
   dryRun:true,
   mode:"global",
   query:q,
   sourceProduct:{id:product.id,title:product.title,brand:product.brand,source:product.source,url:product.url,price:product.price,currency:product.currency,image:product.image},
   originPolicy:"YNOT will not auto-publish globally until the supplier ship-from origin is explicitly known or verified.",
   marketplaces:rows
  },{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const status=adminErrorStatus(error);
  return NextResponse.json({error:error instanceof Error?error.message:"EBAY_GLOBAL_PREVIEW_FAILED"},{status:status===500?400:status});
 }
}
