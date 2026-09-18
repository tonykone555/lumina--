import {creatorById,createCommission,reverseCommission} from "@/lib/creators/store";
import {releaseCredit,reverseOrder,settleOrder} from "@/lib/circle/server";
import {notifyOperator,stripeClient} from "@/lib/commerce/stripe";

export const runtime="nodejs";

export async function POST(req:Request){
 const secret=process.env.STRIPE_WEBHOOK_SECRET;if(!process.env.STRIPE_RESTRICTED_KEY||!secret)return new Response("Not configured",{status:503});
 try{
  const stripe=stripeClient(),event=stripe.webhooks.constructEvent(await req.text(),req.headers.get("stripe-signature")||"",secret);
  if(event.type==="checkout.session.completed"){
   const session=await stripe.checkout.sessions.retrieve(event.data.object.id,{expand:["customer","payment_intent"]}),m=session.metadata||{};
   if(m.ynotFlow==="manual_procurement"){
    const paymentIntent=typeof session.payment_intent==="string"?await stripe.paymentIntents.retrieve(session.payment_intent):session.payment_intent;
    if(paymentIntent?.status==="requires_capture"&&m.orderStatus!=="awaiting_operator_approval"){const authorizedAt=String(Date.now());await stripe.checkout.sessions.update(session.id,{metadata:{...m,orderStatus:"awaiting_operator_approval",authorizedAt}});await stripe.paymentIntents.update(paymentIntent.id,{metadata:{...paymentIntent.metadata,orderStatus:"awaiting_operator_approval",authorizedAt,checkoutSessionId:session.id}});await notifyOperator({...session,metadata:{...m,orderStatus:"awaiting_operator_approval",authorizedAt}})}
   }
  }
  if(event.type==="payment_intent.succeeded"){
   const intent=event.data.object;
   if(intent.metadata?.ynotFlow==="manual_procurement"){const sessions=await stripe.checkout.sessions.list({payment_intent:intent.id,limit:1}),session=sessions.data[0],m=session?.metadata||{};if(session&&m.buyerId)try{await settleOrder({buyerId:m.buyerId,orderId:session.id,subtotalCents:Number(m.subtotalCents||0),creditCents:Number(m.creditCents||0),checkoutRef:m.checkoutRef})}catch(error){console.error("YNOT Circle settlement requires intervention",session.id,error)}if(session&&m.creatorId){try{const creator=await creatorById(m.creatorId);if(creator){const subtotal=Number(m.subtotalCents||0);await createCommission({creatorId:creator.id,sessionId:session.id,paymentIntentId:intent.id,subtotalCents:subtotal,basisCents:subtotal,rate:Number(creator.commission_rate),currency:String(m.checkoutCurrency||intent.currency||"EUR").toUpperCase()})}}catch(error){console.error("YNOT creator commission requires intervention",session.id,error)}}}
  }
  if(event.type==="checkout.session.async_payment_succeeded"){
   const session=await stripe.checkout.sessions.retrieve(event.data.object.id),m=session.metadata||{};
   if(m.ynotFlow!=="manual_procurement"&&m.buyerId)try{await settleOrder({buyerId:m.buyerId,orderId:session.id,subtotalCents:Number(m.subtotalCents||0),creditCents:Number(m.creditCents||0),checkoutRef:m.checkoutRef})}catch(error){console.error("YNOT Circle settlement requires intervention",session.id,error)}
  }
  if(event.type==="checkout.session.expired"){const session=event.data.object,m=session.metadata||{};if(m.ynotFlow==="manual_procurement"&&m.checkoutRef)try{await releaseCredit(m.checkoutRef)}catch(error){console.error("YNOT expired checkout credit release requires intervention",session.id,error)}}
  if(event.type==="payment_intent.canceled"){const intent=event.data.object,m=intent.metadata||{};if(m.ynotFlow==="manual_procurement"&&m.checkoutRef)try{await releaseCredit(m.checkoutRef)}catch(error){console.error("YNOT canceled authorization credit release requires intervention",intent.id,error)}}
  if(event.type==="charge.refunded"){const charge=event.data.object,intent=typeof charge.payment_intent==="string"?charge.payment_intent:charge.payment_intent?.id;if(intent){const sessions=await stripe.checkout.sessions.list({payment_intent:intent,limit:1}),session=sessions.data[0],m=session?.metadata||{};if(session&&m.buyerId&&m.checkoutRef)try{await reverseOrder(session.id)}catch(error){console.error("YNOT Circle refund reversal requires intervention",session.id,error)}if(session)try{await reverseCommission(session.id)}catch(error){console.error("YNOT creator commission reversal requires intervention",session.id,error)}}}
  return Response.json({received:true});
 }catch(error){console.error("YNOT Stripe webhook rejected",error instanceof Error?error.message:"unknown error");return new Response("Invalid signature",{status:400})}
}
