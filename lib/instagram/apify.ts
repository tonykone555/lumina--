import type {DiscoveryEdge,InstagramProfile} from "./types";

const API="https://api.apify.com/v2";
const KEYWORD_ACTOR=process.env.APIFY_KEYWORD_ACTOR||"publicsignallabs~instagram-account-search";
const RELATED_ACTOR=process.env.APIFY_RELATED_ACTOR||"publicsignallabs~instagram-related-profiles";

function token(){const value=process.env.APIFY_API_TOKEN;if(!value)throw new Error("APIFY_API_TOKEN is not configured");return value}
function actorId(id:string){return id.replace("/","~")}

async function runActor(actor:string,input:Record<string,unknown>,timeoutMs=120000){
 const response=await fetch(`${API}/acts/${actorId(actor)}/run-sync-get-dataset-items?clean=true`,{
  method:"POST",
  headers:{Authorization:`Bearer ${token()}`,"Content-Type":"application/json"},
  body:JSON.stringify(input),
  signal:AbortSignal.timeout(timeoutMs),
  cache:"no-store"
 });
 if(!response.ok){const text=await response.text();throw new Error(`Apify ${actor} failed: ${response.status} ${text.slice(0,240)}`)}
 return await response.json() as Record<string,unknown>[];
}

function s(v:unknown){return typeof v==="string"?v:""}
function n(v:unknown){const x=Number(v);return Number.isFinite(x)?x:null}
function b(v:unknown){return typeof v==="boolean"?v:null}
function normalizedUsername(value:unknown){return s(value).replace(/^@/,"").trim().toLowerCase()}

export async function keywordSearch(queries:string[],maxPagesPerQuery=10){
 const rows=await runActor(KEYWORD_ACTOR,{queries,maxPagesPerQuery:Math.max(1,Math.min(10,maxPagesPerQuery)),enrichProfiles:false});
 const profiles:InstagramProfile[]=[];
 for(const row of rows){
  const username=normalizedUsername(row.username);if(!username)continue;
  profiles.push({
   id:s(row.id)||username,username,fullName:s(row.full_name)||undefined,profileUrl:s(row.profile_url)||`https://www.instagram.com/${username}/`,
   profilePictureUrl:s(row.profile_pic_url)||s(row.profile_picture_url)||undefined,isPrivate:b(row.is_private),isVerified:b(row.is_verified),
   followers:n(row.follower_count),following:n(row.following_count),postsCount:n(row.media_count),biography:s(row.biography)||null,
   website:s(row.external_url)||null,category:s(row.category)||null,isBusiness:b(row.is_business),publicEmail:s(row.public_email)||null,
   publicPhone:s(row.public_phone_number)||null,source:"keyword",sourceQuery:s(row.query)||s(row.search_query)||queries[0],rank:n(row.rank)
  });
 }
 return profiles;
}

export async function relatedSearch(seeds:string[],maxResultsPerProfile=80){
 if(!seeds.length)return{profiles:[] as InstagramProfile[],edges:[] as DiscoveryEdge[]};
 const rows=await runActor(RELATED_ACTOR,{profiles:seeds,maxResultsPerProfile:Math.max(1,Math.min(80,maxResultsPerProfile)),enrichProfiles:false});
 const profiles:InstagramProfile[]=[];const edges:DiscoveryEdge[]=[];
 for(const row of rows){
  const username=normalizedUsername(row.username);const parent=normalizedUsername(row.seed_username||row.seed);if(!username||!parent)continue;
  const rank=n(row.rank);
  profiles.push({id:s(row.id)||username,username,fullName:s(row.full_name)||undefined,profileUrl:s(row.profile_url)||`https://www.instagram.com/${username}/`,profilePictureUrl:s(row.profile_pic_url)||undefined,isPrivate:b(row.is_private),isVerified:b(row.is_verified),source:"related",rank});
  edges.push({parentUsername:parent,childUsername:username,edgeType:"instagram_suggested",rank});
 }
 return{profiles,edges};
}
