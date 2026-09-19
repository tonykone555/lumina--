import {NextRequest,NextResponse} from "next/server";
import {recordCommerceEvent} from "@/lib/commerce/catalog-store";

export const runtime="nodejs";

const ALLOWED=new Set(["view","feed_click","checkout_start","purchase_intent","supplier_open"]);

export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    const eventType=String(body?.eventType||"");
    if(!ALLOWED.has(eventType))return NextResponse.json({error:"INVALID_EVENT"},{status:400});
    const event=await recordCommerceEvent({
      eventType,
      ynotId:body?.ynotId?String(body.ynotId):null,
      source:body?.source?String(body.source).slice(0,80):null,
      country:body?.country?String(body.country).slice(0,2).toUpperCase():null,
      value:Number.isFinite(Number(body?.value))?Number(body.value):null,
      currency:body?.currency?String(body.currency).slice(0,3).toUpperCase():null,
      sessionId:body?.sessionId?String(body.sessionId).slice(0,200):null,
      metadata:body?.metadata&&typeof body.metadata==="object"?body.metadata:{}
    });
    return NextResponse.json({ok:true,id:event.id||null});
  }catch(error){
    console.error("YNOT event write failed",error);
    return NextResponse.json({ok:false},{status:200});
  }
}
