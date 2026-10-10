import {NextRequest,NextResponse} from "next/server";
import {askJev,type JevQuestion} from "@/lib/ai/jev";
import {ModalClient} from "modal";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const DATASET="datasocial/tiktok-5.6B-videos";
const HF="https://datasets-server.huggingface.co/search";
const HF_SEARCH_TIMEOUT_MS=12000;
const HF_FALLBACK_TIMEOUT_MS=10000;

type Candidate={
 id:string;caption:string;hashtags:string[];onScreenText:string[];views:number;likes:number;shares:number;saves:number;
 engagementRate:number|null;country:string;language:string;thumbnail?:string;createdAt?:number;username?:string;
};
type Video=Candidate&{url:string;embedUrl:string;searchQuery:string;jev:{relevance:string;fit:string;confidence:number}};

function words(value:string){
 const stop=new Set(["the","and","for","with","from","this","that","new","shop","shopping","buy","sale","product","products","item","items","official","best"]);
 return String(value||"").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>2&&!stop.has(w));
}
function searchQuery(title:string,brand:string,tags:string[]){
 const titleWords=words(title).slice(0,6);
 const brandWords=words(brand).slice(0,2);
 const tagWords=tags.flatMap(words).slice(0,4);
 return [...new Set([...brandWords,...titleWords,...tagWords])].join(" ").slice(0,160);
}
function intentQuery(row:Candidate,category=""){
 const generic=new Set(["viral","tiktok","fyp","foryou","foryoupage","trending","video","amazon","musthave","musthaves","aesthetic","things","obsessed","love","need","found","find"]);
 const weighted=[
  ...row.hashtags.flatMap(words).flatMap(x=>[x,x]),
  ...row.onScreenText.flatMap(words).flatMap(x=>[x,x]),
  ...words(row.caption),
  ...words(category)
 ].filter(x=>!generic.has(x));
 return [...new Set(weighted)].slice(0,9).join(" ").slice(0,150);
}
function rowValue(row:any){
 return row?.row&&typeof row.row==="object"?row.row:row;
}
function arr(v:any){return Array.isArray(v)?v.map(String).filter(Boolean):[]}
function num(v:any){const n=Number(v);return Number.isFinite(n)?n:0}
function str(...values:any[]){for(const v of values)if(typeof v==="string"&&v.trim())return v.trim();return ""}
function videoId(row:any){
 const raw=str(row?.video_id,row?.videoId,row?.id,row?.item_id,row?.aweme_id,row?.awemeId);
 if(/^\d{10,20}$/.test(raw))return raw;
 const url=str(row?.url,row?.web_url,row?.share_url,row?.video_url,row?.videoUrl);
 return url.match(/\/video\/(\d{10,20})/)?.[1]||"";
}
function providerRows(data:any){
 const options=[data?.videos,data?.items,data?.results,data?.data?.videos,data?.data?.items,data?.data?.results,data?.data];
 for(const x of options)if(Array.isArray(x))return x;
 return Array.isArray(data)?data:[];
}
function normalizeLive(row:any):Candidate|null{
 const id=videoId(row);if(!id)return null;
 return{
  id,
  caption:str(row?.caption,row?.desc,row?.description,row?.text).slice(0,500),
  hashtags:arr(row?.hashtags).slice(0,20),
  onScreenText:arr(row?.on_screen_text??row?.onScreenText).slice(0,12),
  views:num(row?.views??row?.view_count??row?.viewCount??row?.stats?.playCount),
  likes:num(row?.likes??row?.like_count??row?.likeCount??row?.stats?.diggCount),
  shares:num(row?.shares??row?.share_count??row?.shareCount??row?.stats?.shareCount),
  saves:num(row?.saves??row?.save_count??row?.saveCount),
  engagementRate:Number.isFinite(Number(row?.engagement_rate))?Number(row.engagement_rate):null,
  country:str(row?.country,row?.region),language:str(row?.language,row?.lang)
 };
}
async function liveTikTokCandidates(query:string){
 if(!process.env.FETCHLAYER_API_KEY)return[] as Candidate[];
 try{
  const data=await searchTikTokVideos(query,1,20);
  const seen=new Set<string>();
  return providerRows(data).map(normalizeLive).filter((x):x is Candidate=>Boolean(x&& !seen.has(x.id)&&(seen.add(x.id),true))).slice(0,20);
 }catch(error){
  console.warn("Live TikTok video search unavailable",{message:error instanceof Error?error.message:String(error)});
  return[];
 }
}

function collectTikTokLinks(value:any,out:any[]=[],depth=0){
 if(depth>6||value==null)return out;
 if(Array.isArray(value)){for(const v of value)collectTikTokLinks(v,out,depth+1);return out}
 if(typeof value==="object"){
  const url=str(value?.url,value?.link,value?.href,value?.web_url,value?.share_url);
  if(url.includes("tiktok.com/")&&url.includes("/video/"))out.push(value);
  for(const v of Object.values(value))collectTikTokLinks(v,out,depth+1);
 }
 return out;
}

async function googleTikTokCandidates(query:string){
 if(!process.env.FETCHLAYER_API_KEY)return[] as Candidate[];
 try{
  const data=await searchGoogleIntent(`site:tiktok.com/@ inurl:video ${query}`,"US","en","month");
  const seen=new Set<string>();
  return collectTikTokLinks(data).map((row:any):Candidate|null=>{
   const url=str(row?.url,row?.link,row?.href,row?.web_url,row?.share_url);
   const afterVideo=url.split("/video/")[1]||"";
   const id=(afterVideo.match(/^\d{10,20}/)?.[0])||"";
   if(!id||seen.has(id))return null;
   seen.add(id);
   return{
    id,
    caption:str(row?.title,row?.snippet,row?.description,row?.text).slice(0,500),
    hashtags:[],onScreenText:[],
    views:0,likes:0,shares:0,saves:0,engagementRate:null,
    country:"",language:"en"
   };
  }).filter((x):x is Candidate=>Boolean(x)).slice(0,20);
 }catch(error){
  console.warn("Google TikTok discovery unavailable",{message:error instanceof Error?error.message:String(error)});
  return[];
 }
}

async function fetchSearch(term:string){
 const url=new URL(HF);
 url.searchParams.set("dataset",DATASET);
 url.searchParams.set("config","default");
 url.searchParams.set("split","train");
 url.searchParams.set("query",term);
 url.searchParams.set("offset","0");
 url.searchParams.set("length","12");
 try{
  const response=await fetch(url,{cache:"force-cache",next:{revalidate:3600},signal:AbortSignal.timeout(HF_SEARCH_TIMEOUT_MS)});
  if(!response.ok){console.warn("HF TikTok search failed",{term,status:response.status});return[]}
  const raw=await response.text();
  const data=JSON.parse(raw.replace(/("video_id"\s*:\s*)(\d{15,20})(?=\s*[,}])/g,'$1"$2"'));
  return Array.isArray(data?.rows)?data.rows:[];
 }catch(error){
  console.warn("HF TikTok search unavailable",{term,message:error instanceof Error?error.message:String(error)});
  return[];
 }
}
async function fetchFirstRows(){
 const url=new URL("https://datasets-server.huggingface.co/first-rows");
 url.searchParams.set("dataset",DATASET);
 url.searchParams.set("config","default");
 url.searchParams.set("split","train");
 try{
  const response=await fetch(url,{cache:"force-cache",next:{revalidate:21600},signal:AbortSignal.timeout(HF_FALLBACK_TIMEOUT_MS)});
  if(!response.ok)return[];
  const data=await response.json().catch(()=>({}));
  return Array.isArray(data?.rows)?data.rows:[];
 }catch(error){
  console.warn("HF TikTok first-rows fallback unavailable",{message:error instanceof Error?error.message:String(error)});
  return[];
 }
}
function decodeEntities(value:string){
 return value.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");
}
async function bingTikTokCandidates(query:string){
 try{
  const url=new URL("https://www.bing.com/search");
  url.searchParams.set("q",`site:tiktok.com/@ "/video/" ${query}`);
  url.searchParams.set("format","rss");
  url.searchParams.set("count","20");
  const response=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 YNOT/1.0"},cache:"no-store",signal:AbortSignal.timeout(10000)});
  if(!response.ok)return[] as Candidate[];
  const xml=await response.text();
  const seen=new Set<string>();
  const out:Candidate[]=[];
  for(const chunk of xml.split("<item>").slice(1)){
   const linkStart=chunk.indexOf("<link>"),linkEnd=chunk.indexOf("</link>");
   if(linkStart<0||linkEnd<0)continue;
   const link=decodeEntities(chunk.slice(linkStart+6,linkEnd)).trim();
   if(!link.includes("tiktok.com/")||!link.includes("/video/"))continue;
   const after=link.split("/video/")[1]||"";
   const id=after.match(/^\d{10,20}/)?.[0]||"";
   if(!id||seen.has(id))continue;
   seen.add(id);
   const titleStart=chunk.indexOf("<title>"),titleEnd=chunk.indexOf("</title>");
   const descStart=chunk.indexOf("<description>"),descEnd=chunk.indexOf("</description>");
   const title=titleStart>=0&&titleEnd>titleStart?decodeEntities(chunk.slice(titleStart+7,titleEnd)):"";
   const description=descStart>=0&&descEnd>descStart?decodeEntities(chunk.slice(descStart+13,descEnd)):"";
   out.push({id,caption:(title+" "+description).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,500),hashtags:[],onScreenText:[],views:0,likes:0,shares:0,saves:0,engagementRate:null,country:"",language:"en"});
  }
  return out.slice(0,20);
 }catch(error){
  console.warn("Bing TikTok discovery unavailable",{message:error instanceof Error?error.message:String(error)});
  return[] as Candidate[];
 }
}

const MAX_VIDEO_AGE_DAYS=90;
function recentCandidate(row:any):Candidate|null{
 const x=rowValue(row);
 const id=videoId(x);
 const rawDate=x?.posted_at||x?.created_at||x?.create_time||x?.createTime||"";
 const seconds=typeof rawDate==="number"?(rawDate>1e12?rawDate/1000:rawDate):Date.parse(String(rawDate))/1000;
 if(!/^\d{15,20}$/.test(id)||!Number.isFinite(seconds))return null;
 const age=Date.now()/1000-seconds;
 if(age<0||age>MAX_VIDEO_AGE_DAYS*86400)return null;
 if(x.type&&String(x.type)!=="video")return null;
 const caption=str(x.caption,x.desc,x.description).slice(0,500);
 const hashtags=arr(x.hashtags);
 const onScreenText=arr(x.on_screen_text||x.onScreenText);
 if(!caption&&!hashtags.length&&!onScreenText.length)return null;
 return{id,caption,hashtags,onScreenText,views:num(x.views),likes:num(x.likes),shares:num(x.shares),saves:num(x.saves),engagementRate:Number.isFinite(Number(x.engagement_rate))?Number(x.engagement_rate):null,country:str(x.country),language:str(x.language),createdAt:Math.floor(seconds)};
}
async function datasetCandidates(query:string){
 const terms=[query,...words(query).slice(0,3)].filter(Boolean);
 const searches=await Promise.allSettled([...new Set(terms)].slice(0,4).map(fetchSearch));
 const seen=new Set<string>();
 return searches.flatMap(result=>result.status==="fulfilled"?result.value:[]).map(recentCandidate)
  .filter((x):x is Candidate=>Boolean(x&&!seen.has(x.id)&&(seen.add(x.id),true))).slice(0,24);
}
async function validateEmbeds(rows:Video[]){
 const checked=await Promise.all(rows.slice(0,10).map(async video=>{
  try{
   const url=new URL("https://www.tiktok.com/oembed");
   url.searchParams.set("url",video.url);
   const response=await fetch(url,{signal:AbortSignal.timeout(5000),cache:"no-store"});
   if(!response.ok)return null;
   const body=await response.json();
   if(!body?.thumbnail_url||!body?.html)return null;
   return{...video,thumbnail:String(body.thumbnail_url),caption:video.caption||String(body.title||"").slice(0,500)};
  }catch{return null}
 }));
 return checked.filter((x):x is Video=>Boolean(x));
}

async function brightDataCandidates(query:string):Promise<Candidate[]|null>{
 const token=String(process.env.BRIGHTDATA_API_TOKEN||"").trim();
 if(!token)return null;
 try{
  const endpoint="https://api.brightdata.com/datasets/v3/scrape?dataset_id=gd_m7n5ixlw1gc4no56kx&format=json";
  const requestUrl="https://www.tiktok.com/search?lang=en&q="+encodeURIComponent(query);
  const response=await fetch(endpoint,{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
   body:JSON.stringify([{url:requestUrl,num_of_posts:12,country:""}]),
   cache:"no-store",signal:AbortSignal.timeout(57000)});
  if(response.status===202){
   const pending=await response.json().catch(()=>({}));
   console.warn("Bright Data TikTok collection pending",{snapshotId:String(pending?.snapshot_id||"").slice(0,45)});
   return[];
  }
  if(!response.ok){
   console.warn("Bright Data TikTok request failed",{status:response.status,message:(await response.text()).slice(0,240)});
   return[];
  }
  const raw=await response.text();
  const parsed=JSON.parse(raw.replace(/("(?:post_id|video_id|id)"\s*:\s*)(\d{15,20})(?=\s*[,}])/g,'$1"$2"'));
  const rows=Array.isArray(parsed)?parsed:Array.isArray(parsed?.data)?parsed.data:[];
  const seen=new Set<string>();
  return rows.map((v:any):Candidate|null=>{
   const videoUrl=String(v.url||v.post_url||"");
   const videoId=String(v.post_id||v.video_id||v.id||videoUrl.match(/\/video\/(\d{15,20})/)?.[1]||"");
   const rawDate=v.post_date_created||v.date_created||v.create_time||v.createTime||"";
   const seconds=typeof rawDate==="number"?(rawDate>1e12?rawDate/1000:rawDate):Date.parse(String(rawDate))/1000;
   if(!/^\d{15,20}$/.test(videoId)||seen.has(videoId)||!Number.isFinite(seconds)||seconds>Date.now()/1000||Date.now()/1000-seconds>90*86400)return null;
   seen.add(videoId);
   return {id:videoId,caption:String(v.description||v.caption||"").slice(0,500),hashtags:arr(v.hashtags),
    onScreenText:[],views:num(v.play_count||v.views),likes:num(v.digg_count||v.likes),shares:num(v.share_count||v.shares),
    saves:num(v.collect_count||v.saves),engagementRate:null,country:"",language:"",createdAt:Math.floor(seconds),
    username:videoUrl.match(/tiktok\.com\/@([^/]+)/)?.[1]||""};
  }).filter((x):x is Candidate=>Boolean(x));
 }catch(error){
  console.warn("Bright Data TikTok request unavailable",{message:error instanceof Error?error.message:"REQUEST_FAILED"});
  return[];
 }
}

async function candidates(query:string){
 const bright=await brightDataCandidates(query);
 if(bright?.length)return bright;
 const id=String(process.env.MODAL_TOKEN_ID||"");
 const secret=String(process.env.MODAL_TOKEN_SECRET||"");
 if(!id||!secret){
  console.warn("Jev TikTok discovery: Modal credentials missing");
  return await datasetCandidates(query);
 }
 const modal=new ModalClient({tokenId:id,tokenSecret:secret});
 try{
  const fn=await modal.functions.fromName("ynot-tiktok-search","search_tiktok_videos");
  const call=await fn.spawn([],{query,limit:24});
  const data:any=await call.get({timeoutMs:20000});
  if(!data?.ok){
   console.warn("Modal TikTok search returned no verified results",{error:String(data?.error||"WORKER_UNAVAILABLE")});
   return await datasetCandidates(query);
  }
  const seen=new Set<string>();
  const live=(Array.isArray(data.videos)?data.videos:[]).map((v:any):Candidate|null=>{
   const id=String(v?.id||"");
   if(!/^\d{10,20}$/.test(id)||seen.has(id))return null;
   seen.add(id);
   return{
    id,caption:String(v.caption||"").slice(0,500),hashtags:[],onScreenText:[],
    views:num(v.views),likes:num(v.likes),shares:num(v.shares),saves:num(v.saves),
    engagementRate:null,country:"",language:"",thumbnail:String(v.thumbnail||""),
    createdAt:num(v.created_at),username:String(v.username||"")
   };
  }).filter((x):x is Candidate=>Boolean(x));
  return live.length?live:await datasetCandidates(query);
 }catch(error){
  console.warn("Modal TikTok search not ready",{message:error instanceof Error?error.message:String(error)});
  return await datasetCandidates(query);
 }finally{modal.close()}
}

async function rankWithJev(product:{title:string;brand:string;tags:string[];description:string},rows:Candidate[]){
 if(!rows.length)return[] as Video[];
 const questions:JevQuestion[]=[];
 for(const row of rows.slice(0,12)){
  questions.push({
   id:`rel:${row.id}`,
   question:"Is this TikTok genuinely relevant to the exact YNOT product rather than only loosely adjacent?",
   choices:[{label:"RELEVANT"},{label:"ADJACENT"},{label:"IRRELEVANT"}]
  });
  questions.push({
   id:`fit:${row.id}`,
   question:"How strong is this TikTok as real-life content to show beside this YNOT product?",
   choices:[{label:"STRONG"},{label:"TEST"},{label:"WEAK"}]
  });
 }
 const context={
  task:"Rank TikTok videos for a YNOT product page. Prefer genuine product/category usage, demos, styling and real-life context. Reject unrelated keyword collisions.",
  product,
  candidates:rows.slice(0,12).map(r=>({
   id:r.id,caption:r.caption,hashtags:r.hashtags,onScreenText:r.onScreenText,
   views:r.views,shares:r.shares,saves:r.saves,engagementRate:r.engagementRate
  }))
 };
 const decisions=await askJev(context,questions);
 const byId=new Map<string,{relevance:string;fit:string;confidence:number}>();
 for(const d of decisions){
  const [kind,id]=String(d.id||"").split(":");
  if(!id)continue;
  const prev=byId.get(id)||{relevance:"IRRELEVANT",fit:"WEAK",confidence:0};
  if(kind==="rel")prev.relevance=d.choice;
  if(kind==="fit")prev.fit=d.choice;
  prev.confidence=Math.max(prev.confidence,Number(d.confidence||0));
  byId.set(id,prev);
 }
 const score=(row:Candidate)=>{
  const j=byId.get(row.id)||{relevance:"IRRELEVANT",fit:"WEAK",confidence:0};
  const relevance=j.relevance==="RELEVANT"?100:j.relevance==="ADJACENT"?35:-200;
  const fit=j.fit==="STRONG"?60:j.fit==="TEST"?20:-50;
  const engagement=Math.min(35,Math.log10(Math.max(1,row.views))*3+Math.log10(Math.max(1,row.saves+row.shares))*4);
  return relevance+fit+engagement;
 };
 return rows
  .filter(r=>{const j=byId.get(r.id);return j?.relevance!=="IRRELEVANT"&&j?.fit!=="WEAK"})
  .sort((a,b)=>score(b)-score(a))
  .slice(0,8)
  .map(r=>({
   ...r,
   url:`https://www.tiktok.com/@${r.username||"_"}/video/${r.id}`,
   embedUrl:`https://www.tiktok.com/player/v1/${r.id}?controls=1&progress_bar=1&play_button=1&volume_control=1&fullscreen_button=1&description=1&rel=0`,
   searchQuery:intentQuery(r,product.title),
   jev:byId.get(r.id)||{relevance:"ADJACENT",fit:"TEST",confidence:0}
  }));
}

async function rankFeedWithJev(category:string,rows:Candidate[]){
 if(!rows.length)return[] as Video[];
 const questions:JevQuestion[]=[];
 for(const row of rows.slice(0,18)){
  questions.push({id:`focus:${row.id}`,question:"Is this TikTok primarily about a discoverable physical product, product demo, styling/use case, home item, fashion item, gadget, beauty item, fitness item or other shoppable object rather than general entertainment?",choices:[{label:"PRODUCT_FOCUSED"},{label:"MAYBE_PRODUCT"},{label:"NOT_PRODUCT"}]});
  questions.push({id:`rel:${row.id}`,question:"Is this product video useful discovery content for this YNOT category?",choices:[{label:"RELEVANT"},{label:"ADJACENT"},{label:"IRRELEVANT"}]});
 }
 const context={task:"Build a product-only YNOT discovery video feed. Reject memes, dances, celebrity/news clips, pure entertainment and unrelated content. Do not use TikTok Shop identifiers or merchant links.",category,candidates:rows.slice(0,18).map(r=>({id:r.id,caption:r.caption,hashtags:r.hashtags,onScreenText:r.onScreenText,views:r.views,shares:r.shares,saves:r.saves,engagementRate:r.engagementRate}))};
 const decisions=await askJev(context,questions);
 const state=new Map<string,{focus:string;relevance:string;confidence:number}>();
 for(const d of decisions){const [kind,id]=String(d.id||"").split(":");if(!id)continue;const prev=state.get(id)||{focus:"NOT_PRODUCT",relevance:"IRRELEVANT",confidence:0};if(kind==="focus")prev.focus=d.choice;if(kind==="rel")prev.relevance=d.choice;prev.confidence=Math.max(prev.confidence,Number(d.confidence||0));state.set(id,prev)}
 const score=(r:Candidate)=>{const j=state.get(r.id)||{focus:"NOT_PRODUCT",relevance:"IRRELEVANT",confidence:0};const f=j.focus==="PRODUCT_FOCUSED"?120:j.focus==="MAYBE_PRODUCT"?25:-250;const rel=j.relevance==="RELEVANT"?80:j.relevance==="ADJACENT"?15:-160;const engagement=Math.min(45,Math.log10(Math.max(1,r.views))*4+Math.log10(Math.max(1,r.saves+r.shares))*5);return f+rel+engagement};
 return rows.filter(r=>{const j=state.get(r.id);return j?.focus==="PRODUCT_FOCUSED"&&j?.relevance!=="IRRELEVANT"}).sort((a,b)=>score(b)-score(a)).slice(0,10).map(r=>({...r,url:`https://www.tiktok.com/@_/video/${r.id}`,embedUrl:`https://www.tiktok.com/player/v1/${r.id}?controls=1&progress_bar=1&play_button=1&volume_control=1&fullscreen_button=1&description=1&rel=0`,searchQuery:intentQuery(r,category),jev:{relevance:state.get(r.id)?.relevance||"RELEVANT",fit:state.get(r.id)?.focus||"PRODUCT_FOCUSED",confidence:state.get(r.id)?.confidence||0}}));
}

export async function GET(req:NextRequest){
 const s=req.nextUrl.searchParams;
 const mode=String(s.get("mode")||"product");
 const category=String(s.get("category")||"").trim().slice(0,140);
 const subcategories=String(s.get("subcategories")||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,12);
 if(mode==="feed"){
  if(!category)return NextResponse.json({videos:[],error:"CATEGORY_REQUIRED"},{status:400});
  const feedQuery=[category,...subcategories].join(" ").slice(0,180);
  try{
   const rows=await candidates(feedQuery);
   console.info("Product video feed candidates",{category,query:feedQuery,count:rows.length});
   const videos=await validateEmbeds(await rankFeedWithJev(category,rows));
   console.info("Product video feed Jev result",{category,candidates:rows.length,selected:videos.length});
   return NextResponse.json({source:"live-tiktok+jev",intelligence:"jev",jevEnabled:Boolean(process.env.TYPESAFE_API_KEY),query:feedQuery,candidateCount:rows.length,videos},{headers:{"Cache-Control":videos.length?"s-maxage=900, stale-while-revalidate=3600":"no-store"}});
  }catch(error){
   const message=error instanceof Error?error.message:"PRODUCT_VIDEO_FEED_FAILED";
   console.error("Product video feed failed",{category,message});
   return NextResponse.json({source:"huggingface+tiktok-embed",intelligence:"jev",jevEnabled:Boolean(process.env.TYPESAFE_API_KEY),query:feedQuery,videos:[],error:message},{status:502,headers:{"Cache-Control":"no-store"}});
  }
 }
 const title=String(s.get("title")||"").trim().slice(0,180);
 const brand=String(s.get("brand")||"").trim().slice(0,80);
 const tags=String(s.get("tags")||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,10);
 const description=String(s.get("description")||"").trim().slice(0,500);
 if(!title)return NextResponse.json({videos:[],error:"TITLE_REQUIRED"},{status:400});
 const query=searchQuery(title,brand,tags);
 try{
  const rows=await candidates(query);
  console.info("Product video candidates",{title,query,count:rows.length});
  const videos=await validateEmbeds(await rankWithJev({title,brand,tags,description},rows));
  console.info("Product video Jev result",{title,candidates:rows.length,selected:videos.length});
  return NextResponse.json({
   source:"huggingface+tiktok-embed",
   intelligence:"jev",
   jevEnabled:Boolean(process.env.TYPESAFE_API_KEY),
   query,
   videos
  },{headers:{"Cache-Control":videos.length?"s-maxage=900, stale-while-revalidate=3600":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:"PRODUCT_VIDEO_SEARCH_FAILED";
  console.error("Product video lookup failed",{query,message});
  return NextResponse.json({source:"huggingface+tiktok-embed",intelligence:"jev",jevEnabled:Boolean(process.env.TYPESAFE_API_KEY),query,videos:[],error:message},{status:502,headers:{"Cache-Control":"no-store"}});
 }
}
