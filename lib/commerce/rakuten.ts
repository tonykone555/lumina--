import "server-only";

const BASE_URL = "https://api.linksynergy.com";
const RAKUTEN_ACCOUNT_ID = process.env.RAKUTEN_ACCOUNT_ID?.trim() || "4756570";

export type RakutenProduct = {
  id: string; source: "rakuten"; title: string; description?: string; image?: string; images: string[];
  price?: number; salePrice?: number; currency?: string; url?: string; sku?: string; upc?: string;
  category?: string; subcategory?: string; merchantId?: string; merchantName?: string; affiliate: true;
};

export type RakutenAdvertiser = {
  id: string; name: string; network?: number; status?: string; categories?: string[];
  partnershipStatus?: string; partnered: boolean;
};

type TokenResponse = { access_token: string; expires_in?: number; refresh_token?: string; token_type?: string };
let cachedToken: { accessToken: string; refreshToken?: string; expiresAt: number } | null = null;
let tokenPromise: Promise<string> | null = null;

function clientCredentials() {
  const clientId = process.env.RAKUTEN_CLIENT_ID?.trim();
  const clientSecret = process.env.RAKUTEN_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}
function tokenKey() {
  const c = clientCredentials();
  if (!c) throw new Error("RAKUTEN_CLIENT_CREDENTIALS_MISSING");
  return Buffer.from(`${c.clientId}:${c.clientSecret}`, "utf8").toString("base64");
}
async function requestAccessToken(refreshToken?: string): Promise<string> {
  const body = new URLSearchParams({ scope: RAKUTEN_ACCOUNT_ID });
  if (refreshToken) body.set("refresh_token", refreshToken);
  const response = await fetch(`${BASE_URL}/token`, { method: "POST", headers: { Authorization: `Bearer ${tokenKey()}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body, cache: "no-store", signal: AbortSignal.timeout(9000) });
  const raw = await response.text();
  if (!response.ok) throw new Error(`RAKUTEN_TOKEN_${response.status}:${raw.replace(/\s+/g," ").trim().slice(0,300)}`);
  const payload = JSON.parse(raw) as TokenResponse;
  if (!payload.access_token) throw new Error("RAKUTEN_TOKEN_ACCESS_TOKEN_MISSING");
  const ttl = Math.max(60, Number(payload.expires_in) || 3600);
  cachedToken = { accessToken: payload.access_token, refreshToken: payload.refresh_token || refreshToken, expiresAt: Date.now() + ttl * 1000 };
  return cachedToken.accessToken;
}
async function accessToken(forceRefresh=false): Promise<string> {
  if (clientCredentials()) {
    if (!forceRefresh && cachedToken && cachedToken.expiresAt-Date.now()>60000) return cachedToken.accessToken;
    if (!tokenPromise) { const refresh=cachedToken?.refreshToken; tokenPromise=requestAccessToken(refresh).finally(()=>{tokenPromise=null}); }
    return tokenPromise;
  }
  const manual=process.env.RAKUTEN_ADVERTISING_TOKEN?.trim();
  if (!manual) throw new Error("RAKUTEN_AUTH_MISSING");
  return manual;
}
async function authenticatedFetch(path:string, accept="application/json,application/xml,text/xml") {
  const run=async (bearer:string)=>fetch(`${BASE_URL}${path}`,{headers:{Authorization:`Bearer ${bearer}`,Accept:accept},cache:"no-store",signal:AbortSignal.timeout(12000)});
  let response=await run(await accessToken());
  if(response.status===401&&clientCredentials()){cachedToken=null;response=await run(await accessToken(true));}
  return response;
}
function decodeXml(value="") { return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").trim(); }
function field(xml:string,name:string){const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const match=xml.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`,`i`));return match?decodeXml(match[1].replace(/<[^>]+>/g," ").replace(/\s+/g," ")):"";}
function money(xml:string,name:string){const match=xml.match(new RegExp(`<${name}\\s+currency=["']([^"']+)["'][^>]*>([\\s\\S]*?)<\\/${name}>`,`i`));if(!match)return{};const amount=Number(decodeXml(match[2]));return{currency:match[1],amount:Number.isFinite(amount)?amount:undefined};}
export function rakutenConfigured(){return Boolean(clientCredentials()||process.env.RAKUTEN_ADVERTISING_TOKEN?.trim());}

export async function listRakutenAdvertisers(merchantName?:string):Promise<RakutenAdvertiser[]> {
  const params=new URLSearchParams(); if(merchantName?.trim()) params.set("merchantname",merchantName.trim());
  const response=await authenticatedFetch(`/advertisersearch/1.0${params.size?`?${params}`:""}`,"application/xml,text/xml");
  const xml=await response.text(); if(!response.ok) throw new Error(`RAKUTEN_ADVERTISERS_${response.status}:${xml.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,240)}`);
  const blocks=xml.match(/<merchant(?:\s[^>]*)?>[\s\S]*?<\/merchant>/gi)??[];
  return blocks.map(b=>({id:field(b,"mid"),name:field(b,"merchantname"),partnered:false})).filter(a=>a.id&&a.name);
}

export async function listRakutenPartnerships(options:{status?:string;network?:number;page?:number;limit?:number}={}) {
  const params=new URLSearchParams({page:String(Math.max(1,options.page??1)),limit:String(Math.min(200,Math.max(1,options.limit??200)))});
  if(options.status) params.set("partner_status",options.status); if(options.network) params.set("network",String(options.network));
  const response=await authenticatedFetch(`/v1/partnerships?${params}`,"application/json"); const raw=await response.text();
  if(!response.ok) throw new Error(`RAKUTEN_PARTNERSHIPS_${response.status}:${raw.replace(/\s+/g," ").trim().slice(0,240)}`);
  const data=JSON.parse(raw); const rows=Array.isArray(data?.partnerships)?data.partnerships:[];
  return {advertisers:rows.map((p:any)=>({id:String(p?.advertiser?.id??""),name:String(p?.advertiser?.name??""),network:Number(p?.advertiser?.network)||undefined,status:p?.advertiser?.status,categories:Array.isArray(p?.advertiser?.categories)?p.advertiser.categories:[],partnershipStatus:p?.status,partnered:p?.status==="active"})).filter((a:RakutenAdvertiser)=>a.id&&a.name),metadata:data?.metadata??data?._metadata??null};
}

export async function searchRakutenProducts(query:string,options:{max?:number;page?:number;language?:string;mid?:string}={}) {
  const clean=query.replace(/[&=?{}\\()[\]\-;~|$!><*%]/g," ").replace(/\s+/g," ").trim(); if(!clean)return{products:[] as RakutenProduct[],totalMatches:0,totalPages:0,page:1};
  const params=new URLSearchParams({keyword:clean,max:String(Math.min(100,Math.max(1,options.max??40))),pagenumber:String(Math.max(1,options.page??1))}); if(options.language)params.set("language",options.language);if(options.mid)params.set("mid",options.mid);
  const response=await authenticatedFetch(`/productsearch/1.0?${params}`,"application/xml,text/xml"); const xml=await response.text(); if(!response.ok)throw new Error(`RAKUTEN_PRODUCT_SEARCH_${response.status}:${xml.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,240)}`);
  const products:RakutenProduct[]=[]; const blocks=xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)??[];
  for(const item of blocks){const retail=money(item,"price");const sale=money(item,"saleprice");const title=field(item,"productname");if(!title)continue;const image=field(item,"imageurl");const merchantId=field(item,"mid");const sku=field(item,"sku");products.push({id:`rakuten:${merchantId}:${sku||field(item,"linkid")}`,source:"rakuten",title,description:field(item,"long")||field(item,"short")||undefined,image:image||undefined,images:image?[image]:[],price:(sale as any).amount??(retail as any).amount,salePrice:(sale as any).amount,currency:(sale as any).currency||(retail as any).currency||undefined,url:field(item,"linkurl")||undefined,sku:sku||undefined,upc:field(item,"upccode")||undefined,category:field(item,"primary")||undefined,subcategory:field(item,"secondary")||undefined,merchantId:merchantId||undefined,merchantName:field(item,"merchantname")||undefined,affiliate:true});}
  return{products,totalMatches:Number(field(xml,"TotalMatches"))||products.length,totalPages:Number(field(xml,"TotalPages"))||0,page:Number(field(xml,"PageNumber"))||options.page||1};
}
