import {NextRequest,NextResponse} from "next/server";
import type Stripe from "stripe";
import crypto from "node:crypto";
import {checkoutEnabled,checkoutMode,manualProcurementEnabled,manualProcurementProduct,manualShippingFor,pricedCheckout,revalidateProduct,resolveShipping,type CheckoutProduct,type Region} from "@/lib/commerce/checkout";
import {etsyProductPrice} from "@/lib/commerce/etsy-pricing";
import {stripeClient} from "@/lib/commerce/stripe";
import {convertMoney,countryCurrency} from "@/lib/commerce/currency";

export const runtime="nodejs";

type CartItem=Partial<CheckoutProduct>&{productId?:string;quantity?:number;supplierPrice?:number;variantLabel?:string};

function normalizeCartProduct(raw:CartItem):CheckoutProduct{
 const id=String(raw.id||raw.productId||"").trim();
 return{
  ...raw,
  id,
  title:String(raw.title||"").trim(),
  price:Number(raw.price),
  currency:String(raw.currency||"EUR").trim().toUpperCase(),
  url:String(raw.url||"").trim(),
  variantId:raw.variantId?String(raw.variantId):undefined,
 } as CheckoutProduct;
}

export async function POST(req:NextRequest){
 try{
  if(!checkoutEnabled())throw new Error("CHECKOUT_DISABLED");
  const body=await req.json() as {items?:CartItem[];region?:Region},items=Array.isArray(body.items)?body.items:[],region=body.region;
  if(!items.length)throw new Error("BAG_EMPTY");
  if(items.length>20)throw new Error("TOO_MANY_BAG_ITEMS");
  if(!region?.country)throw new Error("REGION_REQUIRED");
  const currency=countryCurrency(region.country);
  const prepared=[] as Array<{product:CheckoutProduct;quantity:number;customerPrice:number;shipping:{amount:number;currency:string;country:string;source?:string};variantLabel?:string;sourceCurrency:string}>;
  for(const raw of items){
   const input=normalizeCartProduct(raw),quantity=Math.max(1,Math.min(10,Math.floor(Number(raw.quantity)||1))),operatorFlow=checkoutMode(input).mode==="merchant";
   if(operatorFlow&&!manualProcurementEnabled())throw new Error("MERCHANT_CHECKOUT_ONLY");
   const product=operatorFlow?manualProcurementProduct(input):await revalidateProduct(input),base=pricedCheckout(product),isEtsy=String(product.source||"").toLowerCase()==="etsy",etsy=isEtsy?etsyProductPrice(product.price):null,rawCustomerPrice=etsy?.ynotProductPrice??base.luminaPrice;
   if(!operatorFlow&&!isEtsy&&base.state!=="buy-with-lumina")throw new Error("PRODUCT_NOT_AVAILABLE_FOR_YNOT_CHECKOUT");
   const shippingRaw=operatorFlow?manualShippingFor(product,region):await resolveShipping(product,region),sourceCurrency=String(product.currency||raw.currency||"EUR").toUpperCase(),shippingCurrency=String(shippingRaw.currency||sourceCurrency).toUpperCase();
   const [customerPrice,shippingAmount]=await Promise.all([convertMoney(rawCustomerPrice,sourceCurrency,currency),convertMoney(Number(shippingRaw.amount||0),shippingCurrency,currency)]);
   const shipping={...shippingRaw,amount:shippingAmount,currency};
   prepared.push({product,quantity,customerPrice,shipping,variantLabel:raw.variantLabel,sourceCurrency});
  }
  const lineItems:Stripe.Checkout.SessionCreateParams.LineItem[]=prepared.map(({product,quantity,customerPrice,variantLabel})=>({quantity,price_data:{currency:currency.toLowerCase(),unit_amount:Math.round(customerPrice*100),product_data:{name:variantLabel?`${product.title} — ${variantLabel}`:product.title,images:product.image?[product.image]:undefined}}}));
  const shippingTotal=prepared.reduce((sum,item)=>sum+Number(item.shipping.amount||0),0);
  if(shippingTotal>0)lineItems.push({quantity:1,price_data:{currency:currency.toLowerCase(),unit_amount:Math.round(shippingTotal*100),product_data:{name:`Shipping reserve to ${region.country}`}}});
  const subtotal=prepared.reduce((sum,item)=>sum+item.customerPrice*item.quantity,0),total=subtotal+shippingTotal,checkoutRef=crypto.randomUUID(),summary=prepared.map(item=>`${item.product.id}:${item.product.variantId||"default"}:${item.quantity}`).join("|").slice(0,430);
  const stripe=stripeClient(),origin=process.env.NEXT_PUBLIC_APP_URL||req.nextUrl.origin,suffix=crypto.randomBytes(12).toString("base64url").replace(/[^a-z]/gi,"").toLowerCase().padEnd(8,"x").slice(0,8),metadata={ynotFlow:"multi_item_manual_procurement",orderStatus:"awaiting_customer_authorization",itemCount:String(prepared.length),bagSummary:summary,checkoutRef,shippingCountry:region.country,checkoutCurrency:currency,total:String(Math.round(total*100)/100)};
  const session=await stripe.checkout.sessions.create({mode:"payment",integration_identifier:`ynot${suffix}`,line_items:lineItems,billing_address_collection:"required",shipping_address_collection:{allowed_countries:[region.country as any]},phone_number_collection:{enabled:true},payment_intent_data:{capture_method:"manual",metadata},success_url:`${origin}/?checkout=pending&session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/?checkout=cancelled`,metadata});
  return NextResponse.json({url:session.url,total:Math.round(total*100)/100,currency,itemCount:prepared.length,shipping:shippingTotal});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to start bag checkout"},{status:400})}
}
