import {EBAY_SCOPES,EbayTokenPayload,ebayClientId,ebayClientSecret,ebayRuName,refreshEbayAccessToken} from "@/lib/ebay/auth";

type StoredConnection={
 id:string;
 access_token:string;
 refresh_token:string;
 scope?:string|null;
 expires_at:string;
 refresh_token_expires_at?:string|null;
 connected_at?:string;
 updated_at?:string;
};

function supabaseUrl(){return String(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||"").trim().replace(/\/$/,"")}
function supabaseServiceKey(){return String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||"").trim()}
function dbHeaders(extra:Record<string,string>={}){
 const key=supabaseServiceKey();
 return {apikey:key,...(key.startsWith("sb_")?{}:{Authorization:`Bearer ${key}`}),"Content-Type":"application/json",...extra};
}

export function ebayOauthReady(){return Boolean(ebayClientId()&&ebayClientSecret()&&ebayRuName())}
export function ebayOauthStorageReady(){return Boolean(supabaseUrl()&&supabaseServiceKey())}

export async function readEbayConnection():Promise<StoredConnection|null>{
 const url=supabaseUrl(),key=supabaseServiceKey();
 if(!url||!key)return null;
 const response=await fetch(`${url}/rest/v1/ebay_oauth_connections?id=eq.primary&select=*`,{headers:dbHeaders(),cache:"no-store"});
 if(!response.ok){
  const detail=await response.text().catch(()=>"");
  throw new Error(`EBAY_OAUTH_STORAGE_READ_${response.status}${detail?`_${detail.slice(0,180)}`:""}`);
 }
 const rows=await response.json() as StoredConnection[];
 return rows[0]||null;
}

export async function saveEbayConnection(token:EbayTokenPayload){
 const url=supabaseUrl(),key=supabaseServiceKey();
 if(!url||!key)throw new Error("EBAY_OAUTH_STORAGE_NOT_CONFIGURED");
 if(!token.refresh_token)throw new Error("EBAY_REFRESH_TOKEN_MISSING");
 const now=Date.now();
 const body={
  id:"primary",
  access_token:token.access_token,
  refresh_token:token.refresh_token,
  scope:token.scope||EBAY_SCOPES,
  expires_at:new Date(now+Math.max(60,Number(token.expires_in||7200))*1000).toISOString(),
  refresh_token_expires_at:token.refresh_token_expires_in?new Date(now+Number(token.refresh_token_expires_in)*1000).toISOString():null,
  updated_at:new Date(now).toISOString()
 };
 const response=await fetch(`${url}/rest/v1/ebay_oauth_connections?on_conflict=id`,{
  method:"POST",headers:dbHeaders({Prefer:"resolution=merge-duplicates,return=minimal"}),body:JSON.stringify(body),cache:"no-store"
 });
 if(!response.ok){
  const detail=await response.text().catch(()=>"");
  throw new Error(`EBAY_OAUTH_STORAGE_${response.status}${detail?`_${detail.slice(0,180)}`:""}`);
 }
 return body;
}

export async function deleteEbayConnection(){
 const url=supabaseUrl(),key=supabaseServiceKey();
 if(!url||!key)return;
 await fetch(`${url}/rest/v1/ebay_oauth_connections?id=eq.primary`,{method:"DELETE",headers:dbHeaders(),cache:"no-store"});
}

export async function getEbayAccessToken(){
 const direct=String(process.env.EBAY_USER_ACCESS_TOKEN||"").trim();
 if(direct)return direct;
 const connection=await readEbayConnection();
 if(!connection)throw new Error("EBAY_NOT_CONNECTED");
 const expires=new Date(connection.expires_at).getTime();
 if(Number.isFinite(expires)&&expires-Date.now()>120_000)return connection.access_token;
 const refreshed=await refreshEbayAccessToken(connection.refresh_token);
 await saveEbayConnection({...refreshed,refresh_token:refreshed.refresh_token||connection.refresh_token,scope:refreshed.scope||connection.scope||EBAY_SCOPES});
 return refreshed.access_token;
}
