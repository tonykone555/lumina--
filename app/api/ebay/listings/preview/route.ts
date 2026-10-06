import {NextRequest,NextResponse} from "next/server";
import {getEbayCategoryPreview,getEbayReadiness} from "@/lib/ebay/client";
import {requireYnotAdmin,adminErrorStatus} from "@/lib/ynot/admin-server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function clean(s:any){
 if(s==null)return "";
 if(typeof s==="string")return s.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
 if(typeof s==="number"||typeof s==="boolean")return String(s);
 if(Array.isArray(s))return s.map(clean).filter(Boolean).join(" ");
 if(typeof s==="object"){
  for(const key of ["text","value","description","plainText","html","body"]){
   if(s[key]!=null){const v=clean(s[key]);if(v)return v}
  }
  return Object.values(s).map(clean).filter(Boolean).join(" ");
 }
 return "";
}

export async function GET(request:NextRequest){
 try{
  await requireYnotAdmin(request);
  const q=(request.nextUrl.searchParams.get("q")||"home decor").slice(0,180);
  const catalogUrl=new URL("/api/catalog",request.url);
  catalogUrl.searchParams.set("q",q);
  catalogUrl.searchParams.set("country","FR");
  const catalogResponse=await fetch(catalogUrl,{cache:"no-store"});
  const catalog=await catalogResponse.json();
  const product=(catalog?.products||[]).find((p:any)=>p?.id&&p?.title&&p?.image&&Number(p?.price)>0);
  if(!product)throw new Error("YNOT_PRODUCT_NOT_FOUND");

  const [taxonomy,readiness]=await Promise.all([
   getEbayCategoryPreview(product,q),
   getEbayReadiness()
  ]);
  const defaults={
   merchantLocationKey:readiness.locations?.[0]?.merchantLocationKey||"",
   fulfillmentPolicyId:readiness.fulfillmentPolicies?.[0]?.id||"",
   paymentPolicyId:readiness.paymentPolicies?.[0]?.id||"",
   returnPolicyId:readiness.returnPolicies?.[0]?.id||""
  };
  const item={
   sku:`YNOT-${String(product.id).replace(/[^a-zA-Z0-9_-]/g,"").slice(-36)||Date.now()}`,
   title:clean(product.title).slice(0,80),
   description:((()=>{const d=clean(product.description);return d&&d!=="[object Object]"?d:`${clean(product.title)} — ${clean(product.brand)}`.replace(/\s+—\s*$/,"")})()).slice(0,4000),
   imageUrls:(Array.isArray(product.images)&&product.images.length?product.images:[product.image]).filter(Boolean).slice(0,12),
   quantity:10,
   price:Number(product.price),
   currency:String(product.currency||"EUR"),
   categoryId:taxonomy.categoryId,
   condition:"NEW",
   brand:clean(product.brand)||undefined,
   aspects:taxonomy.aspects,
   ...defaults
  };
  return NextResponse.json({
   dryRun:true,
   publishable:readiness.ready&&taxonomy.categoryDomainOk===true&&taxonomy.missingRequiredAspects.length===0,
   query:q,
   sourceProduct:{id:product.id,title:product.title,brand:product.brand,source:product.source,url:product.url,price:product.price,currency:product.currency,image:product.image},
   ebay:{categoryTreeId:taxonomy.categoryTreeId,categoryQuery:taxonomy.categoryQuery,categoryId:taxonomy.categoryId,categoryName:taxonomy.categoryName,categoryDomainOk:taxonomy.categoryDomainOk,alternatives:taxonomy.alternatives,ancestors:taxonomy.ancestors,requiredAspects:taxonomy.requiredAspects,missingRequiredAspects:taxonomy.missingRequiredAspects,aspectCount:taxonomy.aspectCount},
   item,
   readiness
  },{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const status=adminErrorStatus(error);
  return NextResponse.json({error:error instanceof Error?error.message:"EBAY_PREVIEW_FAILED"},{status:status===500?400:status});
 }
}
