/**
 * Product-focused TikTok discovery via Apify.
 * Each category uses several specific product searches in ONE bounded Actor run.
 * Token is server-side only. All results must pass TikTok oEmbed verification.
 */
export type ProductTikTokVideo={
 id:string;username:string;caption:string;url:string;embedUrl:string;
 thumbnail?:string;searchQuery:string;hashtags:string[];views:number;likes:number;shares:number;saves:number;
 country:string;language:string;jev:{relevance:string;fit:string;confidence:number};
};
const TERMS:Record<string,string[]>={
 home:["modern table lamp home decor","home storage organizer products","decorative wall mirror","coffee table decor products","sofa accessories home","bathroom shelf organizer"],
 fashion:["women outfit haul clothing","handbag review fashion","sneakers unboxing review","summer dress try on","fashion jewelry accessories","denim jeans styling"],
 beauty:["skincare serum review","makeup blush product demo","hair styling tools review","sunscreen product review","lip gloss makeup swatch","face cleanser skincare"],
 kitchen:["espresso coffee machine review","air fryer kitchen appliance","vegetable chopper gadget","kitchen storage organizer","nonstick pan cooking review","portable blender review"],
 fitness:["gym leggings activewear review","home dumbbells workout equipment","resistance bands review","gym bag accessories","yoga mat review","fitness recovery massage gun"],
 tech:["wireless earbuds review","portable projector review","phone charger stand review","mechanical keyboard review","desk setup accessories","bluetooth speaker review"]
};
function kind(category:string){
 const q=category.toLowerCase();
 if(/product discovery|for you/.test(q))return"all";
 if(/beauty|skincare|hair|makeup/.test(q))return"beauty";
 if(/fitness|gym|sport/.test(q))return"fitness";
 if(/kitchen|coffee|cook/.test(q))return"kitchen";
 if(/fashion|dress|cloth|outfit|jewel/.test(q))return"fashion";
 if(/tech|electronic|gadget|headphone/.test(q))return"tech";
 if(/home|furniture|decor|interior/.test(q))return"home";
 return"all";
}
function txt(...values:unknown[]):string{for(const v of values)if(typeof v==="string"&&v.trim())return v.trim();return""}
function number(v:unknown){const n=Number(v);return Number.isFinite(n)?n:0}
export function apifyConfigured(){return Boolean(process.env.APIFY_API_TOKEN?.trim())}
const memo=new Map<string,{timestamp:number;videos:ProductTikTokVideo[]}>();
export async function apifyProductTikToks(category:string):Promise<ProductTikTokVideo[]>{
 const token=process.env.APIFY_API_TOKEN?.trim();
 if(!token)return[];
 const group=kind(category);
 const saved=memo.get(group);
 if(saved&&Date.now()-saved.timestamp<6*3600_000)return saved.videos;
 const queries=group==="all"?[
  TERMS.home[0],TERMS.fashion[0],TERMS.beauty[0],TERMS.kitchen[0],TERMS.fitness[0],TERMS.tech[0]
 ]:TERMS[group];
 // Actor supports several searchQueries per run. Limit total billable output.
 const endpoint="https://api.apify.com/v2/acts/automly~tiktok-search-scraper/run-sync-get-dataset-items?maxItems=72";
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),22000);
 try{
  const response=await fetch(endpoint,{
   method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
   body:JSON.stringify({searchQueries:queries,searchType:"videos",maxResultsPerQuery:12,language:"en"}),
   signal:controller.signal,cache:"no-store"
  });
  if(!response.ok)throw new Error("APIFY_HTTP_"+response.status);
  const data=await response.json();
  const items=Array.isArray(data)?data:Array.isArray(data?.items)?data.items:[];
  const seen=new Set<string>();
  const rows:ProductTikTokVideo[]=[];
  for(const item of items){
   const v=item?.row||item;
   const url=txt(v?.url,v?.webUrl,v?.videoUrl,v?.link);
   const rawId=String(v?.id||v?.videoId||v?.awemeId||url.match(/\/video\/(\d{10,20})/)?.[1]||"");
   if(!/^\d{10,20}$/.test(rawId)||seen.has(rawId))continue;
   const caption=txt(v?.caption,v?.description,v?.desc,v?.text);
   const searchQuery=txt(v?.searchQuery,v?.keyword);
   const username=txt(v?.authorUsername,v?.username,v?.author?.uniqueId,url.match(/tiktok\.com\/@([^/]+)/)?.[1]);
   // Only use an explicitly product-related search query. Generic/non-product clips are not useful.
   if(!caption&&!searchQuery)continue;
   seen.add(rawId);
   rows.push({
    id:rawId,username,caption:caption.slice(0,450),
    url: /^https:\/\/([\w-]+\.)?tiktok\.com\//.test(url)?url:`https://www.tiktok.com/@${username||"_"}/video/${rawId}`,
    embedUrl:`https://www.tiktok.com/player/v1/${rawId}?controls=1&progress_bar=1&play_button=1&volume_control=1&fullscreen_button=1&description=1&rel=0`,
    thumbnail:txt(v?.coverImage,v?.cover,v?.thumbnail,v?.image),
    searchQuery:searchQuery||category,hashtags:[],
    views:number(v?.views||v?.playCount),likes:number(v?.likes||v?.diggCount),
    shares:number(v?.shares||v?.shareCount),saves:number(v?.saves),
    country:"",language:"en",jev:{relevance:"RELEVANT",fit:"PRODUCT_FOCUSED",confidence:0}
   });
  }
  const verified=await Promise.all(rows.slice(0,30).map(async v=>{
   try{
    const u=new URL("https://www.tiktok.com/oembed");u.searchParams.set("url",v.url);
    const res=await fetch(u,{signal:AbortSignal.timeout(3800),cache:"no-store"});
    if(!res.ok)return null;
    const body=await res.json();
    if(!body?.html||!body?.thumbnail_url)return null;
    return {...v,thumbnail:String(body.thumbnail_url)};
   }catch{return null}
  }));
  const videos=verified.filter((v):v is ProductTikTokVideo=>Boolean(v)).slice(0,20);
  memo.set(group,{timestamp:Date.now(),videos});
  console.info("Apify TikTok category",group,"queries",queries.length,"results",items.length,"verified",videos.length);
  return videos;
 }catch(error){
  console.warn("Apify TikTok feed unavailable",error instanceof Error?error.message:"ERROR");
  return[];
 }finally{clearTimeout(timeout)}
}
