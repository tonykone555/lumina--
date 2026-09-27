import {NextRequest,NextResponse} from "next/server";
import {etsyRedirectUri,exchangeAuthorizationCode,setEtsyTokenCookies} from "@/lib/etsy/auth";
import {saveEtsyConnection} from "@/lib/etsy/oauth";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:NextRequest){
 const url=new URL(request.url);
 const error=url.searchParams.get("error");
 const errorDescription=url.searchParams.get("error_description");
 if(error){
  console.error("Etsy OAuth authorize error",JSON.stringify({error,error_description:errorDescription}));
  const target=new URL("/admin/etsy",request.url);
  target.searchParams.set("etsy_oauth","error");
  target.searchParams.set("etsy_error",errorDescription||error);
  return NextResponse.redirect(target);
 }
 const code=url.searchParams.get("code")||"";
 const state=url.searchParams.get("state")||"";
 const expectedState=request.cookies.get("etsy_oauth_state")?.value||"";
 const verifier=request.cookies.get("etsy_oauth_verifier")?.value||"";
 if(!code||!state||!expectedState||state!==expectedState||!verifier){
  console.error("Etsy OAuth callback state check failed",JSON.stringify({hasCode:Boolean(code),hasState:Boolean(state),hasStateCookie:Boolean(expectedState),stateMatches:Boolean(state)&&state===expectedState,hasVerifierCookie:Boolean(verifier)}));
  const target=new URL("/admin/etsy",request.url);
  target.searchParams.set("etsy_oauth","error");
  target.searchParams.set("etsy_error","ETSY_OAUTH_STATE_INVALID");
  return NextResponse.redirect(target);
 }
 try{
  const token=await exchangeAuthorizationCode(code,verifier,etsyRedirectUri());
  console.info("Etsy OAuth token exchange succeeded",JSON.stringify({etsyUserId:String(token.access_token||"").split(".")[0]||null,scope:token.scope||null}));
  if(!token.refresh_token)throw new Error("ETSY_REFRESH_TOKEN_MISSING");

  // The OAuth exchange itself is the source of truth for the current browser
  // session. Persisting to Supabase is desirable for server-side continuity,
  // but a storage outage/misconfiguration must not discard a valid Etsy login.
  let persistenceError="";
  try{
   await saveEtsyConnection({
    access_token:token.access_token,
    refresh_token:token.refresh_token,
    expires_in:Number(token.expires_in||3600),
    token_type:token.token_type,
    scope:token.scope
   });
  }catch(storageError){
   persistenceError=storageError instanceof Error?storageError.message:"ETSY_OAUTH_STORAGE_SAVE_FAILED";
   console.error("Etsy OAuth persistence failed",persistenceError);
  }

  const target=new URL("/admin/etsy",request.url);
  target.searchParams.set("etsy_oauth","connected");
  if(persistenceError)target.searchParams.set("etsy_storage","session_only");
  const response=NextResponse.redirect(target);
  setEtsyTokenCookies(response,token);
  response.cookies.set("etsy_oauth_state","",{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:0});
  response.cookies.set("etsy_oauth_verifier","",{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:0});
  return response;
 }catch(error){
  console.error("Etsy OAuth callback failed",error instanceof Error?error.message:error);
  const target=new URL("/admin/etsy",request.url);
  target.searchParams.set("etsy_oauth","error");
  target.searchParams.set("etsy_error",error instanceof Error?error.message:"ETSY_OAUTH_FAILED");
  return NextResponse.redirect(target);
 }
}
