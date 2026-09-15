import {NextRequest,NextResponse} from "next/server";
import {checkoutEnabled,checkoutMode,manualProcurementEnabled,manualProcurementProduct,manualShippingFor,pricedCheckout,revalidateProduct,resolveShipping,signQuote,type CheckoutProduct,type Region} from "@/lib/commerce/checkout";
import {etsyProductPrice,klarnaPreview} from "@/lib/commerce/etsy-pricing";

export const runtime="nodejs";

export async function POST(req:NextRequest){
 try{
  if(!checkoutEnabled())return NextResponse.json({error:"YNOT checkout is not enabled yet"},{status:503});
  const body=await req.json() as CheckoutProduct&{region?:Region;quantity?:number},region=body.region;
  if(!region?.country)throw new Error("REGION_REQUIRED");
  const quantity=Math.max(1,Math.min(10,Math.floor(Number(body.quantity)||1))),operatorFlow=checkoutMode(body).mode==="merchant";
  if(operatorFlow&&!manualProcurementEnabled())throw new Error("MERCHANT_CHECKOUT_ONLY");
  const product=operatorFlow?manualProcurementProduct(body):await revalidateProduct(body),baseQuote=pricedCheckout(product),isEtsy=String(product.source||"").toLowerCase()==="etsy";
  const etsyPrice=isEtsy?etsyProductPrice(product.price):null;
  const customerPrice=etsyPrice?.ynotProductPrice??baseQuote.luminaPrice;
  if(!isEtsy&&baseQuote.state!=="buy-with-lumina")return NextResponse.json({mode:"merchant",reason:baseQuote.reasons,product},{status:409});
  const shipping=operatorFlow?manualShippingFor(product,region):await resolveShipping(product,region),expiresAt=Date.now()+5*60_000,total=Math.round((customerPrice*quantity+shipping.amount)*100)/100;
  const marginPct=etsyPrice?Math.round((etsyPrice.productMargin/customerPrice)*10000)/100:baseQuote.marginPct;
  const token=signQuote({product,region,shipping,quantity,supplierPrice:product.price,price:customerPrice,cost:isEtsy?product.price:baseQuote.riskAdjustedCost,marginPct,fulfillment:"operator_approval",expiresAt});
  return NextResponse.json({mode:"ynot",fulfillment:"operator_approval",product:{...product,price:customerPrice,supplierPrice:product.price,retailPrice:customerPrice},price:customerPrice,currency:product.currency,shipping,total,quantity,marginPct,pricing:etsyPrice?{model:"etsy-adaptive-v1",...etsyPrice}:undefined,klarna:klarnaPreview(total,region.country,product.currency),expiresAt,token});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Checkout validation failed"},{status:400})}
}
