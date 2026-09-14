import {NextRequest,NextResponse} from "next/server";
import {approvalWindowMs,releaseExpiredAuthorization,stripeClient} from "@/lib/commerce/stripe";

export const runtime="nodejs";

export async function GET(req:NextRequest){
 try{
  const sessionId=req.nextUrl.searchParams.get("session_id")||"";if(!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId))throw new Error("INVALID_SESSION");
  const stripe=stripeClient();let session=await stripe.checkout.sessions.retrieve(sessionId,{expand:["payment_intent"]});
  if(session.metadata?.ynotFlow!=="manual_procurement")throw new Error("UNKNOWN_ORDER");
  const paymentIntent=await releaseExpiredAuthorization(stripe,session);session=await stripe.checkout.sessions.retrieve(sessionId,{expand:["payment_intent"]});
  const status=paymentIntent?.status==="succeeded"?"confirmed":paymentIntent?.status==="canceled"?"released":paymentIntent?.status==="requires_capture"?"confirming":"processing";
  const authorizedAt=Number(session.metadata?.authorizedAt||0)||(paymentIntent?.created||session.created)*1000;
  return NextResponse.json({status,title:session.metadata?.productTitle||"Your product",amount:(session.amount_total||0)/100,currency:String(session.currency||"eur").toUpperCase(),merchantOrderId:status==="confirmed"?session.metadata?.merchantOrderId||null:null,expiresAt:authorizedAt+approvalWindowMs()});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to check order"},{status:400})}
}
