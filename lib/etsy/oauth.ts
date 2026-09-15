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

function supabaseUrl(){return process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||""}
function supabaseServiceKey(){return process.env.SUPABASE_SERVICE_ROLE_KEY||""}

export function etsyKeystring(){
 const explicit=process.env.ETSY_API_KEYSTRING||"";
 if(explicit)return explicit;
 const combined=process.env.ETSY_API_KEY||"";
 return combined.includes(":")?combined.split(":",1)[0]:combined;
}

export function etsyApiHeader(){
 const combined=process.env.ETSY_API_KEY||"";
 if(combined.includes(":"))return combined;
 const key=etsyKeystring();
 const secret=process.env.ETSY_SHARED_SECRET||process.env.ETSY_API_SHARED_SECRET||"";
 return key&&secret?`${key}:${secret}`:combined||key;
}

function dbHeaders(extra:Record<string,string>={}){
 const key=supabaseServiceKey();
 return {apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",...extra};
}

export function etsyOauthReady(){return Boolean(etsyKeystring()&&supabaseUrl()&&supabaseServiceKey())}

export async function readEtsyConnection():Promise<EtsyStoredConnection|null>{
 const url=supabaseUrl(),key=supabaseServiceKey();
 if(!url||!key)return null;
 const response=await fetch(`${url}/rest/v1/etsy_oauth_connections?id=eq.primary&select=*`,{headers:dbHeaders(),cache:"no-store"});
 if(!response.ok)return null;
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
 if(!response.ok)throw new Error(`ETSY_OAUTH_STORAGE_${response.status}`);
 return body;
}

export async function deleteEtsyConnection(){
 const url=supabaseUrl(),key=supabaseServiceKey();
 if(!url||!key)return;
 await fetch(`${url}/rest/v1/etsy_oauth_connections?id=eq.primary`,{method:"DELETE",headers:dbHeaders(),cache:"no-store"});
}

async function refresh(connection:EtsyStoredConnection){
 const clientId=etsyKeystring();
 if(!clientId||!connection.refresh_token)throw new Error("ETSY_REFRESH_UNAVAILABLE");
 const body=new URLSearchParams({grant_type:"refresh_token",client_id:clientId,refresh_token:connection.refresh_token});
 const response=await fetch("https://api.etsy.com/v3/public/oauth/token",{
  method:"POST",
  headers:{"Content-Type":"application/x-www-form-urlencoded"},
  body,
  cache:"no-store"
 });
 const data=await response.json().catch(()=>({})) as Partial<EtsyTokenResponse>&{error?:string};
 if(!response.ok||!data.access_token||!data.refresh_token)throw new Error(data.error||`ETSY_REFRESH_${response.status}`);
 await saveEtsyConnection(data as EtsyTokenResponse);
 return data.access_token;
}

export async function getEtsyAccessToken(){
 const connection=await readEtsyConnection();
 if(connection){
  const expires=new Date(connection.expires_at).getTime();
  if(Number.isFinite(expires)&&expires-Date.now()>120_000)return connection.access_token;
  try{return await refresh(connection)}catch{return connection.access_token}
 }
 return process.env.ETSY_ACCESS_TOKEN||"";
}

export async function exchangeEtsyCode(args:{code:string;codeVerifier:string;redirectUri:string}){
 const clientId=etsyKeystring();
 if(!clientId)throw new Error("ETSY_API_KEYSTRING_MISSING");
 const body=new URLSearchParams({
  grant_type:"authorization_code",
  client_id:clientId,
  redirect_uri:args.redirectUri,
  code:args.code,
  code_verifier:args.codeVerifier
 });
 const response=await fetch("https://api.etsy.com/v3/public/oauth/token",{
  method:"POST",
  headers:{"Content-Type":"application/x-www-form-urlencoded"},
  body,
  cache:"no-store"
 });
 const data=await response.json().catch(()=>({})) as Partial<EtsyTokenResponse>&{error?:string;error_description?:string};
 if(!response.ok||!data.access_token||!data.refresh_token)throw new Error(data.error_description||data.error||`ETSY_OAUTH_${response.status}`);
 await saveEtsyConnection(data as EtsyTokenResponse);
 return data as EtsyTokenResponse;
}
