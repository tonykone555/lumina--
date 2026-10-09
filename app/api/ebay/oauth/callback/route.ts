import {NextRequest,NextResponse} from "next/server";
import {exchangeEbayAuthorizationCode} from "@/lib/ebay/auth";
import {saveEbayConnection} from "@/lib/ebay/oauth";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:NextRequest){
 const url=new URL(request.url);
 const error=url.searchParams.get("error");
 const errorDescription=url.searchParams.get("error_description");
 if(error)return NextResponse.json({connected:false,error,errorDescription},{status:400});
 const code=url.searchParams.get("code")||"";
 const state=url.searchParams.get("state")||"";
 const expected=request.cookies.get("ebay_oauth_state")?.value||"";
 if(!code||!state||!expected||state!==expected)return NextResponse.json({connected:false,error:"EBAY_OAUTH_STATE_INVALID"},{status:400});
 try{
  const token=await exchangeEbayAuthorizationCode(code);
  let persistent=true;
  try{await saveEbayConnection(token)}catch(error){
   persistent=false;
   console.warn("eBay OAuth Supabase persistence unavailable; keeping secure browser session",error instanceof Error?error.message:error);
  }
  const response=NextResponse.redirect(new URL(`/api/ebay/oauth/status?verify=1&storage=${persistent?"persistent":"session_only"}`,request.url));
  const maxAge=Math.max(60,Number(token.expires_in||7200));
  response.cookies.set("ebay_access_token",token.access_token,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge});
  if(token.refresh_token)response.cookies.set("ebay_refresh_token",token.refresh_token,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:60*60*24*500});
  response.cookies.set("ebay_token_expires_at",String(Date.now()+maxAge*1000),{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge});
  response.cookies.set("ebay_oauth_state","",{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:0});
  return response;
 }catch(error){
  console.error("eBay OAuth callback failed",error instanceof Error?error.message:error);
  return NextResponse.json({connected:false,error:error instanceof Error?error.message:"EBAY_OAUTH_FAILED"},{status:500});
 }
}
