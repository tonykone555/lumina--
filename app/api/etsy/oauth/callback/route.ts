import {NextRequest,NextResponse} from "next/server";
import {exchangeAuthorizationCode,setEtsyTokenCookies} from "@/lib/etsy/auth";

export const runtime="nodejs";

export async function GET(request:NextRequest){
 const url=new URL(request.url);
 const error=url.searchParams.get("error");
 const errorDescription=url.searchParams.get("error_description");
 if(error){
  const target=new URL("/",request.url);
  target.searchParams.set("etsy_oauth","error");
  target.searchParams.set("etsy_error",errorDescription||error);
  return NextResponse.redirect(target);
 }
 const code=url.searchParams.get("code")||"";
 const state=url.searchParams.get("state")||"";
 const expectedState=request.cookies.get("etsy_oauth_state")?.value||"";
 const verifier=request.cookies.get("etsy_oauth_verifier")?.value||"";
 if(!code||!state||!expectedState||state!==expectedState||!verifier){
  return NextResponse.json({error:"ETSY_OAUTH_STATE_INVALID"},{status:400});
 }
 try{
  const token=await exchangeAuthorizationCode(code,verifier);
  const target=new URL("/",request.url);
  target.searchParams.set("etsy_oauth","connected");
  const response=NextResponse.redirect(target);
  setEtsyTokenCookies(response,token);
  response.cookies.set("etsy_oauth_state","",{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:0});
  response.cookies.set("etsy_oauth_verifier","",{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:0});
  return response;
 }catch(error){
  const target=new URL("/",request.url);
  target.searchParams.set("etsy_oauth","error");
  target.searchParams.set("etsy_error",error instanceof Error?error.message:"ETSY_OAUTH_FAILED");
  return NextResponse.redirect(target);
 }
}
