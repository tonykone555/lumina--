import {keywordSearch,relatedSearch} from "./apify";
import {getOrCreateSearch,instagramStoreEnabled,loadProfilesForSearch,markKeywordsSearched,persistBatch} from "./store";
import type {DiscoveryEdge,DiscoveryProfile,DiscoveryRequest,DiscoveryResponse,InstagramProfile} from "./types";

function normalizeQuery(value:string){return value.trim().toLowerCase().replace(/\s+/g," ")}
function cleanKeyword(value:string){return value.trim().replace(/\s+/g," ").slice(0,100)}
function cleanUsername(value:string){return value.replace(/^@/,"").trim().toLowerCase().replace(/[^a-z0-9._]/g,"").slice(0,40)}

export function deriveKeywordVariants(query:string,learned:string[]=[]){
 const q=cleanKeyword(query);const tokens=q.toLowerCase().split(/\s+/).filter(Boolean);
 const generic=new Set(["find","me","some","the","a","an","instagram","accounts","account","profiles","profile"]);
 const core=tokens.filter(t=>!generic.has(t)).join(" ");
 return [...new Set([q,...learned.map(cleanKeyword),core&&`${core} brand`,core&&`${core} label`,core&&`${core} store`,core&&`independent ${core}`].filter(Boolean))].slice(0,10) as string[];
}

function profileKey(p:InstagramProfile){return p.username.toLowerCase()}
function baseScore(p:InstagramProfile){const rank=p.rank&&p.rank>0?Math.max(0,25-Math.min(25,p.rank)):8;return 20+rank+(p.profilePictureUrl?4:0)+(p.website?5:0)+(p.isBusiness?4:0)}

function mergeProfile(current:DiscoveryProfile|undefined,next:InstagramProfile,parent?:string,depth=0):DiscoveryProfile{
 const parents=new Set(current?.parentUsernames||[]);if(parent)parents.add(parent.toLowerCase());const shared=parents.size;
 return {...(current||{}),...next,id:next.id||current?.id||next.username,username:next.username.toLowerCase(),fullName:next.fullName||current?.fullName,profileUrl:next.profileUrl||current?.profileUrl,profilePictureUrl:next.profilePictureUrl||current?.profilePictureUrl,followers:next.followers??current?.followers??null,following:next.following??current?.following??null,postsCount:next.postsCount??current?.postsCount??null,biography:next.biography??current?.biography??null,website:next.website??current?.website??null,category:next.category??current?.category??null,isPrivate:next.isPrivate??current?.isPrivate??null,isVerified:next.isVerified??current?.isVerified??null,isBusiness:next.isBusiness??current?.isBusiness??null,publicEmail:next.publicEmail??current?.publicEmail??null,publicPhone:next.publicPhone??current?.publicPhone??null,source:current?.source==="keyword"?"keyword":next.source,sourceQuery:next.sourceQuery||current?.sourceQuery,rank:next.rank??current?.rank??null,parentUsernames:[...parents],sharedParentCount:shared,discoveryDepth:current?Math.min(current.discoveryDepth,depth):depth,relevanceScore:Math.round(Math.max(current?.relevanceScore||0,baseScore(next))+shared*12+(depth===0?8:0))};
}

function mergeRelated(profiles:Map<string,DiscoveryProfile>,edges:DiscoveryEdge[],rows:Awaited<ReturnType<typeof relatedSearch>>,depth=1){
 edges.push(...rows.edges);
 const parentByChild=new Map<string,string[]>();for(const edge of rows.edges){const list=parentByChild.get(edge.childUsername)||[];list.push(edge.parentUsername);parentByChild.set(edge.childUsername,list)}
 for(const p of rows.profiles){const parents=parentByChild.get(p.username)||[];let merged=profiles.get(profileKey(p));if(!parents.length)merged=mergeProfile(merged,p,undefined,depth);else for(const parent of parents)merged=mergeProfile(merged,p,parent,depth);profiles.set(profileKey(p),merged!)}
}

export async function discoverInstagramGraph(input:DiscoveryRequest):Promise<DiscoveryResponse>{
 const query=cleanKeyword(input.query||"");if(query.length<2)throw new Error("A search query is required");
 const target=Math.max(40,Math.min(1200,Number(input.target)||180));
 const keywordPages=Math.max(1,Math.min(10,Number(input.keywordPages)||3));
 const relatedPerSeed=Math.max(5,Math.min(80,Number(input.relatedPerSeed)||15));
 const seedExpansionLimit=Math.max(1,Math.min(100,Number(input.seedExpansionLimit)||20));
 const seedUsernames=[...new Set((input.seedUsernames||[]).map(cleanUsername).filter(Boolean))].slice(0,12);
 const keywords=deriveKeywordVariants(query,input.learnedKeywords||[]);
 const state=await getOrCreateSearch(normalizeQuery(query),query,target,keywords);
 const seenBefore=new Set(state.seen);const expanded=new Set(state.expanded);const profiles=new Map<string,DiscoveryProfile>();const edges:DiscoveryEdge[]=[];

 if(instagramStoreEnabled())for(const p of await loadProfilesForSearch(state.searchId,target))profiles.set(profileKey(p),p);

 // "Find similar" starts from the actual selected Instagram node rather than merely
 // searching its display name. This preserves the graph-first strategy.
 if(seedUsernames.length&&profiles.size<target){
  const related=await relatedSearch(seedUsernames,relatedPerSeed,Boolean(input.enrichProfiles));
  mergeRelated(profiles,edges,related,1);
 }

 // Only pay for keyword phrases this living niche has not searched before.
 // Repeating a search therefore moves into new graph territory instead of starting over.
 const freshKeywords=keywords.filter(k=>!state.searchedKeywords.has(k.toLowerCase()));
 if(freshKeywords.length&&profiles.size<target){
  const keywordRows=await keywordSearch(freshKeywords,keywordPages,Boolean(input.enrichProfiles));
  for(const p of keywordRows){const key=profileKey(p);profiles.set(key,mergeProfile(profiles.get(key),p,undefined,0))}
  await markKeywordsSearched(state.searchId,freshKeywords);
 }

 const candidateParents=[...profiles.values()].filter(p=>!expanded.has(p.username)&&!seedUsernames.includes(p.username)&&!p.isPrivate).sort((a,b)=>b.relevanceScore-a.relevanceScore).slice(0,seedExpansionLimit);
 const parentNames=[...new Set([...seedUsernames,...candidateParents.map(p=>p.username)])].slice(0,seedExpansionLimit+seedUsernames.length);
 if(candidateParents.length&&profiles.size<target){
  const related=await relatedSearch(candidateParents.map(p=>p.username),relatedPerSeed,Boolean(input.enrichProfiles));
  mergeRelated(profiles,edges,related,1);
 }

 const ranked=[...profiles.values()].sort((a,b)=>b.relevanceScore-a.relevanceScore||b.sharedParentCount-a.sharedParentCount||(a.rank??999)-(b.rank??999)).slice(0,target);
 const chosen=new Set(ranked.map(p=>p.username));const chosenEdges=edges.filter(e=>chosen.has(e.childUsername));const newProfiles=ranked.filter(p=>!seenBefore.has(p.username));
 await persistBatch(state.searchId,ranked,chosenEdges,parentNames);
 const reusedCount=ranked.length-newProfiles.length;
 return{searchId:state.searchId,query,target,uniqueCount:ranked.length,newCount:newProfiles.length,reusedCount,profiles:ranked,edges:chosenEdges,learnedKeywords:keywords,exhausted:ranked.length<target,persistence:instagramStoreEnabled()?"supabase":"none"};
}
