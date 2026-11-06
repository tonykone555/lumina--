/**
 * Multi-product TikTok discovery. One Apify run per category, cached for six hours.
 * Apify metadata supplies the video ID and cover; oEmbed is an additional check
 * when available, not a required thumbnail source.
 */
export type FeedVideo={
 id:string;url:string;embedUrl:string;thumbnail:string;caption:string;searchQuery:string;
 views:number;hashtags:string[];
};
const searches:Record<string,string[]>={
 home:["table lamp review","storage organizer review","decorative mirror review","coffee table decor","bathroom organizer review","sofa accessories review"],
 fashion:["handbag review","sneakers unboxing","summer dress try on","denim jeans review","jewelry accessories review","women outfit haul"],
 beauty:["serum skincare review","makeup blush swatch","hair styling tool review","sunscreen review","lip gloss swatch","face cleanser review"],
 kitchen:["espresso machine review","air fryer review","vegetable chopper review","kitchen storage organizer","nonstick pan review","portable blender review"],
 fitness:["gym leggings review","dumbbells review","resistance bands review","gym bag review","yoga mat review","massage gun review"],
 tech:["wireless earbuds review","portable projector review","phone charger stand review","mechanical keyboard review","desk setup accessories","bluetooth speaker review"]
};
const cache=new Map<string,{expires:number;videos:FeedVideo[]}>();
function categoryKey(q:string){
 const x=q.toLowerCase();
 if(/product discovery|for you/.test(x))return"all";
 if(/beauty|skincare|makeup|hair/.test(x))return"beauty";
 if(/fitness|sport|gym/.test(x))return"fitness";
 if(/kitchen|coffee|cooking/.test(x))return"kitchen";
 if(/fashion|clothing|dress|jewel/.test(x))return"fashion";
 if(/tech|electronic/.test(x))return"tech";
 if(/home|decor|furniture/.test(x))return"home";
 return"all";
}
export async function apifyTikTokFeed(category:string):Promise<FeedVideo[]>{
 const token=process.env.APIFY_API_TOKEN;
 if(!token)return[];
 const group=categoryKey(category);
 const hit=cache.get(group);if(hit&&hit.expires>Date.now())return hit.videos;
 const queries=group==="all"?Object.values(searches).map(v=>v[0]):searches[group];
 const controller=new AbortController();
 const stop=setTimeout(()=>controller.abort(),25000);
 try{
  const r=await fetch("https://api.apify.com/v2/acts/automly~tiktok-search-scraper/run-sync-get-dataset-items?maxItems=72",{
   method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
   body:JSON.stringify({searchQueries:queries,searchType:"videos",maxResultsPerQuery:12,language:"en"}),
   cache:"no-store",signal:controller.signal
  });
  if(!r.ok)throw Error("APIFY_HTTP_"+r.status);
  const raw=await r.json();
  const items:Array<any>=Array.isArray(raw)?raw:[];
  const pools=new Map<string,FeedVideo[]>();
  let parsed=0;
  for(const row of items){
   if(row?.type&&row.type!=="video")continue;
   const url=String(row.url||"");
   const id=String(row.id||url.match(/\/video\/(\d{10,20})/)?.[1]||"");
   if(!/^\d{15,20}$/.test(id))continue;
   const username=String(row.authorUsername||url.match(/tiktok\.com\/@([^/]+)/)?.[1]||"_");
   const q=String(row.searchQuery||row.source||"");
   const caption=String(row.text||row.caption||"");
   const cover=String(row.coverUrl||row.thumbnail||"");
   if(row.isSlideshow===true||!caption||!q||!queries.includes(q))continue;
   const finalUrl=`https://www.tiktok.com/@${encodeURIComponent(username)}/video/${id}`;
   const v:FeedVideo={id,url:finalUrl,embedUrl:`https://www.tiktok.com/player/v1/${id}?controls=1&play_button=1&progress_bar=1&volume_control=1&fullscreen_button=1`,
    thumbnail:cover,caption:caption.slice(0,400),searchQuery:q,views:Number(row.views||0),hashtags:Array.isArray(row.hashtags)?row.hashtags:[]};
   pools.set(q,[...(pools.get(q)||[]),v]);parsed++;
  }
  const chosen:FeedVideo[]=[];const ids=new Set<string>();
  for(let round=0;round<8&&chosen.length<20;round++)
   for(const q of queries){
    const v=pools.get(q)?.[round];
    if(v&&!ids.has(v.id)){chosen.push(v);ids.add(v.id)}
    if(chosen.length>=20)break;
   }
  // Only check a small set with TikTok. A thumbnail field is NOT required for a valid embed.
  const checked=await Promise.all(chosen.map(async v=>{
   try{
    const u=new URL("https://www.tiktok.com/oembed");u.searchParams.set("url",v.url);
    const response=await fetch(u,{signal:AbortSignal.timeout(2500),cache:"no-store"});
    if(!response.ok)return{video:v,validated:false};
    const data=await response.json();
    if(!data?.html)return{video:v,validated:false};
    return{video:{...v,thumbnail:String(data.thumbnail_url||v.thumbnail)},validated:true};
   }catch{return{video:v,validated:false}}
  }));
  const verified=checked.filter(x=>x.validated).map(x=>x.video);
  // Apify's video ID, canonical TikTok URL and cover are authoritative metadata.
  // If oEmbed is rate-limited, retain these candidates for browser-side playback,
  // rather than silently wiping the feed; users can open the canonical TikTok link.
  const videos=verified.length?verified:chosen.filter(v=>Boolean(v.thumbnail));
  console.info("Apify feed normalized",{category:group,raw:items.length,parsed,chosen:chosen.length,oembed:verified.length,returned:videos.length});
  if(videos.length)cache.set(group,{expires:Date.now()+6*3600_000,videos});
  return videos;
 }catch(e){console.warn("Apify feed v2 error",e instanceof Error?e.message:"UNKNOWN");return[]}
 finally{clearTimeout(stop)}
}
