import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 try{
  const body=await request.json();
  const p=body?.product;
  if(!p||typeof p.id!=="string"||typeof p.title!=="string"||p.id.length>200||p.title.length>500) return NextResponse.json({error:"INVALID_PRODUCT"},{status:400});
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return NextResponse.json({error:"QUEUE_UNAVAILABLE"},{status:503});
  const product={id:p.id,title:p.title,brand:String(p.brand||"").slice(0,300),price:typeof p.price==="number"?p.price:null,currency:String(p.currency||"EUR").slice(0,5),image:String(p.image||"").slice(0,2000),url:String(p.url||"").slice(0,2000),source:String(p.source||"").slice(0,80)};
  const response=await fetch(url.replace(/\/$/,"")+"/rest/v1/ynot_grok_product_queue?on_conflict=product_id",{
   method:"POST",headers:{"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=representation"},
   body:JSON.stringify({product_id:product.id,product,status:"pending",review:null,updated_at:new Date().toISOString()}),cache:"no-store"
  });
  if(!response.ok)return NextResponse.json({error:"QUEUE_SAVE_FAILED"},{status:502});
  const rows=await response.json();return NextResponse.json({queued:true,id:rows[0]?.id,status:"pending"});
 }catch{return NextResponse.json({error:"QUEUE_REQUEST_FAILED"},{status:500})}
}
