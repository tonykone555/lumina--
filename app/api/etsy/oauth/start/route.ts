import {NextResponse} from "next/server";
import {ETSY_REDIRECT_URI,ETSY_SCOPES,etsyKeystring,pkceChallenge,randomToken} from "@/lib/etsy/auth";

export const runtime="nodejs";

export async function GET(){
 const clientId=etsyKeystring();
 if(!clientId)return NextResponse.json({error:"ETSY_KEYSTRING_MISSING"},{status:503});
 const state=randomToken(24);
 const verifier=randomToken(48);
 const challenge=pkceChallenge(verifier);
 const params=new URLSearchParams({
  response_type:"code",
  redirect_uri:ETSY_REDIRECT_URI,
  scope:ETSY_SCOPES,
  client_id:clientId,
  state,
  code_challenge:challenge,
  code_challenge_method:"S256"
 });
 const response=NextResponse.redirect(`https://www.etsy.com/oauth/connect?${params.toString()}`);
 response.cookies.set("etsy_oauth_state",state,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:600});
 response.cookies.set("etsy_oauth_verifier",verifier,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:600});
 return response;
}
