const API="https://api.apify.com/v2";
const TIKTOK_SHOP_ACTOR=process.env.APIFY_TIKTOK_SHOP_ACTOR||"avinashchby~tiktok-shop-creator-leads";
function token(){const value=process.env.APIFY_API_TOKEN;if(!value)throw new Error("APIFY_API_TOKEN is not configured");return value}
function actorId(id:string){return id.replace("/","~")}
function str(...v:unknown[]){for(const x of v)if(typeof x==="string"&&x.trim())return x.trim();return""}
function num(...v:unknown[]){for(const x of v){const n=Number(x);if(Number.isFinite(n))return n}return null}
export type PartnerLead={source:"tiktok_shop";username:string;displayName?:string;profileUrl?:string;avatar?:string;followers?:number|null;engagementRate?:number|null;email?:string|null;category?:string|null;shopUrl?:string|null;metadata:Record<string,unknown>};
export async function discoverTikTokShop(query:string,target=100){
 const r=await fetch(`${API}/acts/${actorId(TIKTOK_SHOP_ACTOR)}/run-sync-get-dataset-items?clean=true`,{method:"POST",headers:{Authorization:`Bearer ${token()}`,"Content-Type":"application/json"},body:JSON.stringify({searchQuery:query}),signal:AbortSignal.timeout(180000),cache:"no-store"});
 if(!r.ok)throw new Error(`TikTok Shop actor failed: ${r.status} ${(await r.text()).slice(0,240)}`);
 const rows=await r.json() as Record<string,unknown>[];const out:PartnerLead[]=[];const seen=new Set<string>();
 for(const row of Array.isArray(rows)?rows:[]){const username=str(row.username,row.userName,row.handle,row.uniqueId).replace(/^@/,"").toLowerCase();if(!username||seen.has(username))continue;seen.add(username);out.push({source:"tiktok_shop",username,displayName:str(row.displayName,row.nickname,row.name)||undefined,profileUrl:str(row.profileUrl,row.url)||`https://www.tiktok.com/@${username}`,avatar:str(row.avatar,row.avatarUrl,row.profilePicture)||undefined,followers:num(row.followers,row.followerCount,row.followersCount),engagementRate:num(row.engagementRate,row.engagement_rate),email:str(row.email,row.businessEmail,row.publicEmail)||null,category:str(row.category,row.productCategory,row.niche)||null,shopUrl:str(row.shopUrl,row.shop_url,row.tiktokShopUrl)||null,metadata:row});if(out.length>=target)break}
 return out;
}
