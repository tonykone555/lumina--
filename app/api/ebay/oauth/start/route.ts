import {NextRequest,NextResponse} from "next/server";
import {EBAY_SCOPES,ebayAuthBase,ebayClientId,ebayLocale,ebayRuName,randomState} from "@/lib/ebay/auth";
import {validEbayOwnerSession} from "@/lib/ebay/owner-session";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:NextRequest){
 if(!validEbayOwnerSession(request))return NextResponse.redirect(new URL("/ebay/connect",request.url));
 const clientId=ebayClientId(),runame=ebayRuName();
 if(!clientId||!runame)return NextResponse.json({error:"EBAY_OAUTH_NOT_CONFIGURED",clientIdConfigured:Boolean(clientId),ruNameConfigured:Boolean(runame)},{status:503});
 const state=randomState(24);
 const params=new URLSearchParams({client_id:clientId,response_type:"code",redirect_uri:runame,scope:EBAY_SCOPES,state,locale:ebayLocale()});
 const response=NextResponse.redirect(`${ebayAuthBase()}/oauth2/authorize?${params.toString().replace(/\+/g,"%20")}`);
 response.headers.set("Cache-Control","no-store");
 response.cookies.set("ebay_oauth_state",state,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:600});
 return response;
}
