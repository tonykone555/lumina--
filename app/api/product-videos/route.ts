import {NextRequest,NextResponse} from "next/server";
import {askJev,type JevQuestion} from "@/lib/ai/jev";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const DATASET="datasocial/tiktok-5.6B-videos";
const HF="https://datasets-server.huggingface.co/search";

type Candidate={
 id:string;caption:string;hashtags:string[];onScreenText:string[];views:number;likes:number;shares:number;saves:number;
 engagementRate:number|null;country:string;language:string;isShopVideo:boolean;productId:string;sellerId:string;
};
type Video=Candidate&{url:string;embedUrl:string;jev:{relevance:string;fit:string;confidence:number}};

function words(value:string){
 const stop=new Set(["the","and","for","with","from","this","that","new","shop","buy","sale","product","item","official","best"]);
 return String(value||"").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>2&&!stop.has(w));
}
function searchQuery(title:string,brand:string,tags:string[]){
 const titleWords=words(title).slice(0,6);
 const brandWords=words(brand).slice(0,2);
 const tagWords=tags.flatMap(words).slice(0,4);
 return [...new Set([...brandWords,...titleWords,...tagWords])].join(" ").slice(0,160);
}
function rowValue(row:any){
 return row?.row&&typeof row.row==="object"?row.row:row;
}
function arr(v:any){return Array.isArray(v)?v.map(String).filter(Boolean):[]}
function num(v:any){const n=Number(v);return Number.isFinite(n)?n:0}

async function candidates(query:string){
 const url=new URL(HF);
 url.searchParams.set("dataset",DATASET);
 url.searchParams.set("config","default");
 url.searchParams.set("split","train");
 url.searchParams.set("query",query);
 url.searchParams.set("offset","0");
 url.searchParams.set("length","30");
 const response=await fetch(url,{cache:"force-cache",next:{revalidate:3600},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error(`HF_SEARCH_${response.status}`);
 const data=await response.json().catch(()=>({}));
 const rows=Array.isArray(data?.rows)?data.rows:[];
 const seen=new Set<string>();
 return rows.map(rowValue).map((r:any):Candidate|null=>{
  const id=String(r?.video_id||"");
  if(!/^\d+$/.test(id)||seen.has(id))return null;
  seen.add(id);
  return{
   id,
   caption:String(r?.caption||"").slice(0,500),
   hashtags:arr(r?.hashtags).slice(0,20),
   onScreenText:arr(r?.on_screen_text).slice(0,12),
   views:num(r?.views),likes:num(r?.likes),shares:num(r?.shares),saves:num(r?.saves),
   engagementRate:Number.isFinite(Number(r?.engagement_rate))?Number(r.engagement_rate):null,
   country:String(r?.country||""),language:String(r?.language||""),
   isShopVideo:Number(r?.is_shop_video||0)===1,
   productId:String(r?.product_id||"0"),sellerId:String(r?.seller_id||"0")
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
   views:r.views,shares:r.shares,saves:r.saves,engagementRate:r.engagementRate,isShopVideo:r.isShopVideo
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
   embedUrl:`https://www.tiktok.com/player/v1/${r.id}?autoplay=0&controls=1&progress_bar=1&play_button=1&volume_control=1&fullscreen_button=1&description=1&rel=0`,
   jev:byId.get(r.id)||{relevance:"ADJACENT",fit:"TEST",confidence:0}
  }));
}

export async function GET(req:NextRequest){
 const s=req.nextUrl.searchParams;
 const title=String(s.get("title")||"").trim().slice(0,180);
 const brand=String(s.get("brand")||"").trim().slice(0,80);
 const tags=String(s.get("tags")||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,10);
 const description=String(s.get("description")||"").trim().slice(0,500);
 if(!title)return NextResponse.json({videos:[],error:"TITLE_REQUIRED"},{status:400});
 const query=searchQuery(title,brand,tags);
 try{
  const rows=await candidates(query);
  const videos=await rankWithJev({title,brand,tags,description},rows);
  return NextResponse.json({
   source:"huggingface+tiktok-embed",
   intelligence:"jev",
   jevEnabled:Boolean(process.env.TYPESAFE_API_KEY),
   query,
   videos
  },{headers:{"Cache-Control":"s-maxage=1800, stale-while-revalidate=7200"}});
 }catch(error){
  const message=error instanceof Error?error.message:"PRODUCT_VIDEO_SEARCH_FAILED";
  console.error("Product video lookup failed",{query,message});
  return NextResponse.json({source:"huggingface+tiktok-embed",intelligence:"jev",jevEnabled:Boolean(process.env.TYPESAFE_API_KEY),query,videos:[],error:message},{headers:{"Cache-Control":"s-maxage=120, stale-while-revalidate=600"}});
 }
}
