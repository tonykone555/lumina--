import {etsyApiKey,etsyKeystring,exchangeAuthorizationCode,refreshAccessToken} from "@/lib/etsy/auth";

type EtsyStoredConnection={
 id:string;
 etsy_user_id?:string|null;
 access_token:string;
 refresh_token:string;
 scope?:string|null;
 expires_at:string;
 connected_at?:string;
 updated_at?:string;
};

type EtsyTokenResponse={access_token:string;token_type?:string;expires_in:number;refresh_token:string;scope?:string};

function supabaseUrl(){return String(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||"").trim().replace(/\/$/,"")}
function supabaseServiceKey(){return String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||"").trim()}

// Single source of truth for (trimmed) Etsy credentials lives in lib/etsy/auth.
export {etsyKeystring};
export function etsyApiHeader(){return etsyApiKey()}

function dbHeaders(extra:Record<string,string>={}){
 const key=supabaseServiceKey();
 // New-style Supabase secret keys (sb_...) are not JWTs and must only be sent as
 // `apikey`; legacy service-role JWTs are also sent as a Bearer token.
 return {apikey:key,...(key.startsWith("sb_")?{}:{Authorization:`Bearer ${key}`}),"Content-Type":"application/json",...extra};
}

// OAuth can work for the current browser session without Supabase persistence.
// Storage is only required for persistent/server-side continuity, not to enable
// the Connect Etsy button or to consider the Etsy app configured.
export function etsyOauthReady(){return Boolean(etsyKeystring())}
export function etsyOauthStorageReady(){return Boolean(supabaseUrl()&&supabaseServiceKey())}

export async function readEtsyConnection():Promise<EtsyStoredConnection|null>{
 const url=supabaseUrl(),key=supabaseServiceKey();
 if(!url||!key)return null;
 const response=await fetch(`${url}/rest/v1/etsy_oauth_connections?id=eq.primary&select=*`,{headers:dbHeaders(),cache:"no-store"});
 if(!response.ok){
  const detail=await response.text().catch(()=>"");
  throw new Error(`ETSY_OAUTH_STORAGE_READ_${response.status}${detail?`_${detail.slice(0,180)}`:""}`);
 }
 const rows=await response.json() as EtsyStoredConnection[];
 return rows[0]||null;
}

export async function saveEtsyConnection(token:EtsyTokenResponse){
 const url=supabaseUrl(),key=supabaseServiceKey();
 if(!url||!key)throw new Error("ETSY_OAUTH_STORAGE_NOT_CONFIGURED");
 const userId=String(token.access_token||"").split(".")[0]||null;
 const now=Date.now();
 const body={
  id:"primary",
  etsy_user_id:userId,
  access_token:token.access_token,
  refresh_token:token.refresh_token,
  scope:token.scope||null,
  expires_at:new Date(now+Math.max(60,Number(token.expires_in||3600))*1000).toISOString(),
  updated_at:new Date(now).toISOString()
 };
 const response=await fetch(`${url}/rest/v1/etsy_oauth_connections?on_conflict=id`,{
  method:"POST",
  headers:dbHeaders({Prefer:"resolution=merge-duplicates,return=minimal"}),
  body:JSON.stringify(body),
  cache:"no-store"
 });
 if(!response.ok){
  const detail=await response.text().catch(()=>"");
  throw new Error(`ETSY_OAUTH_STORAGE_${response.status}${detail?`_${detail.slice(0,180)}`:""}`);
 }
 return body;
}

export async function deleteEtsyConnection(){
 const url=supabaseUrl(),key=supabaseServiceKey();
 if(!url||!key)return;
 await fetch(`${url}/rest/v1/etsy_oauth_connections?id=eq.primary`,{method:"DELETE",headers:dbHeaders(),cache:"no-store"});
}

async function refresh(connection:EtsyStoredConnection){
 if(!etsyKeystring()||!connection.refresh_token)throw new Error("ETSY_REFRESH_UNAVAILABLE");
 const data=await refreshAccessToken(connection.refresh_token);
 if(!data.refresh_token)throw new Error("ETSY_REFRESH_TOKEN_MISSING");
 await saveEtsyConnection({access_token:data.access_token,refresh_token:data.refresh_token,expires_in:Number(data.expires_in||3600),token_type:data.token_type,scope:data.scope||connection.scope||undefined});
 return data.access_token;
}

export async function getEtsyAccessToken(){
 let connection:EtsyStoredConnection|null=null;
 try{connection=await readEtsyConnection()}catch(error){console.error("Etsy OAuth storage read failed",error instanceof Error?error.message:error)}
 if(connection){
  const expires=new Date(connection.expires_at).getTime();
  if(Number.isFinite(expires)&&expires-Date.now()>120_000)return connection.access_token;
  try{return await refresh(connection)}catch(error){console.error("Etsy token refresh failed",error instanceof Error?error.message:error);return connection.access_token}
 }
 return String(process.env.ETSY_ACCESS_TOKEN||"").trim();
}

export async function exchangeEtsyCode(args:{code:string;codeVerifier:string;redirectUri:string}){
 const data=await exchangeAuthorizationCode(args.code,args.codeVerifier,args.redirectUri);
 if(!data.refresh_token)throw new Error("ETSY_REFRESH_TOKEN_MISSING");
 const token:EtsyTokenResponse={access_token:data.access_token,refresh_token:data.refresh_token,expires_in:Number(data.expires_in||3600),token_type:data.token_type,scope:data.scope};
 await saveEtsyConnection(token);
 return token;
}
