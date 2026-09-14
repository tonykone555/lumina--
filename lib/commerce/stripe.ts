import crypto from "node:crypto";
import Stripe from "stripe";
import {releaseCredit} from "@/lib/circle/server";

export const stripeApiVersion="2026-07-29.dahlia" as const;

export function stripeClient(){
 const key=process.env.STRIPE_RESTRICTED_KEY;if(!key)throw new Error("STRIPE_NOT_CONFIGURED");
 return new Stripe(key,{apiVersion:stripeApiVersion});
}

export function operatorAuthorized(header:string|null){
 const configured=process.env.YNOT_OPERATOR_SECRET||"";if(configured.length<16||!header?.startsWith("Bearer "))return false;
 const provided=header.slice(7),a=Buffer.from(configured),b=Buffer.from(provided);
 return a.length===b.length&&crypto.timingSafeEqual(Uint8Array.from(a),Uint8Array.from(b));
}

export function approvalWindowMs(){
 const minutes=Number(process.env.YNOT_APPROVAL_WINDOW_MINUTES||10);
 return Math.max(5,Math.min(60,Number.isFinite(minutes)?minutes:10))*60_000;
}

export function heldAt(session:Stripe.Checkout.Session,paymentIntent?:Stripe.PaymentIntent|null){return Number(session.metadata?.authorizedAt||0)||(paymentIntent?.created||session.created)*1000}

export async function releaseExpiredAuthorization(stripe:Stripe,session:Stripe.Checkout.Session){
 const paymentIntent=typeof session.payment_intent==="string"?await stripe.paymentIntents.retrieve(session.payment_intent):session.payment_intent;
 if(!paymentIntent||paymentIntent.status!=="requires_capture"||Date.now()-heldAt(session,paymentIntent)<approvalWindowMs())return paymentIntent;
 await stripe.paymentIntents.cancel(paymentIntent.id,{cancellation_reason:"abandoned"},{idempotencyKey:`ynot-expire-${session.id}`});
 await stripe.checkout.sessions.update(session.id,{metadata:{...session.metadata,orderStatus:"authorization_released",releasedAt:String(Date.now()),releaseReason:"approval_window_expired"}});
 if(session.metadata?.checkoutRef)try{await releaseCredit(session.metadata.checkoutRef)}catch(error){console.error("YNOT credit release requires intervention",session.id,error)}
 return stripe.paymentIntents.retrieve(paymentIntent.id);
}

export async function notifyOperator(session:Stripe.Checkout.Session){
 const url=process.env.YNOT_OPERATOR_NOTIFICATION_URL;if(!url)return;
 try{await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event:"ynot.order.awaiting_approval",sessionId:session.id,title:session.metadata?.productTitle,supplierUrl:session.metadata?.supplierUrl,ynotPrice:Number(session.metadata?.ynotPrice||0),currency:session.currency?.toUpperCase(),approvalUrl:`${process.env.NEXT_PUBLIC_APP_URL||""}/commerce`}),signal:AbortSignal.timeout(5000)})}catch(error){console.error("YNOT operator notification failed",error instanceof Error?error.message:"unknown error")}
}
