/**
 * Bright Data TikTok posts keyword discovery for the YNOT shopping video rail.
 * Three distinct product searches per category, queried with the official
 * TikTok Posts by Search dataset. A valid TikTok post URL/video ID is required;
 * TikTok thumbnails are optional. API token never reaches the client.
 */
export type BrightVideo={id:string;url:string;embedUrl:string;caption:string;thumbnail:string;searchQuery:string;views:number;hashtags:string[]};
const DATASET="gd_m7n5ixlw1gc4no56kx";
const TOPICS:Record<string,string[]>={
 home:["modern home table lamp review","home storage organizer review","decorative wall mirror review","coffee table decor haul","bathroom shelf organizer review","sofa home accessories"],
 fashion:["women handbag review","sneakers unboxing","summer dress try on","denim jeans styling","fashion jewelry review","women outfit haul"],
 beauty:["skincare serum review","makeup blush swatches","hair styling tool review","sunscreen skincare review","lip gloss swatches","facial cleanser review"],
 kitchen:["espresso coffee machine review","air fryer review","vegetable chopper kitchen","kitchen storage organizer","nonstick pan review","portable blender review"],
 fitness:["gym leggings review","home dumbbells review","resistance bands gym","gym bag review","yoga mat review","massage gun review"],
 tech:["wireless earbuds review","portable projector review","phone charging stand","mechanical keyboard review","desk setup accessories","bluetooth speaker review"]
};
const memory=new Map<string,{at:number;videos:BrightVideo[]}>();
function typeOfCategory(s:string){
 const q=s.toLowerCase();
 if(/product discovery|for you/.test(q))return"all";
 if(/beauty|skincare|makeup|hair/.test(q))return"beauty";
 if(/fitness|gym|sport/.test(q))return"fitness";
 if(/kitchen|coffee|cook/.test(q))return"kitchen";
 if(/fashion|cloth|dress|outfit|jewel/.test(q))return"fashion";
 if(/tech|electronic/.test(q))return"tech";
 if(/home|furniture|decor|interior/.test(q))return"home";
 return"all";
}
function stringValue(...arr:unknown[]){for(const x of arr)if(typeof x==="string"&&x.trim())return x.trim();return""}
function parseRows(raw:unknown):any[]{
 if(Array.isArray(raw))return raw;
 const r=raw as any;
 return Array.isArray(r?.data)?r.data:Array.isArray(r?.results)?r.results:[];
}
export function brightTikTokConfigured(){return Boolean(process.env.BRIGHTDATA_API_TOKEN?.trim())}
export async function brightTikTokFeed(category:string):Promise<BrightVideo[]>{
 const token=process.env.BRIGHTDATA_API_TOKEN?.trim();
 if(!token)return[];
 const key=typeOfCategory(category);
 const hit=memory.get(key);
 if(hit&&Date.now()-hit.at<6*3600000)return hit.videos;
 const queries=key==="all"?Object.values(TOPICS).map(v=>v[0]):TOPICS[key];
 // Bound the first fetch to 3 product searches, keeping scrape costs limited.
 const selected=queries.slice(0,3);
 const endpoint=`https://api.brightdata.com/datasets/v3/scrape?dataset_id=${DATASET}&format=json`;
 const payload=selected.map(q=>({url:"https://www.tiktok.com/search?lang=en&q="+encodeURIComponent(q),num_of_posts:10,country:""}));
 const controller=new AbortController();
 const stop=setTimeout(()=>controller.abort(),25000);
 try{
  const response=await fetch(endpoint,{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store",signal:controller.signal});
  if(response.status===202){console.info("Bright Data search accepted asynchronously; snapshot polling needed");return[]}
  if(!response.ok){console.warn("Bright Data product feed HTTP",response.status);return[]}
  const content=await response.text();
  const data=JSON.parse(content.replace(/("(?:id|post_id|video_id)"\s*:\s*)(\d{15,20})(?=\s*[,}])/g,'$1"$2"'));
  const rows=parseRows(data);
  const videos:BrightVideo[]=[];
  const used=new Set<string>();
  for(const row of rows){
   const original=stringValue(row.url,row.post_url,row.video_url);
   const id=String(original.match(/\/video\/(\d{15,20})/)?.[1]||row.post_id||row.video_id||row.id||"");
   if(!/^\d{15,20}$/.test(id)||used.has(id))continue;
   const author=stringValue(row.author?.uniqueId,row.author?.unique_id,row.username,original.match(/tiktok\.com\/@([^/]+)/)?.[1]);
   const caption=stringValue(row.description,row.caption,row.desc,row.text);
   if(!caption)continue;
   const cover=stringValue(row.cover_url,row.coverUrl,row.thumbnail,row.cover,row.image);
   const url=/^https:\/\/(www\.)?tiktok\.com\/@[^/]+\/video\/\d+/.test(original)?original:`https://www.tiktok.com/@${author||"_"}/video/${id}`;
   const q=stringValue(row.search_query,row.searchQuery,selected[videos.length%selected.length]);
   used.add(id);
   videos.push({id,url,embedUrl:`https://www.tiktok.com/player/v1/${id}?controls=1&play_button=1&progress_bar=1&volume_control=1&fullscreen_button=1`,
    caption:caption.slice(0,450),thumbnail:cover,searchQuery:q,views:Number(row.play_count||row.views||0),hashtags:Array.isArray(row.hashtags)?row.hashtags:[]});
   if(videos.length===20)break;
  }
  console.info("Bright Data product videos",{category:key,searches:selected.length,raw:rows.length,accepted:videos.length});
  if(videos.length)memory.set(key,{at:Date.now(),videos});
  return videos;
 }catch(error){console.warn("Bright Data product video discovery error",error instanceof Error?error.message:"UNKNOWN");return[]}
 finally{clearTimeout(stop)}
}
