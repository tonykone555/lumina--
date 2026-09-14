import Stripe from "stripe";
import {reverseOrder,settleOrder} from "@/lib/circle/server";
import {placeSupplierOrder} from "@/lib/commerce/supplier-orders";
export const runtime="nodejs";
export async function POST(req:Request){
 const key=process.env.STRIPE_RESTRICTED_KEY,secret=process.env.STRIPE_WEBHOOK_SECRET;if(!key||!secret)return new Response("Not configured",{status:503});
 try{
  const stripe=new Stripe(key,{apiVersion:"2026-07-29.dahlia"});const event=stripe.webhooks.constructEvent(await req.text(),req.headers.get("stripe-signature")||"",secret);
  if(event.type==="checkout.session.completed"||event.type==="checkout.session.async_payment_succeeded"){
   const session=await stripe.checkout.sessions.retrieve(event.data.object.id,{expand:["customer"]});const m=session.metadata||{};
   if(m.buyerId)try{await settleOrder({buyerId:m.buyerId,orderId:session.id,subtotalCents:Number(m.subtotalCents||0),creditCents:Number(m.creditCents||0),checkoutRef:m.checkoutRef})}catch(error){console.error("YNOT Circle settlement requires intervention",session.id,error)}
   try{const result=await placeSupplierOrder(session);console.info("YNOT supplier fulfillment",session.id,result)}catch(error){console.error("YNOT supplier order requires intervention",session.id,error)}
  }
  if(event.type==="charge.refunded"){
   const charge=event.data.object;const intent=typeof charge.payment_intent==="string"?charge.payment_intent:charge.payment_intent?.id;
   if(intent){const sessions=await stripe.checkout.sessions.list({payment_intent:intent,limit:1});const session=sessions.data[0];if(session)try{await reverseOrder(session.id)}catch(error){console.error("YNOT Circle refund reversal requires intervention",session.id,error)}}
  }
  return Response.json({received:true});
 }catch{return new Response("Invalid signature",{status:400})}
}
