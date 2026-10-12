import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
export async function GET(req:NextRequest){
 const id=req.nextUrl.searchParams.get("id")||"gid://shopify/p/2f9oLRcDTSMmMBJVLIxHuY";
 if(!/^gid:\/\/shopify\//.test(id))return NextResponse.json({error:"Invalid id"},{status:400});
 try{
  const payload={jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"get_product",arguments:{meta:{"ucp-agent":{profile:"https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json"}},catalog:{id,context:{address_country:"CH",language:"fr-CH"}}}}};
  const r=await fetch("https://catalog.shopify.com/api/ucp/mcp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000),cache:"no-store"});
  const j=await r.json();return NextResponse.json({status:r.status,result:j?.result?.structuredContent||j?.result||j?.error||j});
 }catch(e){return NextResponse.json({error:String(e)},{status:502})}
}