import type {DiscoveryEdge,DiscoveryProfile,InstagramProfile} from "./types";

const base=()=>process.env.SUPABASE_URL?.replace(/\/$/,"")||"";
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY||"";
export function instagramStoreEnabled(){return Boolean(base()&&key())}

async function rest(path:string,init:RequestInit={}){
 if(!instagramStoreEnabled())throw new Error("Instagram persistence is not configured");
 const response=await fetch(`${base()}/rest/v1/${path}`,{...init,headers:{apikey:key(),Authorization:`Bearer ${key()}`,"Content-Type":"application/json",...(init.headers||{})},cache:"no-store"});
 if(!response.ok)throw new Error(`Supabase ${response.status}: ${(await response.text()).slice(0,240)}`);
 const text=await response.text();return text?JSON.parse(text):null;
}

export async function getOrCreateSearch(normalizedQuery:string,originalQuery:string,target:number,learnedKeywords:string[]){
 if(!instagramStoreEnabled())return{searchId:crypto.randomUUID(),seen:new Set<string>(),expanded:new Set<string>(),learnedKeywords};
 const rows=await rest(`instagram_searches?normalized_query=eq.${encodeURIComponent(normalizedQuery)}&select=id,learned_keywords&limit=1`) as Array<{id:string;learned_keywords?:string[]}>;
 let searchId=rows?.[0]?.id;
 const stored=Array.isArray(rows?.[0]?.learned_keywords)?rows[0].learned_keywords:[];
 if(!searchId){searchId=crypto.randomUUID();await rest("instagram_searches",{method:"POST",headers:{Prefer:"resolution=merge-duplicates"},body:JSON.stringify([{id:searchId,normalized_query:normalizedQuery,original_query:originalQuery,target_count:target,learned_keywords}])})}
 else await rest(`instagram_searches?id=eq.${searchId}`,{method:"PATCH",body:JSON.stringify({target_count:target,updated_at:new Date().toISOString(),learned_keywords:[...new Set([...stored,...learnedKeywords])].slice(0,50)})});
 const memberships=await rest(`instagram_search_profiles?search_id=eq.${searchId}&select=username,expanded`) as Array<{username:string;expanded:boolean}>;
 return{searchId,seen:new Set((memberships||[]).map(x=>x.username.toLowerCase())),expanded:new Set((memberships||[]).filter(x=>x.expanded).map(x=>x.username.toLowerCase())),learnedKeywords:[...new Set([...stored,...learnedKeywords])]};
}

export async function persistBatch(searchId:string,profiles:DiscoveryProfile[],edges:DiscoveryEdge[],expandedParents:string[]){
 if(!instagramStoreEnabled())return;
 if(profiles.length){
  const profileRows=profiles.map(p=>({instagram_id:p.id,username:p.username,full_name:p.fullName||null,profile_url:p.profileUrl||null,profile_picture_url:p.profilePictureUrl||null,followers:p.followers??null,following:p.following??null,posts_count:p.postsCount??null,biography:p.biography??null,website:p.website??null,category:p.category??null,is_private:p.isPrivate??null,is_verified:p.isVerified??null,is_business:p.isBusiness??null,public_email:p.publicEmail??null,public_phone:p.publicPhone??null,last_seen_at:new Date().toISOString()}));
  await rest("instagram_profiles?on_conflict=username",{method:"POST",headers:{Prefer:"resolution=merge-duplicates"},body:JSON.stringify(profileRows)});
  const memberships=profiles.map(p=>({search_id:searchId,username:p.username,relevance_score:p.relevanceScore,discovery_depth:p.discoveryDepth,parent_count:p.sharedParentCount,last_seen_at:new Date().toISOString()}));
  await rest("instagram_search_profiles?on_conflict=search_id,username",{method:"POST",headers:{Prefer:"resolution=merge-duplicates"},body:JSON.stringify(memberships)});
 }
 if(edges.length){const edgeRows=edges.map(e=>({search_id:searchId,parent_username:e.parentUsername,child_username:e.childUsername,edge_type:e.edgeType,rank:e.rank??null}));await rest("instagram_discovery_edges?on_conflict=search_id,parent_username,child_username",{method:"POST",headers:{Prefer:"resolution=ignore-duplicates"},body:JSON.stringify(edgeRows)})}
 for(const username of [...new Set(expandedParents.map(x=>x.toLowerCase()))])await rest(`instagram_search_profiles?search_id=eq.${searchId}&username=eq.${encodeURIComponent(username)}`,{method:"PATCH",body:JSON.stringify({expanded:true,expanded_at:new Date().toISOString()})});
}

export async function loadProfilesForSearch(searchId:string,limit=1200){
 if(!instagramStoreEnabled())return[] as DiscoveryProfile[];
 const rows=await rest(`instagram_search_profiles?search_id=eq.${searchId}&select=username,relevance_score,discovery_depth,parent_count,instagram_profiles(*)&order=relevance_score.desc&limit=${Math.max(1,Math.min(2000,limit))}`) as Record<string,unknown>[];
 return (rows||[]).map(row=>{const p=(row.instagram_profiles||{}) as Record<string,unknown>;return{id:String(p.instagram_id||row.username),username:String(row.username),fullName:p.full_name?String(p.full_name):undefined,profileUrl:p.profile_url?String(p.profile_url):undefined,profilePictureUrl:p.profile_picture_url?String(p.profile_picture_url):undefined,followers:p.followers==null?null:Number(p.followers),following:p.following==null?null:Number(p.following),postsCount:p.posts_count==null?null:Number(p.posts_count),biography:p.biography==null?null:String(p.biography),website:p.website==null?null:String(p.website),category:p.category==null?null:String(p.category),isPrivate:p.is_private==null?null:Boolean(p.is_private),isVerified:p.is_verified==null?null:Boolean(p.is_verified),isBusiness:p.is_business==null?null:Boolean(p.is_business),publicEmail:p.public_email==null?null:String(p.public_email),publicPhone:p.public_phone==null?null:String(p.public_phone),source:"keyword",parentUsernames:[],sharedParentCount:Number(row.parent_count||0),discoveryDepth:Number(row.discovery_depth||0),relevanceScore:Number(row.relevance_score||0)} as DiscoveryProfile});
}
