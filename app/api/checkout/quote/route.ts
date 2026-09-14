import {NextRequest,NextResponse} from "next/server";
import {checkoutMode,manualProcurementEnabled,manualProcurementProduct,manualShippingFor,pricedCheckout,revalidateProduct,resolveShipping,signQuote,type CheckoutProduct,type Region} from "@/lib/commerce/checkout";

export const runtime="nodejs";

export async function POST(req:NextRequest){
 try{
  if(process.env.YNOT_CHECKOUT_ENABLED!=="true")return NextResponse.json({error:"YNOT checkout is not enabled yet"},{status:503});
  const body=await req.json() as CheckoutProduct&{region?:Region;quantity?:number},region=body.region;
  if(!region?.country)throw new Error("REGION_REQUIRED");
  const quantity=Math.max(1,Math.min(10,Math.floor(Number(body.quantity)||1))),operatorFlow=checkoutMode(body).mode==="merchant";
  if(operatorFlow&&!manualProcurementEnabled())throw new Error("MERCHANT_CHECKOUT_ONLY");
  const product=operatorFlow?manualProcurementProduct(body):await revalidateProduct(body),quote=pricedCheckout(product);
  if(quote.state!=="buy-with-lumina")return NextResponse.json({mode:"merchant",reason:quote.reasons,product},{status:409});
  const shipping=operatorFlow?manualShippingFor(product,region):await resolveShipping(product,region),expiresAt=Date.now()+5*60_000;
  const token=signQuote({product,region,shipping,quantity,supplierPrice:product.price,price:quote.luminaPrice,cost:quote.riskAdjustedCost,marginPct:quote.marginPct,fulfillment:"operator_approval",expiresAt});
  return NextResponse.json({mode:"ynot",fulfillment:"operator_approval",product:{...product,price:quote.luminaPrice,supplierPrice:product.price,retailPrice:quote.luminaPrice},price:quote.luminaPrice,currency:product.currency,shipping,quantity,marginPct:quote.marginPct,expiresAt,token});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Checkout validation failed"},{status:400})}
}
