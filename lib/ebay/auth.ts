import {randomBytes} from "crypto";

function env(...names:string[]){
 for(const name of names){const value=String(process.env[name]||"").trim();if(value)return value}
 return "";
}

export const EBAY_SCOPES=[
 "https://api.ebay.com/oauth/api_scope/sell.account",
 "https://api.ebay.com/oauth/api_scope/sell.inventory"
].join(" ");

export function ebayClientId(){return env("EBAY_CLIENT_ID")}
export function ebayClientSecret(){return env("EBAY_CLIENT_SECRET")}
export function ebayRuName(){return env("EBAY_RUNAME","EBAY_REDIRECT_URI")}
export function ebayMarketplaceId(){return env("EBAY_MARKETPLACE_ID")||"EBAY_FR"}
export function ebayLocale(){return env("EBAY_LOCALE")||"fr-FR"}
export function ebayApiBase(){return env("EBAY_API_BASE")||"https://api.ebay.com"}
export function ebayAuthBase(){return env("EBAY_AUTH_BASE")||"https://auth.ebay.com"}
export function randomState(bytes=32){return randomBytes(bytes).toString("base64url")}

export type EbayTokenPayload={
 access_token:string;
 expires_in:number;
 refresh_token?:string;
 refresh_token_expires_in?:number;
 token_type?:string;
 scope?:string;
};

function basicAuth(){
 const id=ebayClientId(),secret=ebayClientSecret();
 if(!id||!secret)throw new Error("EBAY_CLIENT_CREDENTIALS_MISSING");
 return Buffer.from(`${id}:${secret}`,"utf8").toString("base64");
}

async function tokenRequest(params:Record<string,string>,label:string):Promise<EbayTokenPayload>{
 const response=await fetch(`${ebayApiBase()}/identity/v1/oauth2/token`,{
  method:"POST",
  headers:{Authorization:`Basic ${basicAuth()}`,"Content-Type":"application/x-www-form-urlencoded",Accept:"application/json"},
  body:new URLSearchParams(params),
  cache:"no-store"
 });
 const text=await response.text().catch(()=>"");
 let data:any={};
 try{data=text?JSON.parse(text):{}}catch{}
 if(!response.ok||!data.access_token){
  console.error(`eBay ${label} failed`,JSON.stringify({status:response.status,error:data?.error||null,error_description:data?.error_description||null}));
  throw new Error(data?.error_description||data?.error||`EBAY_${label.toUpperCase()}_${response.status}`);
 }
 return data as EbayTokenPayload;
}

export async function exchangeEbayAuthorizationCode(code:string){
 const runame=ebayRuName();
 if(!runame)throw new Error("EBAY_RUNAME_MISSING");
 return tokenRequest({grant_type:"authorization_code",code,redirect_uri:runame},"oauth");
}

export async function refreshEbayAccessToken(refreshToken:string){
 return tokenRequest({grant_type:"refresh_token",refresh_token:refreshToken,scope:EBAY_SCOPES},"refresh");
}

export function ebayConfigDiagnostics(){
 return{
  clientIdConfigured:Boolean(ebayClientId()),
  clientSecretConfigured:Boolean(ebayClientSecret()),
  ruNameConfigured:Boolean(ebayRuName()),
  marketplaceId:ebayMarketplaceId(),
  locale:ebayLocale(),
  scopes:EBAY_SCOPES
 };
}
