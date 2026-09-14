import {NextRequest,NextResponse} from "next/server";
import {cookies} from "next/headers";
import crypto from "node:crypto";
import type Stripe from "stripe";
import {availableCredit,circleReady,releaseCredit,reserveCredit} from "@/lib/circle/server";
import {priceChangePct,pricedCheckout,revalidateProduct,resolveShipping,signQuote,verifyQuote} from "@/lib/commerce/checkout";
import {stripeClient} from "@/lib/commerce/stripe";

export const runtime="nodejs";

export async function POST(req:NextRequest){
 let checkoutRef="";
 try{
  if(process.env.YNOT_CHECKOUT_ENABLED!=="true")throw new Error("CHECKOUT_DISABLED");
  const {token,acceptPriceChange=false,applyCredits=false}=await req.json(),signed=verifyQuote(String(token)),quantity=Math.max(1,Math.min(10,Math.floor(Number(signed.quantity)||1))),operatorFlow=signed.fulfillment==="operator_approval";
  const product=operatorFlow?signed.product:await revalidateProduct(signed.product),fresh=pricedCheckout(product),change=operatorFlow?0:priceChangePct(Number(signed.supplierPrice||signed.product?.price||0),Number(product.price)),shipping=operatorFlow?signed.shipping:await resolveShipping(product,signed.region);
  if(change>.10&&!acceptPriceChange){const expiresAt=Date.now()+5*60_000,repriceToken=signQuote({product,region:signed.region,shipping,quantity,supplierPrice:product.price,price:fresh.luminaPrice,cost:fresh.riskAdjustedCost,marginPct:fresh.marginPct,fulfillment:"operator_approval",expiresAt});return NextResponse.json({error:"PRICE_CHANGED_SIGNIFICANT",changePct:Math.round(change*10000)/100,freshPrice:fresh.luminaPrice,currency:product.currency,shipping,repriceToken,customerMayContinue:true},{status:409})}
  const customerPrice=change>.10?fresh.luminaPrice:Number(signed.price),subtotalCents=Math.round(customerPrice*quantity*100),jar=await cookies(),buyerId=jar.get("ynot-circle-id")?.value||"";
  let creditCents=0;checkoutRef=crypto.randomUUID();
  if(applyCredits&&circleReady()&&buyerId&&product.currency.toUpperCase()==="EUR"){const wallet=await availableCredit(buyerId),cap=Math.floor(subtotalCents*.15);creditCents=await reserveCredit(buyerId,checkoutRef,Math.min(wallet,cap))}
  const chargedProductCents=Math.max(50,subtotalCents-creditCents),stripe=stripeClient(),origin=process.env.NEXT_PUBLIC_APP_URL||req.nextUrl.origin;
  const lineItems:Stripe.Checkout.SessionCreateParams.LineItem[]=[{quantity:1,price_data:{currency:product.currency.toLowerCase(),unit_amount:chargedProductCents,product_data:{name:quantity>1?`${quantity} × ${product.title}`:product.title,images:product.image?[product.image]:undefined}}}];
  if(shipping.amount>0){if(shipping.currency!==product.currency)throw new Error("SHIPPING_CURRENCY_MISMATCH");lineItems.push({quantity:1,price_data:{currency:shipping.currency.toLowerCase(),unit_amount:Math.round(shipping.amount*100),product_data:{name:`Shipping reserve to ${shipping.country}`}}})}
  const commonMetadata={ynotFlow:"manual_procurement",orderStatus:"awaiting_customer_authorization",productId:product.id,productTitle:product.title.slice(0,240),variantId:product.variantId||"",quantity:String(quantity),source:product.source||"supplier",supplierUrl:product.url,supplierPrice:String(product.price),ynotPrice:String(customerPrice),subtotalCents:String(subtotalCents),creditCents:String(creditCents),checkoutRef,buyerId,shippingAmount:String(shipping.amount),shippingCountry:shipping.country,shippingSource:shipping.source,fulfillment:"operator_approval"};
  const suffix=crypto.randomBytes(12).toString("base64url").replace(/[^a-z]/gi,"").toLowerCase().padEnd(8,"x").slice(0,8);
  const session=await stripe.checkout.sessions.create({mode:"payment",integration_identifier:`ynot${suffix}`,line_items:lineItems,billing_address_collection:"required",shipping_address_collection:{allowed_countries:[shipping.country as any]},phone_number_collection:{enabled:true},payment_intent_data:{capture_method:"manual",metadata:commonMetadata},success_url:`${origin}/?checkout=pending&session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/?checkout=cancelled`,metadata:commonMetadata});
  return NextResponse.json({url:session.url,price:customerPrice,creditApplied:creditCents/100,shipping,approvalWindowMinutes:Number(process.env.YNOT_APPROVAL_WINDOW_MINUTES||10),priceChanged:change!==0,changePct:Math.round(change*10000)/100});
 }catch(e){if(checkoutRef)try{await releaseCredit(checkoutRef)}catch{}return NextResponse.json({error:e instanceof Error?e.message:"Unable to start checkout"},{status:400})}
}
