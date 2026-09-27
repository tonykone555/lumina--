import {etsyApiKey} from "@/lib/etsy/auth";

const ETSY_BASE="https://api.etsy.com/v3/application";

export async function etsyRequest<T>(path:string,accessToken:string,init:RequestInit={}):Promise<T>{
 const apiKey=etsyApiKey();
 if(!apiKey)throw new Error("ETSY_API_KEY_MISSING");
 if(!accessToken)throw new Error("ETSY_OAUTH_REQUIRED");
 const response=await fetch(`${ETSY_BASE}${path}`,{
  ...init,
  headers:{"x-api-key":apiKey,Authorization:`Bearer ${accessToken}`,...(init.headers||{})},
  cache:"no-store"
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok){
  const message=String(data?.error_description||data?.error||data?.message||`ETSY_${response.status}`).slice(0,500);
  throw new Error(message);
 }
 return data as T;
}

export async function getEtsyShop(accessToken:string,shopId:number){
 return etsyRequest(`/shops/${shopId}`,accessToken);
}
