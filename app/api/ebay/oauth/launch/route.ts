import {NextRequest,NextResponse} from "next/server";
import {consumeEbayOwnerLink} from "@/lib/ebay/independent-store";
import {EBAY_OWNER_COOKIE,ownerPin,ownerSignature} from "@/lib/ebay/owner-session";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 const key=new URL(req.url).searchParams.get("key")||"";
 if(!/^[a-zA-Z0-9_-]{32,128}$/.test(key))return NextResponse.redirect(new URL("/ebay/connect?error=PRIVATE_LINK_REQUIRED",req.url));
 const html=`<!doctype html><html><head><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:system-ui;margin:12vh auto;max-width:500px;padding:20px"><h1>Connecting YNOT to eBay</h1><p>Opening eBay's secure authorization page…</p><form id="start" action="/api/ebay/oauth/launch" method="post"><input type="hidden" name="key" value="${key}"><button type="submit">Continue to eBay</button></form><script>document.getElementById("start").submit()</script></body></html>`;
 return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex,nofollow"}});
}
export async function POST(req:NextRequest){
 const origin=req.headers.get("origin"),referer=req.headers.get("referer");
 // Safari and privacy-focused browsers can send the literal Origin "null".
 // The unguessable single-use link remains the authorization capability.
 const safeHost=(value:string|null)=>{
  if(!value||value==="null")return null;
  try{return new URL(value).host}catch{return null}
 };
 if(origin&&origin!=="null"&&safeHost(origin)!==req.nextUrl.host)return NextResponse.json({error:"INVALID_ORIGIN"},{status:403});
 if(referer&&referer!=="null"&&safeHost(referer)!==req.nextUrl.host)return NextResponse.json({error:"INVALID_REFERER"},{status:403});
 const form=await req.formData().catch(()=>null),key=String(form?.get("key")||"");
 if(!ownerPin())return NextResponse.json({error:"EBAY_OWNER_SESSION_NOT_CONFIGURED"},{status:503});
 try{
  const consumed=await consumeEbayOwnerLink(key);
  if(!consumed)return NextResponse.json({error:"EBAY_LINK_INVALID_OR_ALREADY_USED",message:"The private link is invalid or has already been used."},{status:403});
  const expiry=String(Date.now()+30*60*1000);
  const response=NextResponse.redirect(new URL("/api/ebay/oauth/start",req.url),303);
  response.cookies.set(EBAY_OWNER_COOKIE,`${expiry}.${ownerSignature(expiry)}`,{httpOnly:true,secure:true,sameSite:"lax",path:"/api/ebay/oauth",maxAge:1800});
  response.headers.set("Cache-Control","no-store");
  return response;
 }catch{return NextResponse.json({error:"EBAY_INDEPENDENT_STORAGE_UNAVAILABLE"},{status:503})}
}
