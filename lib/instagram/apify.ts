import type {DiscoveryEdge,InstagramProfile} from "./types";

const API="https://api.apify.com/v2";
const KEYWORD_ACTOR=process.env.APIFY_KEYWORD_ACTOR||"apify~instagram-search-scraper";
const FALLBACK_KEYWORD_ACTOR=process.env.APIFY_FALLBACK_KEYWORD_ACTOR||"apify~instagram-search-scraper";
const SECONDARY_KEYWORD_ACTOR=process.env.APIFY_SECONDARY_KEYWORD_ACTOR||"maximedupre~instagram-user-search-scraper";
const RELATED_ACTOR=process.env.APIFY_RELATED_ACTOR||"publicsignallabs~instagram-related-profiles";
const PROFILE_ACTOR=process.env.APIFY_PROFILE_ACTOR||"insta_scrapper~instagram-profile-scraper";

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
function recentPost(row:Record<string,unknown>){const candidates=[row.latestPosts,row.latest_posts,row.posts,row.recentPosts].find(Array.isArray) as Record<string,unknown>[]|undefined;const post=candidates?.[0];if(!post)return{};const images=post.images;const image=firstString(post.displayUrl,post.display_url,post.imageUrl,post.image_url,post.thumbnailUrl,post.thumbnail_url,Array.isArray(images)?images[0]:undefined);return{recentPostImageUrl:image||undefined,recentPostCaption:firstString(post.caption,post.text)||null}}
function matchedKeyword(row:Record<string,unknown>,fallback:string){const list=row.matchedKeywords;if(Array.isArray(list)&&list.length)return s(list[0])||fallback;return firstString(row.query,row.search_query,row.sourceQuery,row.searchTerm,fallback)}

function profileFromRow(row:Record<string,unknown>,source:"keyword"|"related",fallbackQuery?:string):InstagramProfile|null{
 const username=normalizedUsername(row.username||row.userName||row.handle);if(!username)return null;
 const recent=recentPost(row);
 return{
  id:firstString(row.id,row.userId,row.user_id,row.pk)||username,
  username,
  fullName:firstString(row.full_name,row.fullName,row.name)||undefined,
  profileUrl:firstString(row.profile_url,row.profileUrl,row.url)||`https://www.instagram.com/${username}/`,
  profilePictureUrl:firstString(row.profile_pic_url,row.profile_picture_url,row.profilePictureUrl,row.profilePicUrl,row.profileImage,row.profilePicUrlHD,row.profilePicUrlHd,row.hdProfilePicUrl)||undefined,
  recentPostImageUrl:recent.recentPostImageUrl,
  recentPostCaption:recent.recentPostCaption,
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

function profileFromContentRow(row:Record<string,unknown>,fallbackQuery:string):InstagramProfile|null{
 const owner=(row.owner && typeof row.owner==="object"?row.owner:null) as Record<string,unknown>|null;
 const username=normalizedUsername(row.ownerUsername||row.owner_username||row.username||owner?.username);
 if(!username)return null;
 const caption=firstString(row.caption,row.text);
 const image=firstString(row.displayUrl,row.display_url,row.imageUrl,row.image_url,row.thumbnailUrl,row.thumbnail_url);
 return{
  id:firstString(row.ownerId,row.owner_id,row.userId,row.user_id,owner?.id,row.id)||username,
  username,
  fullName:firstString(row.ownerFullName,row.owner_full_name,owner?.fullName,owner?.full_name,row.fullName,row.full_name)||undefined,
  profileUrl:`https://www.instagram.com/${username}/`,
  profilePictureUrl:firstString(row.ownerProfilePicUrl,row.owner_profile_pic_url,owner?.profilePicUrl,owner?.profile_pic_url)||undefined,
  recentPostImageUrl:image||undefined,
  recentPostCaption:caption||null,
  source:"keyword",
  sourceQuery:fallbackQuery
 };
}

function parseContentRows(rows:Record<string,unknown>[],fallbackQuery:string){
 const profiles:InstagramProfile[]=[];const seen=new Set<string>();
 for(const row of rows){const profile=profileFromContentRow(row,fallbackQuery);if(!profile||seen.has(profile.username))continue;seen.add(profile.username);profiles.push(profile)}
 return profiles;
}

export async function keywordSearch(queries:string[],maxPagesPerQuery=10,enrichProfiles=false){
 const cleanQueries=queries.map(query=>query.trim()).filter(Boolean);if(!cleanQueries.length)return[];
 const searchLimit=Math.max(20,Math.min(120,maxPagesPerQuery*20));
 // Content-first discovery: Instagram's user search is name/handle driven, so it is no longer
 // the primary source. Popular reels return captions/hashtags plus the creator username.
 let rows:Record<string,unknown>[]=[];
 try{rows=await runActor(KEYWORD_ACTOR,{search:cleanQueries.join(", "),searchType:"popular",searchLimit,liveSearch:true},120000)}catch(error){console.warn("Instagram popular-content discovery failed",error)}
 let profiles=parseContentRows(rows,cleanQueries[0]);if(profiles.length)return profiles;

 // Fallback to hashtag discovery. This remains topic/content driven rather than username driven.
 try{
  const hashtagRows=await runActor(FALLBACK_KEYWORD_ACTOR,{search:cleanQueries.join(", "),searchType:"hashtag",searchLimit,liveSearch:true},120000);
  // Hashtag search returns tags rather than creators, so only accept rows that actually include
  // creator/post ownership data. Otherwise continue to the secondary content source below.
  profiles=parseContentRows(hashtagRows,cleanQueries[0]);if(profiles.length)return profiles;
 }catch(error){console.warn("Instagram hashtag discovery fallback failed",error)}

 // Legacy user-search actor is retained only as a last-resort availability fallback. Downstream
 // qualification gives username/display-name zero relevance, so lexical handle matches cannot pass
 // unless their enriched bio/category/site/post content supports the niche.
 const secondaryRows=await runActor(SECONDARY_KEYWORD_ACTOR,{keywords:cleanQueries,maxItems:40},120000);
 profiles=parseKeywordRows(secondaryRows,cleanQueries[0]);
 if(!profiles.length)throw new Error("Instagram discovery actors returned no usable profile rows");
 return profiles;
}

export async function enrichProfiles(profiles:InstagramProfile[],limit=300){
 const selected=profiles.filter(p=>p.username&&!p.isPrivate).slice(0,Math.max(1,Math.min(300,limit)));if(!selected.length)return profiles;
 const chunks:InstagramProfile[][]=[];for(let i=0;i<selected.length;i+=100)chunks.push(selected.slice(i,i+100));
 try{
  // One enrichment source only. The low-cost profile actor returns profile metadata
  // and recent posts in the same profile result, so we do not pay for a second posts actor.
  const groups=await Promise.all(chunks.map(chunk=>runActor(PROFILE_ACTOR,{usernames:chunk.map(p=>p.username)},180000).catch(()=>[])));
  const enriched=new Map<string,InstagramProfile>();
  for(const row of groups.flat()){const p=profileFromRow(row,"keyword");if(p)enriched.set(p.username,p)}
  return profiles.map(p=>{const e=enriched.get(p.username);return e?{...p,...e,source:p.source,sourceQuery:p.sourceQuery||e.sourceQuery,rank:p.rank??e.rank}:p})
 }catch(error){console.warn("Instagram single-source profile enrichment failed",error);return profiles}
}

export async function relatedSearch(seeds:string[],maxResultsPerProfile=80,enrichProfiles=false){
 if(!seeds.length)return{profiles:[] as InstagramProfile[],edges:[] as DiscoveryEdge[]};
 const rows=await runActor(RELATED_ACTOR,{profiles:seeds,maxResultsPerProfile:Math.max(1,Math.min(80,maxResultsPerProfile)),enrichProfiles});
 const profiles:InstagramProfile[]=[];const edges:DiscoveryEdge[]=[];const seen=new Set<string>();
 for(const row of rows){const profile=profileFromRow(row,"related");const parent=normalizedUsername(row.seed_username||row.seedUsername||row.seed_profile||row.seedProfile||row.seed);if(!profile||!parent||seen.has(`${parent}:${profile.username}`))continue;seen.add(`${parent}:${profile.username}`);profiles.push(profile);edges.push({parentUsername:parent,childUsername:profile.username,edgeType:"instagram_suggested",rank:profile.rank})}
 return{profiles,edges};
}
