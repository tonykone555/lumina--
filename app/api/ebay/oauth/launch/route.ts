import {NextRequest,NextResponse} from "next/server";
import {consumeEbayOwnerLink} from "@/lib/ebay/independent-store";
import {EBAY_OWNER_COOKIE,ownerPin,ownerSignature} from "@/lib/ebay/owner-session";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 const key=new URL(req.url).searchParams.get("key")||"";
 if(!key)return NextResponse.redirect(new URL("/ebay/connect?error=PRIVATE_LINK_REQUIRED",req.url));
 if(!ownerPin())return NextResponse.json({error:"EBAY_OWNER_SESSION_NOT_CONFIGURED"},{status:503});
 try{
  const consumed=await consumeEbayOwnerLink(key);
  if(!consumed)return NextResponse.json({error:"EBAY_LINK_INVALID_OR_ALREADY_USED",message:"The secure eBay link is invalid or has already been used."},{status:403});
  const expiry=String(Date.now()+30*60*1000);
  const response=NextResponse.redirect(new URL("/api/ebay/oauth/start",req.url));
  response.cookies.set(EBAY_OWNER_COOKIE,`${expiry}.${ownerSignature(expiry)}`,{httpOnly:true,secure:true,sameSite:"lax",path:"/api/ebay/oauth",maxAge:1800});
  response.headers.set("Cache-Control","no-store");
  return response;
 }catch{return NextResponse.json({error:"EBAY_INDEPENDENT_STORAGE_UNAVAILABLE"},{status:503})}
}
