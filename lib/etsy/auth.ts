import {createHash,randomBytes} from "crypto";
import type {NextRequest,NextResponse} from "next/server";

// Environment values pasted into hosting dashboards frequently carry stray
// whitespace (a leading tab/space or trailing newline). HTTP header values are
// normalised by fetch, but form-encoded OAuth fields and URL query params are
// not: a keystring of "\t<key>" is sent as client_id=%09<key> and Etsy rejects
// the token exchange with "Invalid API key". Always trim Etsy config values.
function env(...names:string[]){
 for(const name of names){const value=String(process.env[name]||"").trim();if(value)return value}
 return "";
}
function combinedApiKey(){return env("ETSY_API_KEY")}

export const ETSY_DEFAULT_REDIRECT_URI="https://ynotworld.app/api/etsy/oauth/callback";
// Must exactly match a Callback URL registered on the Etsy app (etsy.com/developers/your-apps).
export function etsyRedirectUri(){return env("ETSY_REDIRECT_URI")||ETSY_DEFAULT_REDIRECT_URI}
export const ETSY_REDIRECT_URI=ETSY_DEFAULT_REDIRECT_URI;
export const ETSY_SCOPES="listings_r listings_w shops_r shops_w";
export const ETSY_TOKEN_URL="https://api.etsy.com/v3/public/oauth/token";

export function etsyKeystring(){
 const explicit=env("ETSY_KEYSTRING","ETSY_API_KEYSTRING");
 if(explicit)return explicit;
 const combined=combinedApiKey();
 return (combined.includes(":")?combined.split(":",1)[0]:combined).trim();
}
export function etsySharedSecret(){
 const explicit=env("ETSY_SHARED_SECRET","ETSY_API_SHARED_SECRET");
 if(explicit)return explicit;
 const combined=combinedApiKey();
 return combined.includes(":")?combined.slice(combined.indexOf(":")+1).trim():"";
}
// Etsy Open API v3 requires `x-api-key: <keystring>:<shared_secret>` on every request.
export function etsyApiKey(){
 const key=etsyKeystring();
 const secret=etsySharedSecret();
 return key&&secret?`${key}:${secret}`:key;
}
// Non-secret diagnostics about the Etsy configuration.
export function etsyConfigDiagnostics(){
 const raw=[process.env.ETSY_KEYSTRING,process.env.ETSY_API_KEYSTRING,process.env.ETSY_API_KEY,process.env.ETSY_SHARED_SECRET,process.env.ETSY_API_SHARED_SECRET,process.env.ETSY_REDIRECT_URI].filter((v):v is string=>typeof v==="string"&&v.length>0);
 return{
  keystringConfigured:Boolean(etsyKeystring()),
  sharedSecretConfigured:Boolean(etsySharedSecret()),
  envWhitespaceTrimmed:raw.some(v=>v!==v.trim()),
  redirectUri:etsyRedirectUri(),
  scopes:ETSY_SCOPES
 };
}
export function randomToken(bytes=32){return randomBytes(bytes).toString("base64url")}
export function pkceChallenge(verifier:string){return createHash("sha256").update(verifier).digest("base64url")}

export type EtsyTokenPayload={access_token:string;token_type?:string;expires_in?:number;refresh_token?:string;scope?:string};

async function tokenRequest(params:Record<string,string>,label:string):Promise<EtsyTokenPayload>{
 const response=await fetch(ETSY_TOKEN_URL,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded",Accept:"application/json"},body:new URLSearchParams(params),cache:"no-store"});
 const text=await response.text().catch(()=>"");
 let data:Partial<EtsyTokenPayload>&{error?:string;error_description?:string}={};
 try{data=text?JSON.parse(text):{}}catch{}
 if(!response.ok||!data.access_token){
  // Log only Etsy's error fields, never tokens or secrets.
  console.error(`Etsy ${label} failed`,JSON.stringify({status:response.status,error:data.error||null,error_description:data.error_description||(data.error?null:text.slice(0,300))}));
  throw new Error(data.error_description||data.error||`ETSY_${label.toUpperCase()}_${response.status}`);
 }
 return data as EtsyTokenPayload;
}

export async function exchangeAuthorizationCode(code:string,verifier:string,redirectUri=etsyRedirectUri()):Promise<EtsyTokenPayload>{
 const clientId=etsyKeystring();
 if(!clientId)throw new Error("ETSY_KEYSTRING_MISSING");
 return tokenRequest({grant_type:"authorization_code",client_id:clientId,redirect_uri:redirectUri,code,code_verifier:verifier},"oauth");
}

export async function refreshAccessToken(refreshToken:string):Promise<EtsyTokenPayload>{
 const clientId=etsyKeystring();
 if(!clientId)throw new Error("ETSY_KEYSTRING_MISSING");
 return tokenRequest({grant_type:"refresh_token",client_id:clientId,refresh_token:refreshToken},"refresh");
}

export function setEtsyTokenCookies(response:NextResponse,token:EtsyTokenPayload){
 const secure=true;
 const maxAge=Math.max(60,Number(token.expires_in||3600));
 response.cookies.set("etsy_access_token",token.access_token,{httpOnly:true,secure,sameSite:"lax",path:"/",maxAge});
 if(token.refresh_token)response.cookies.set("etsy_refresh_token",token.refresh_token,{httpOnly:true,secure,sameSite:"lax",path:"/",maxAge:60*60*24*89});
 response.cookies.set("etsy_token_expires_at",String(Date.now()+maxAge*1000),{httpOnly:true,secure,sameSite:"lax",path:"/",maxAge});
}

export async function getEtsyAccessToken(request:NextRequest){
 const direct=env("ETSY_ACCESS_TOKEN")||request.cookies.get("etsy_access_token")?.value||"";
 const refresh=env("ETSY_REFRESH_TOKEN")||request.cookies.get("etsy_refresh_token")?.value||"";
 const expiresAt=Number(request.cookies.get("etsy_token_expires_at")?.value||0);
 if(direct&&(!expiresAt||expiresAt>Date.now()+60_000))return{accessToken:direct,refreshed:null as EtsyTokenPayload|null};
 if(refresh){
  try{const refreshed=await refreshAccessToken(refresh);return{accessToken:refreshed.access_token,refreshed}}catch{}
 }
 return{accessToken:direct,refreshed:null as EtsyTokenPayload|null};
}
