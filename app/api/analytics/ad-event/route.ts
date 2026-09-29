import {NextRequest,NextResponse} from "next/server";

const ALLOWED=new Set(["landing","room_open","camera_started","upload_started","photo_captured","scan_started","scan_completed","results_shown","product_opened","add_to_bag","checkout_started","purchase"]);
function clean(v:unknown,n=240){return typeof v==="string"?v.slice(0,n):null}
export async function POST(req:NextRequest){
 try{
  const body=await req.json();
  if(!ALLOWED.has(body?.event_type)||!body?.visitor_id||!body?.session_id)return NextResponse.json({ok:false},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return NextResponse.json({ok:false},{status:503});
  const country=clean(req.headers.get("x-vercel-ip-country"),8),city=clean(req.headers.get("x-vercel-ip-city"),100);
  const row={visitor_id:clean(body.visitor_id,80),session_id:clean(body.session_id,80),event_type:body.event_type,path:clean(body.path,300),source:clean(body.source,100),medium:clean(body.medium,100),campaign:clean(body.campaign,180),campaign_id:clean(body.campaign_id,180),adset_id:clean(body.adset_id,180),ad_id:clean(body.ad_id,180),ad_name:clean(body.ad_name,180),fbclid:clean(body.fbclid,300),ttclid:clean(body.ttclid,300),gclid:clean(body.gclid,300),referrer:clean(body.referrer,500),country,city,device:clean(body.device,40),metadata:body.metadata&&typeof body.metadata==="object"?body.metadata:{}};
  const r=await fetch(`${url.replace(/\/$/,"")}/rest/v1/ynot_ad_traffic_events`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(row),cache:"no-store"});
  return NextResponse.json({ok:r.ok},{status:r.ok?200:500});
 }catch{return NextResponse.json({ok:false},{status:400})}
}
