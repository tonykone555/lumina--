const CACHE_TTL_MS=10*60*1000;
const MIN_FETCH_GAP_MS=1200;
type CacheEntry={expires:number;items:PinterestInspiration[]};
const g=globalThis as typeof globalThis&{__ynotPinterestCache?:Map<string,CacheEntry>;__ynotPinterestLastFetch?:number};
const cache=g.__ynotPinterestCache||(g.__ynotPinterestCache=new Map());
g.__ynotPinterestLastFetch=g.__ynotPinterestLastFetch||0;

export type PinterestInspiration={id:string;title:string;description:string;image:string;source_url:string;creator:string};

function sleep(ms:number){return new Promise(resolve=>setTimeout(resolve,ms))}
function cleanHtmlText(value:string){
 return value.replace(/\\u002F/g,"/").replace(/\\u0026/g,"&").replace(/&amp;/g,"&").replace(/\\\//g,"/").replace(/\\u003C[^>]*\\u003E/g," ").replace(/<[^>]+>/g," ").replace(/\\s+/g," ").trim();
}
function normalizeImage(value:string){
 let url=value.replace(/\\u002F/g,"/").replace(/\\\//g,"/");
 try{url=decodeURIComponent(url)}catch{}
 if(!/^https:\/\/i\.pinimg\.com\//i.test(url))return"";
 return url.replace(/\/\/(?:60x60|75x75|100x100|136x136|140x140|170x|236x|280x280_RS|474x|564x|736x)\//,"/736x/");
}
function extractImages(html:string){
 const found=new Set<string>();
 const normalized=html.replace(/\\u002F/g,"/").replace(/\\\//g,"/");
 const matches=normalized.match(/https:\/\/i\.pinimg\.com\/[^"'<>\\s]+/g)||[];
 for(const raw of matches){
  const image=normalizeImage(raw);
  if(image&&/\.(?:jpe?g|png|webp)(?:\?|$)/i.test(image))found.add(image);
 }
 return [...found];
}
function nearbyMeta(html:string,image:string){
 const needles=[image,image.replace(/\//g,"\\/")];
 let index=-1;
 for(const needle of needles){index=html.indexOf(needle);if(index>=0)break}
 if(index<0)return{title:"Pinterest inspiration",description:"",creator:"",pinId:""};
 const chunk=html.slice(Math.max(0,index-2600),Math.min(html.length,index+2600));
 const pick=(keys:string[])=>{
  for(const key of keys){
   const m=chunk.match(new RegExp('"' + key + '"\\s*:\\s*"([^"]{1,400})"','i'));
   if(m?.[1])return cleanHtmlText(m[1]);
  }
  return"";
 };
 const idMatch=chunk.match(/"id"\s*:\s*"?(\d{6,})"?/);
 return{
  title:pick(["grid_title","title","name"])||"Pinterest inspiration",
  description:pick(["description","seo_description","alt_text"]),
  creator:pick(["full_name","username"]),
  pinId:idMatch?.[1]||""
 };
}
async function fetchPinterestHtml(query:string){
 const now=Date.now(),wait=Math.max(0,MIN_FETCH_GAP_MS-(now-(g.__ynotPinterestLastFetch||0)));
 if(wait)await sleep(wait);
 g.__ynotPinterestLastFetch=Date.now();
 const url="https://www.pinterest.com/search/pins/?q="+encodeURIComponent(query)+"&rs=typed";
 const response=await fetch(url,{
  headers:{
   "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
   "Accept":"text/html,application/xhtml+xml",
   "Accept-Language":"en-US,en;q=0.9",
   "Cache-Control":"no-cache"
  },
  redirect:"follow",
  cache:"no-store",
  signal:AbortSignal.timeout(15000)
 });
 if(!response.ok)throw new Error("PINTEREST_SCRAPE_HTTP_"+response.status);
 const html=await response.text();
 if(html.length<1000)throw new Error("PINTEREST_SCRAPE_EMPTY");
 return{html,url};
}

export async function searchPinterestInspiration(query:string,limit=24){
 const q=query.trim().slice(0,160);
 if(q.length<2)return[];
 const key=q.toLowerCase()+"|"+limit;
 const hit=cache.get(key);
 if(hit&&hit.expires>Date.now())return hit.items;
 const {html,url}=await fetchPinterestHtml(q);
 const images=extractImages(html);
 if(!images.length)throw new Error("PINTEREST_SCRAPE_NO_IMAGES");
 const items:PinterestInspiration[]=[];const seen=new Set<string>();
 for(const image of images){
  if(seen.has(image))continue;seen.add(image);
  const meta=nearbyMeta(html,image);
  items.push({
   id:meta.pinId||image,
   title:meta.title,
   description:meta.description,
   image,
   source_url:meta.pinId?"https://www.pinterest.com/pin/"+meta.pinId+"/":url,
   creator:meta.creator
  });
  if(items.length>=Math.max(8,Math.min(40,limit)))break;
 }
 cache.set(key,{expires:Date.now()+CACHE_TTL_MS,items});
 return items;
}
