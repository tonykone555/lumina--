import {NextRequest,NextResponse} from "next/server";
import {cookies} from "next/headers";
import Stripe from "stripe";
import crypto from "node:crypto";
import {availableCredit,circleReady,releaseCredit,reserveCredit} from "@/lib/circle/server";
import {priceChangePct,pricedCheckout,revalidateProduct,resolveShipping,signQuote,verifyQuote} from "@/lib/commerce/checkout";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 let checkoutRef="";
 try{
  if(process.env.YNOT_CHECKOUT_ENABLED!=="true")throw new Error("CHECKOUT_DISABLED");
  const {token,acceptPriceChange=false,applyCredits=false}=await req.json();
  const signed=verifyQuote(String(token));const product=await revalidateProduct(signed.product);const fresh=pricedCheckout(product);
  const change=priceChangePct(Number(signed.supplierPrice||signed.product?.price||0),Number(product.price));const shipping=await resolveShipping(product,signed.region);
  if(change>.10&&!acceptPriceChange){const expiresAt=Date.now()+5*60_000;const repriceToken=signQuote({product,region:signed.region,shipping,supplierPrice:product.price,price:fresh.luminaPrice,cost:fresh.riskAdjustedCost,marginPct:fresh.marginPct,expiresAt});return NextResponse.json({error:"PRICE_CHANGED_SIGNIFICANT",changePct:Math.round(change*10000)/100,freshPrice:fresh.luminaPrice,currency:product.currency,shipping,repriceToken,customerMayContinue:true},{status:409})}
  const customerPrice=change>.10?fresh.luminaPrice:Number(signed.price);const subtotalCents=Math.round(customerPrice*100);
  const jar=await cookies();const buyerId=jar.get("ynot-circle-id")?.value||"";let creditCents=0;
  checkoutRef=crypto.randomUUID();
  if(applyCredits&&circleReady()&&buyerId&&product.currency.toUpperCase()==="EUR"){
   const wallet=await availableCredit(buyerId);const cap=Math.floor(subtotalCents*.15);
   creditCents=await reserveCredit(buyerId,checkoutRef,Math.min(wallet,cap));
  }
  const chargedProductCents=Math.max(50,subtotalCents-creditCents);
  const key=process.env.STRIPE_RESTRICTED_KEY;if(!key)throw new Error("STRIPE_NOT_CONFIGURED");
  const stripe=new Stripe(key,{apiVersion:"2026-07-29.dahlia"});const origin=process.env.NEXT_PUBLIC_APP_URL||req.nextUrl.origin;
  const metadata={productId:product.id,variantId:product.variantId||"",source:product.source||"supplier",supplierUrl:product.url,supplierPrice:String(product.price),ynotPrice:String(customerPrice),subtotalCents:String(subtotalCents),creditCents:String(creditCents),checkoutRef,buyerId,shippingAmount:String(shipping.amount),shippingCountry:shipping.country,shippingSource:shipping.source,fulfillment:"auto-supplier-order"};
  const lineItems:Stripe.Checkout.SessionCreateParams.LineItem[]=[{quantity:1,price_data:{currency:product.currency.toLowerCase(),unit_amount:chargedProductCents,product_data:{name:product.title,images:product.image?[product.image]:undefined}}}];
  if(shipping.amount>0)lineItems.push({quantity:1,price_data:{currency:shipping.currency.toLowerCase(),unit_amount:Math.round(shipping.amount*100),product_data:{name:`Shipping to ${shipping.country}`}}});
  const session=await stripe.checkout.sessions.create({mode:"payment",integration_identifier:`ynot${crypto.randomBytes(2).toString("hex")}`,line_items:lineItems,billing_address_collection:"required",shipping_address_collection:{allowed_countries:[shipping.country as any]},phone_number_collection:{enabled:true},success_url:`${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/?checkout=cancelled`,metadata,payment_intent_data:{metadata}});
  return NextResponse.json({url:session.url,price:customerPrice,creditApplied:creditCents/100,shipping,priceChanged:change!==0,changePct:Math.round(change*10000)/100});
 }catch(e){if(checkoutRef)try{await releaseCredit(checkoutRef)}catch{}return NextResponse.json({error:e instanceof Error?e.message:"Unable to start checkout"},{status:400})}
}
