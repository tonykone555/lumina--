import { NextResponse } from "next/server";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(){
  try {
    const r=await fetch("https://catalog.shopify.com/api/ucp/mcp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/list"}),cache:"no-store",signal:AbortSignal.timeout(12000)});
    const b=await r.json();
    return NextResponse.json({status:r.status,tools:(b?.result?.tools||[]).map((x:any)=>({name:x.name,description:String(x.description||"").slice(0,260),inputSchema:x.inputSchema}))});
  }catch(e){return NextResponse.json({error:String(e)},{status:502})}
}