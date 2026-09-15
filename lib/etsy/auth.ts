import {createHash,randomBytes} from "crypto";
import type {NextRequest,NextResponse} from "next/server";

export const ETSY_REDIRECT_URI="https://ynotworld.app/api/etsy/oauth/callback";
export const ETSY_SCOPES="listings_r shops_r";

export function etsyKeystring(){return process.env.ETSY_KEYSTRING||process.env.ETSY_API_KEYSTRING||""}
export function etsySharedSecret(){return process.env.ETSY_SHARED_SECRET||""}
export function etsyApiKey(){
 const key=etsyKeystring();
 const secret=etsySharedSecret();
 return key&&secret?`${key}:${secret}`:process.env.ETSY_API_KEY||key;
}
export function randomToken(bytes=32){return randomBytes(bytes).toString("base64url")}
export function pkceChallenge(verifier:string){return createHash("sha256").update(verifier).digest("base64url")}

export type EtsyTokenPayload={access_token:string;token_type?:string;expires_in?:number;refresh_token?:string;scope?:string};

export async function exchangeAuthorizationCode(code:string,verifier:string):Promise<EtsyTokenPayload>{
 const clientId=etsyKeystring();
 if(!clientId)throw new Error("ETSY_KEYSTRING_MISSING");
 const body=new URLSearchParams({grant_type:"authorization_code",client_id:clientId,redirect_uri:ETSY_REDIRECT_URI,code,code_verifier:verifier});
 const response=await fetch("https://api.etsy.com/v3/public/oauth/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body,cache:"no-store"});
 const data=await response.json().catch(()=>({})) as Partial<EtsyTokenPayload>&{error?:string;error_description?:string};
 if(!response.ok||!data.access_token)throw new Error(data.error_description||data.error||`ETSY_OAUTH_${response.status}`);
 return data as EtsyTokenPayload;
}

export async function refreshAccessToken(refreshToken:string):Promise<EtsyTokenPayload>{
 const clientId=etsyKeystring();
 if(!clientId)throw new Error("ETSY_KEYSTRING_MISSING");
 const body=new URLSearchParams({grant_type:"refresh_token",client_id:clientId,refresh_token:refreshToken});
 const response=await fetch("https://api.etsy.com/v3/public/oauth/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body,cache:"no-store"});
 const data=await response.json().catch(()=>({})) as Partial<EtsyTokenPayload>&{error?:string;error_description?:string};
 if(!response.ok||!data.access_token)throw new Error(data.error_description||data.error||`ETSY_REFRESH_${response.status}`);
 return data as EtsyTokenPayload;
}

export function setEtsyTokenCookies(response:NextResponse,token:EtsyTokenPayload){
 const secure=true;
 const maxAge=Math.max(60,Number(token.expires_in||3600));
 response.cookies.set("etsy_access_token",token.access_token,{httpOnly:true,secure,sameSite:"lax",path:"/",maxAge});
 if(token.refresh_token)response.cookies.set("etsy_refresh_token",token.refresh_token,{httpOnly:true,secure,sameSite:"lax",path:"/",maxAge:60*60*24*89});
 response.cookies.set("etsy_token_expires_at",String(Date.now()+maxAge*1000),{httpOnly:true,secure,sameSite:"lax",path:"/",maxAge});
}

export async function getEtsyAccessToken(request:NextRequest){
 const direct=process.env.ETSY_ACCESS_TOKEN||request.cookies.get("etsy_access_token")?.value||"";
 const refresh=process.env.ETSY_REFRESH_TOKEN||request.cookies.get("etsy_refresh_token")?.value||"";
 const expiresAt=Number(request.cookies.get("etsy_token_expires_at")?.value||0);
 if(direct&&(!expiresAt||expiresAt>Date.now()+60_000))return{accessToken:direct,refreshed:null as EtsyTokenPayload|null};
 if(refresh){
  try{const refreshed=await refreshAccessToken(refresh);return{accessToken:refreshed.access_token,refreshed}}catch{}
 }
 return{accessToken:direct,refreshed:null as EtsyTokenPayload|null};
}
