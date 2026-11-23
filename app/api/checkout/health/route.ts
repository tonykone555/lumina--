import {NextResponse} from "next/server";
import {checkoutEnabled,manualProcurementEnabled} from "@/lib/commerce/checkout";

export const runtime="nodejs";
export const dynamic="force-dynamic";

/** Public readiness signal, never returns any credential or account identifier. */
export async function GET(){
 const stripe=Boolean(process.env.STRIPE_RESTRICTED_KEY);
 const webhook=Boolean(process.env.STRIPE_WEBHOOK_SECRET);
 const quote=Boolean(process.env.YNOT_CHECKOUT_SIGNING_SECRET);
 const operator=Boolean(process.env.YNOT_OPERATOR_SECRET);
 const explicit=process.env.YNOT_CHECKOUT_ENABLED==="true";
 const ready=checkoutEnabled();
 const missing=[
   !stripe?"stripe_server_key":null,
   !webhook?"stripe_webhook_signature":null,
   !quote?"quote_signing_key":null,
   !operator?"operator_authorization":null
 ].filter((v):v is string=>Boolean(v));
 return NextResponse.json({
   checkout:ready?"configured":"unavailable",
   paymentCollectionEnabled:ready,
   manualProcurementEnabled:ready&&manualProcurementEnabled(),
   environmentConfigured:stripe&&webhook&&quote&&operator,
   activationEnabled:explicit,
   blockers:missing,
   warning:ready?"Payment configuration exists; individual items still require supplier, shipping and price verification.":"No customer payment can be started until configuration and verification are complete."
 },{headers:{"Cache-Control":"no-store"}});
}
