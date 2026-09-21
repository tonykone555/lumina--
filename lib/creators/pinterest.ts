const API="https://api.apify.com/v2";
const ACTOR=process.env.APIFY_PINTEREST_ACTOR||"parsebird~pinterest-search-scraper";

function token(){
 const value=String(process.env.APIFY_API_TOKEN||"").trim();
 if(!value)throw new Error("APIFY_API_TOKEN_NOT_CONFIGURED");
 return value;
}
function actorId(id:string){return id.replace("/","~")}
function str(v:unknown){return typeof v==="string"?v:""}
function bestImage(row:Record<string,unknown>){
 const images=(row.images&&typeof row.images==="object"?row.images:null) as Record<string,unknown>|null;
 return str(row.imageURL)||str(row.imageUrl)||str(row.image_url)||str(images?.orig)||str(images?.["736x"])||str(images?.["564x"])||str(images?.["474x"])||str(row.thumbnail)||"";
}
function pinUrl(row:Record<string,unknown>){
 const raw=str(row.url)||str(row.pinUrl)||str(row.pin_url);
 if(raw)return raw;
 const id=str(row.id);return id?"https://www.pinterest.com/pin/"+id+"/":"";
}
export type PinterestInspiration={id:string;title:string;description:string;image:string;source_url:string;creator:string};

export async function searchPinterestInspiration(query:string,limit=24){
 const q=query.trim().slice(0,160);
 if(q.length<2)return[];
 const response=await fetch(API+"/acts/"+actorId(ACTOR)+"/run-sync-get-dataset-items?clean=true",{
  method:"POST",
  headers:{Authorization:"Bearer "+token(),"Content-Type":"application/json"},
  body:JSON.stringify({query:q,filter:"all",limit:Math.max(8,Math.min(40,limit))}),
  signal:AbortSignal.timeout(90000),
  cache:"no-store"
 });
 if(!response.ok){
  const body=await response.text();
  throw new Error("PINTEREST_SEARCH_FAILED_"+response.status+": "+body.slice(0,180));
 }
 const rows=await response.json() as Record<string,unknown>[];
 const out:PinterestInspiration[]=[];const seen=new Set<string>();
 for(const row of Array.isArray(rows)?rows:[]){
  const image=bestImage(row);if(!image||seen.has(image))continue;seen.add(image);
  const pinner=(row.pinner&&typeof row.pinner==="object"?row.pinner:null) as Record<string,unknown>|null;
  out.push({
   id:str(row.id)||image,
   title:str(row.title)||str(row.name)||"Pinterest inspiration",
   description:str(row.description)||str(row.altText)||"",
   image,
   source_url:pinUrl(row),
   creator:str(pinner?.fullName)||str(pinner?.username)||""
  });
 }
 return out.slice(0,Math.max(8,Math.min(40,limit)));
}
