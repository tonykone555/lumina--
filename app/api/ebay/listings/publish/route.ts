import {NextRequest,NextResponse} from "next/server";
import {getEbayReadiness,publishEbayProduct,type PublishEbayProduct} from "@/lib/ebay/client";
import {requireYnotAdmin,adminErrorStatus} from "@/lib/ynot/admin-server";
import {ebayMarketplaceConfig} from "@/lib/ebay/marketplaces";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function valid(input:any):PublishEbayProduct{
 if(!input||typeof input!=="object")throw new Error("INVALID_BODY");
 for(const key of ["sku","title","description","categoryId"]){if(!String(input[key]||"").trim())throw new Error(`MISSING_${key.toUpperCase()}`)}
 const price=Number(input.price),quantity=Number(input.quantity);
 const marketplaceId=ebayMarketplaceConfig(input.marketplaceId||"EBAY_FR").id;
 if(!Number.isFinite(price)||price<=0)throw new Error("INVALID_PRICE");
 if(!Number.isFinite(quantity)||quantity<0)throw new Error("INVALID_QUANTITY");
 return{
  sku:String(input.sku),title:String(input.title),description:String(input.description),
  imageUrls:Array.isArray(input.imageUrls)?input.imageUrls.map(String):[],
  quantity,price,currency:String(input.currency||ebayMarketplaceConfig(marketplaceId).currency),categoryId:String(input.categoryId),marketplaceId,
  merchantLocationKey:String(input.merchantLocationKey||""),fulfillmentPolicyId:String(input.fulfillmentPolicyId||""),
  paymentPolicyId:String(input.paymentPolicyId||""),returnPolicyId:String(input.returnPolicyId||""),
  condition:String(input.condition||"NEW"),brand:input.brand?String(input.brand):undefined,
  aspects:input.aspects&&typeof input.aspects==="object"?input.aspects:undefined,
  mpn:input.mpn?String(input.mpn):undefined,upc:Array.isArray(input.upc)?input.upc.map(String):undefined
 };
}

export async function POST(request:NextRequest){
 try{
  await requireYnotAdmin(request);
  const body=await request.json();
  const item=valid(body);
  if(body.confirmPublish!==true){
   const readiness=await getEbayReadiness(item.marketplaceId);
   return NextResponse.json({dryRun:true,ready:readiness.ready,item:{...item,description:item.description.slice(0,180)+(item.description.length>180?"…":"")},readiness});
  }
  if(body.originVerified!==true)throw new Error("EBAY_SHIP_FROM_ORIGIN_NOT_VERIFIED");
  const result=await publishEbayProduct(item);
  return NextResponse.json({dryRun:false,...result});
 }catch(error){
  const status=adminErrorStatus(error);
  return NextResponse.json({error:error instanceof Error?error.message:"EBAY_PUBLISH_FAILED"},{status:status===500?400:status});
 }
}
