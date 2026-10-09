import {NextRequest,NextResponse} from "next/server";
import {ETSY_SCOPES,etsyKeystring,etsyRedirectUri,pkceChallenge,randomToken} from "@/lib/etsy/auth";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function requestHost(request:NextRequest){
 return (request.headers.get("x-forwarded-host")||request.headers.get("host")||new URL(request.url).host).split(",")[0].trim().toLowerCase();
}

export async function GET(request:NextRequest){
 const clientId=etsyKeystring();
 if(!clientId)return NextResponse.json({error:"ETSY_KEYSTRING_MISSING"},{status:503});
 const redirectUri=etsyRedirectUri();
 const callback=new URL(redirectUri);

 // The PKCE verifier and state live in host-only cookies. Etsy always returns
 // to the registered redirect URI, so start the flow on that same host or the
 // callback will not see the cookies (ETSY_OAUTH_STATE_INVALID).
 const url=new URL(request.url);
 if(requestHost(request)!==callback.host.toLowerCase()&&!url.searchParams.has("hop")){
  const target=new URL("/api/etsy/oauth/start",callback.origin);
  target.searchParams.set("hop","1");
  const returnTo=url.searchParams.get("returnTo");
  if(returnTo)target.searchParams.set("returnTo",returnTo);
  return NextResponse.redirect(target);
 }

 const state=randomToken(24);
 const verifier=randomToken(48);
 const challenge=pkceChallenge(verifier);
 const params=new URLSearchParams({
  response_type:"code",
  redirect_uri:redirectUri,
  scope:ETSY_SCOPES,
  client_id:clientId,
  state,
  code_challenge:challenge,
  code_challenge_method:"S256"
 });
 const response=NextResponse.redirect(`https://www.etsy.com/oauth/connect?${params.toString().replace(/\+/g,"%20")}`);
 response.headers.set("Cache-Control","no-store");
 response.cookies.set("etsy_oauth_state",state,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:600});
 response.cookies.set("etsy_oauth_verifier",verifier,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:600});
 const returnTo=url.searchParams.get("returnTo")||"/room/seller";
 response.cookies.set("etsy_oauth_return_to",returnTo.startsWith("/")?returnTo:"/room/seller",{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:600});
 return response;
}
