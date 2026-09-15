import type {DiscoveryEdge,InstagramProfile} from "./types";

const API="https://api.apify.com/v2";
const KEYWORD_ACTOR=process.env.APIFY_KEYWORD_ACTOR||"publicsignallabs~instagram-account-search";
const FALLBACK_KEYWORD_ACTOR=process.env.APIFY_FALLBACK_KEYWORD_ACTOR||"apify~instagram-search-scraper";
const SECONDARY_KEYWORD_ACTOR=process.env.APIFY_SECONDARY_KEYWORD_ACTOR||"maximedupre~instagram-user-search-scraper";
const RELATED_ACTOR=process.env.APIFY_RELATED_ACTOR||"publicsignallabs~instagram-related-profiles";

function token(){const value=process.env.APIFY_API_TOKEN;if(!value)throw new Error("APIFY_API_TOKEN is not configured");return value}
function actorId(id:string){return id.replace("/","~")}

async function runActor(actor:string,input:Record<string,unknown>,timeoutMs=90000){
 const response=await fetch(`${API}/acts/${actorId(actor)}/run-sync-get-dataset-items?clean=true`,{
  method:"POST",
  headers:{Authorization:`Bearer ${token()}`,"Content-Type":"application/json"},
  body:JSON.stringify(input),
  signal:AbortSignal.timeout(timeoutMs),
  cache:"no-store"
 });
 if(!response.ok){const text=await response.text();throw new Error(`Apify ${actor} failed: ${response.status} ${text.slice(0,240)}`)}
 const payload=await response.json();
 return Array.isArray(payload)?payload as Record<string,unknown>[]:[];
}

function s(v:unknown){return typeof v==="string"?v:""}
function n(v:unknown){const x=Number(v);return Number.isFinite(x)?x:null}
function b(v:unknown){return typeof v==="boolean"?v:null}
function firstString(...values:unknown[]){for(const value of values){const text=s(value);if(text)return text}return ""}
function firstNumber(...values:unknown[]){for(const value of values){const result=n(value);if(result!==null)return result}return null}
function firstBoolean(...values:unknown[]){for(const value of values){const result=b(value);if(result!==null)return result}return null}
function normalizedUsername(value:unknown){return s(value).replace(/^@/,"").trim().toLowerCase()}
function matchedKeyword(row:Record<string,unknown>,fallback:string){const list=row.matchedKeywords;if(Array.isArray(list)&&list.length)return s(list[0])||fallback;return firstString(row.query,row.search_query,row.sourceQuery,row.searchTerm,fallback)}

function profileFromRow(row:Record<string,unknown>,source:"keyword"|"related",fallbackQuery?:string):InstagramProfile|null{
 const username=normalizedUsername(row.username||row.userName||row.handle);if(!username)return null;
 return{
  id:firstString(row.id,row.userId,row.user_id,row.pk)||username,
  username,
  fullName:firstString(row.full_name,row.fullName,row.name)||undefined,
  profileUrl:firstString(row.profile_url,row.profileUrl,row.url)||`https://www.instagram.com/${username}/`,
  profilePictureUrl:firstString(row.profile_pic_url,row.profile_picture_url,row.profilePictureUrl,row.profilePicUrl,row.profileImage)||undefined,
  isPrivate:firstBoolean(row.is_private,row.isPrivate,row.private),
  isVerified:firstBoolean(row.is_verified,row.isVerified,row.verified),
  followers:firstNumber(row.follower_count,row.followersCount,row.followerCount,row.followers),
  following:firstNumber(row.following_count,row.followingCount,row.followsCount,row.following),
  postsCount:firstNumber(row.media_count,row.postsCount,row.postCount,row.posts_count),
  biography:firstString(row.biography,row.bio)||null,
  website:firstString(row.external_url,row.websiteUrl,row.externalUrl,row.website)||null,
  category:firstString(row.category,row.businessCategoryName)||null,
  isBusiness:firstBoolean(row.is_business,row.isBusiness,row.isBusinessAccount),
  publicEmail:firstString(row.public_email,row.publicEmail)||null,
  publicPhone:firstString(row.public_phone_number,row.publicPhone,row.publicPhoneNumber)||null,
  source,
  sourceQuery:source==="keyword"?matchedKeyword(row,fallbackQuery||""):undefined,
  rank:firstNumber(row.rank,row.queryRank,row.position,row.queryPosition)
 };
}

function parseKeywordRows(rows:Record<string,unknown>[],fallbackQuery:string){const profiles:InstagramProfile[]=[];const seen=new Set<string>();for(const row of rows){const profile=profileFromRow(row,"keyword",fallbackQuery);if(!profile||seen.has(profile.username))continue;seen.add(profile.username);profiles.push(profile)}return profiles}

export async function keywordSearch(queries:string[],maxPagesPerQuery=10){
 const cleanQueries=queries.map(query=>query.trim()).filter(Boolean);if(!cleanQueries.length)return[];
 let rows:Record<string,unknown>[]=[];
 try{rows=await runActor(KEYWORD_ACTOR,{queries:cleanQueries,maxPagesPerQuery:Math.max(1,Math.min(10,maxPagesPerQuery)),enrichProfiles:false})}catch(error){console.warn("Primary Instagram keyword actor failed",error)}
 let profiles=parseKeywordRows(rows,cleanQueries[0]);if(profiles.length)return profiles;
 try{
  const fallbackRows=await runActor(FALLBACK_KEYWORD_ACTOR,{search:cleanQueries.join(", "),searchType:"user",searchLimit:10,enhanceUserSearchWithFacebookPage:false,liveSearch:true});
  profiles=parseKeywordRows(fallbackRows,cleanQueries[0]);if(profiles.length)return profiles;
 }catch(error){console.warn("Fast Instagram keyword fallback failed",error)}
 const secondaryRows=await runActor(SECONDARY_KEYWORD_ACTOR,{keywords:cleanQueries,maxItems:40},120000);
 profiles=parseKeywordRows(secondaryRows,cleanQueries[0]);
 if(!profiles.length)throw new Error("Instagram discovery actors returned no usable profile rows");
 return profiles;
}

export async function relatedSearch(seeds:string[],maxResultsPerProfile=80){
 if(!seeds.length)return{profiles:[] as InstagramProfile[],edges:[] as DiscoveryEdge[]};
 const rows=await runActor(RELATED_ACTOR,{profiles:seeds,maxResultsPerProfile:Math.max(1,Math.min(80,maxResultsPerProfile)),enrichProfiles:false});
 const profiles:InstagramProfile[]=[];const edges:DiscoveryEdge[]=[];const seen=new Set<string>();
 for(const row of rows){const profile=profileFromRow(row,"related");const parent=normalizedUsername(row.seed_username||row.seedUsername||row.seed_profile||row.seedProfile||row.seed);if(!profile||!parent||seen.has(`${parent}:${profile.username}`))continue;seen.add(`${parent}:${profile.username}`);profiles.push(profile);edges.push({parentUsername:parent,childUsername:profile.username,edgeType:"instagram_suggested",rank:profile.rank})}
 return{profiles,edges};
}
