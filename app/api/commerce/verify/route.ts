import {NextRequest,NextResponse} from "next/server";
import {checkoutMode,pricedCheckout,revalidateProduct,shippingFor,type CheckoutProduct,type Region} from "@/lib/commerce/checkout";
export const runtime="nodejs";

export async function POST(req:NextRequest){
 try{
  const body=await req.json() as {product:CheckoutProduct;region:Region};
  if(!body?.product)return NextResponse.json({verified:false,error:"PRODUCT_REQUIRED"},{status:400});
  if(checkoutMode(body.product).mode!=="ynot")return NextResponse.json({verified:false,state:"not-approved"},{status:200});
  const product=await revalidateProduct(body.product);
  const quote=pricedCheckout(product);
  const shipping=shippingFor(product,body.region);
  const verified=quote.state==="buy-with-lumina";
  return NextResponse.json({verified,state:verified?"verified":"review",product:{...product,price:quote.luminaPrice,supplierPrice:product.price,retailPrice:quote.luminaPrice,pricingMode:"ynot-margin",sellableByLumina:verified},shipping,marginPct:quote.marginPct,contribution:quote.grossContribution,reliabilityScore:quote.reliabilityScore,reasons:quote.reasons});
 }catch(e){return NextResponse.json({verified:false,state:"unavailable",error:e instanceof Error?e.message:"VERIFICATION_FAILED"},{status:200})}
}
