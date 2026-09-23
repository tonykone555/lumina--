import { NextRequest,NextResponse } from "next/server";
import { buildViralCreativeBrief,clearTrend,rankProductsForTrend,type ProductCandidate,type SocialSignal } from "@/lib/ai/viral-intelligence";
export const runtime="nodejs";

export async function POST(req:NextRequest){
 try{
  const body=await req.json();
  const action=String(body?.action||"clearance");
  if(action==="clearance"){
   const signal=body?.signal as SocialSignal;
   if(!signal?.platform)return NextResponse.json({error:"signal.platform required"},{status:400});
   return NextResponse.json({decisions:await clearTrend(signal,body?.product as ProductCandidate|undefined)});
  }
  if(action==="rank-products"){
   const signal=body?.signal as SocialSignal; const products=Array.isArray(body?.products)?body.products:[];
   if(!signal?.platform)return NextResponse.json({error:"signal.platform required"},{status:400});
   return NextResponse.json({ranking:await rankProductsForTrend(signal,products)});
  }
  if(action==="creative-brief"){
   const product=body?.product as ProductCandidate; const signals=Array.isArray(body?.signals)?body.signals:[];
   if(!product?.id)return NextResponse.json({error:"product.id required"},{status:400});
   return NextResponse.json({brief:await buildViralCreativeBrief(product,signals)});
  }
  return NextResponse.json({error:"Unknown viral intelligence action"},{status:400});
 }catch{return NextResponse.json({error:"Invalid viral intelligence request"},{status:400})}
}
