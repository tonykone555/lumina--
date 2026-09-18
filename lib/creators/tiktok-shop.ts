const API="https://api.apify.com/v2";
const CREATOR_ACTOR=process.env.APIFY_TIKTOK_SHOP_CREATOR_ACTOR||"khadinakbar~tiktok-shop-creators-scraper";
function token(){const v=process.env.APIFY_API_TOKEN;if(!v)throw new Error("APIFY_API_TOKEN is not configured");return v}
function str(...v:unknown[]){for(const x of v)if(typeof x==="string"&&x.trim())return x.trim();return""}
function num(...v:unknown[]){for(const x of v){const n=Number(x);if(Number.isFinite(n))return n}return null}
export type PartnerLead={source:"tiktok_shop";username:string;displayName?:string;profileUrl?:string;avatar?:string;followers?:number|null;engagementRate?:number|null;email?:string|null;category?:string|null;shopUrl?:string|null;metadata:Record<string,unknown>};
export async function discoverTikTokShop(query:string,target=100){
 const input={searchQueries:[query],maxProfilesPerQuery:Math.min(100,target),maxProfilesScanned:Math.min(500,Math.max(target*3,100)),maxTotalCreators:target,requireShowcaseProducts:true,minFollowerCount:3000,excludePrivateAccounts:true,maxShowcaseProductsPerCreator:8,showcaseRegion:process.env.TIKTOK_SHOP_REGION||"FR"};
 const r=await fetch(`${API}/acts/${CREATOR_ACTOR}/run-sync-get-dataset-items?clean=true`,{method:"POST",headers:{Authorization:`Bearer ${token()}`,"Content-Type":"application/json"},body:JSON.stringify(input),signal:AbortSignal.timeout(180000),cache:"no-store"});
 if(!r.ok)throw new Error(`TikTok Shop creator actor failed: ${r.status} ${(await r.text()).slice(0,240)}`);
 const rows=await r.json() as Record<string,unknown>[];const out:PartnerLead[]=[];const seen=new Set<string>();
 for(const row of Array.isArray(rows)?rows:[]){const username=str(row.username,row.userName,row.handle,row.uniqueId).replace(/^@/,"").toLowerCase();if(!username||seen.has(username))continue;seen.add(username);const products=Array.isArray(row.showcaseProducts)?row.showcaseProducts:[];out.push({source:"tiktok_shop",username,displayName:str(row.nickname,row.displayName,row.name)||undefined,profileUrl:str(row.profileUrl,row.url)||`https://www.tiktok.com/@${username}`,avatar:str(row.avatar,row.avatarUrl,row.profilePicture)||undefined,followers:num(row.followerCount,row.followers,row.followersCount),engagementRate:num(row.engagementRate,row.engagement_rate),email:str(row.email,row.businessEmail,row.publicEmail)||null,category:str(row.category,row.niche)||query,shopUrl:str(row.shopUrl,row.showcaseUrl)||null,metadata:{...row,showcaseProductCount:num(row.showcaseProductCount)||products.length,showcaseProducts:products}});if(out.length>=target)break}
 return out;
}
