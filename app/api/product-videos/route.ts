import {NextRequest,NextResponse} from "next/server";
import {askJev,type JevQuestion} from "@/lib/ai/jev";
import {searchTikTokVideos,searchGoogleIntent} from "@/lib/intelligence/fetchlayer-social";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const DATASET="datasocial/tiktok-5.6B-videos";
const HF="https://datasets-server.huggingface.co/search";
const HF_SEARCH_TIMEOUT_MS=12000;
const HF_FALLBACK_TIMEOUT_MS=10000;

type Candidate={
 id:string;caption:string;hashtags:string[];onScreenText:string[];views:number;likes:number;shares:number;saves:number;
 engagementRate:number|null;country:string;language:string;
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
   const id=url.match(/\\/video\\/(\\d{10,20})/)?.[1]||"";
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
  const data=await response.json().catch(()=>({}));
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
async function candidates(query:string){
 const live=await liveTikTokCandidates(query);
 if(live.length)return live;
 const google=await googleTikTokCandidates(query);
 if(google.length)return google;

 const terms=[...new Set(words(query))].slice(0,4);
 let rows:any[]=[];
 if(terms.length){
  const settled=await Promise.allSettled(terms.map(fetchSearch));
  for(const result of settled)if(result.status==="fulfilled")rows.push(...result.value);
 }
 if(!rows.length)rows=await fetchFirstRows();
 const seen=new Set<string>();
 return rows.map(rowValue).map((r:any):Candidate|null=>{
  const id=String(r?.video_id||"");
  if(!/^\d{10,20}$/.test(id)||seen.has(id))return null;
  seen.add(id);
  return{
   id,
   caption:String(r?.caption||"").slice(0,500),
   hashtags:arr(r?.hashtags).slice(0,20),
   onScreenText:arr(r?.on_screen_text).slice(0,12),
   views:num(r?.views),likes:num(r?.likes),shares:num(r?.shares),saves:num(r?.saves),
   engagementRate:Number.isFinite(Number(r?.engagement_rate))?Number(r.engagement_rate):null,
   country:String(r?.country||""),language:String(r?.language||"")
  };
 }).filter((x):x is Candidate=>Boolean(x));
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
   url:`https://www.tiktok.com/@_/video/${r.id}`,
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
   const videos=await rankFeedWithJev(category,rows);
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
  const videos=await rankWithJev({title,brand,tags,description},rows);
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
