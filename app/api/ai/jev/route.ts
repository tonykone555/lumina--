import { NextRequest,NextResponse } from "next/server";
import { decideYnot,type JevDecisionKind } from "@/lib/ai/jev";

export const runtime="nodejs";

const ALLOWED:JevDecisionKind[]=[
 "catalogue","economics","supplier","search","personalization","payment_presentation",
 "creator_match","commission","creative_route","ad_action","creative_qc","fulfillment",
 "trend_relevance","viral_pattern","product_trend_fit","pitch_angle","prompt_strategy"
];

export async function POST(req:NextRequest){
 try{
  const body=await req.json();
  const requested=Array.isArray(body?.decisions)?body.decisions.filter((x:unknown):x is JevDecisionKind=>typeof x==="string"&&ALLOWED.includes(x as JevDecisionKind)):ALLOWED;
  const context=body?.context&&typeof body.context==="object"?body.context:{};
  const decisions=await decideYnot(context,requested);
  return NextResponse.json({enabled:Boolean(process.env.TYPESAFE_API_KEY),decisions});
 }catch{
  return NextResponse.json({error:"Invalid Jev decision request"},{status:400});
 }
}
