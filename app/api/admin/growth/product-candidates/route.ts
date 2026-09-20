import {NextRequest,NextResponse} from "next/server";

function cfg(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("SUPABASE_SERVER_NOT_CONFIGURED");return{url:url.replace(/\/$/,""),key}}
function headers(key:string){return{apikey:key,...(key.startsWith("sb_")?{}:{Authorization:"Bearer "+key}),"Content-Type":"application/json"}}
async function isAdmin(req:NextRequest){const token=req.cookies.get("ynot-admin-session")?.value;if(!token)return false;const {url,key}=cfg(),pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!pub)return false;const u=await fetch(url+"/auth/v1/user",{headers:{apikey:pub,Authorization:"Bearer "+token}});if(!u.ok)return false;const user=await u.json();const a=await fetch(url+"/rest/v1/ynot_admin_access_requests?user_id=eq."+encodeURIComponent(user.id)+"&status=eq.approved&select=id&limit=1",{headers:headers(key)});return a.ok&&(await a.json()).length>0}
function n(v:any){const x=Number(v);return Number.isFinite(x)?x:0}
function contentScore(r:any){
 const visual=n(r.visual_distinctiveness),iq=n(r.image_quality),iv=n(r.image_variety),offer=n(r.offer_clarity),niche=n(r.niche_relevance),proof=n(r.social_proof),ynot=n(r.ynot_signal),meta=n(r.metadata_quality),ad=n(r.advertability_score);
 const score=(visual*.20)+(iq*.16)+(iv*.12)+(offer*.15)+(niche*.15)+(ynot*.12)+(proof*.05)+(meta*.05);
 return Math.round((score||ad)*10)/10;
}
function reason(r:any){return [["visual",n(r.visual_distinctiveness)],["images",n(r.image_quality)],["offer",n(r.offer_clarity)],["niche",n(r.niche_relevance)],["YNOT",n(r.ynot_signal)]].sort((a:any,b:any)=>b[1]-a[1]).slice(0,3).filter((x:any)=>x[1]>0).map((x:any)=>x[0]+" "+x[1]).join(" · ")}
const expansions:Record<string,string[]>={
 home:["home decor","lighting","kitchen gadgets","cleaning","organization","bedroom","living room","smart home"],
 fitness:["fitness","gym equipment","recovery","running","workout accessories","sportswear","protein shaker","home gym"],
 beauty:["beauty","skincare","haircare","makeup","beauty tools","self care","fragrance","nails"],
 fashion:["fashion","women clothing","men clothing","shoes","bags","jewelry","streetwear","accessories"],
 tech:["tech","phone accessories","audio","gaming","smart home","chargers","wearables","desk setup"],
 pets:["pet accessories","dog","cat","pet toys","pet grooming","pet beds","pet travel","pet feeding"]
};
function normLive(p:any,niche:string){
 const id=String(p.id||p.ynotId||p.product_id||"");
 return {id,title:p.title||"Untitled product",brand:p.brand||p.sourceBrand||"YNOT",price:p.price??p.ynotPrice??null,currency:p.currency||p.sourceCurrency||"EUR",image:p.image||p.images?.[0]||"",images:Array.isArray(p.images)?p.images:[],url:p.url||"",description:p.description||p.originalTitle||"",category:p.category||niche||"other",content_score:null,why:"Live catalogue",signals:{},candidate_source:"live_catalogue"};
}
export async function GET(req:NextRequest){
 if(!await isAdmin(req))return NextResponse.json({error:"unauthorized"},{status:401});
 const niche=(req.nextUrl.searchParams.get("niche")||"").replace(/[^a-z0-9 _-]/gi,"").trim().toLowerCase();
 const q=(req.nextUrl.searchParams.get("q")||"").replace(/[<>]/g,"").trim();
 const limit=Math.max(20,Math.min(80,Number(req.nextUrl.searchParams.get("limit")||60)));
 const {url,key}=cfg();
 let scorePath="ynot_ad_product_scores?select=source,product_id,title,product_url,image_url,price,currency,image_quality,image_variety,visual_distinctiveness,offer_clarity,niche_relevance,metadata_quality,social_proof,ynot_signal,advertability_score,metadata,scored_at&order=advertability_score.desc.nullslast&limit=80";
 const scoreFilter=q||niche;
 if(scoreFilter)scorePath+="&or=(title.ilike.*"+encodeURIComponent(scoreFilter)+"*,source.ilike.*"+encodeURIComponent(scoreFilter)+"*)";
 const scoredRes=await fetch(url+"/rest/v1/"+scorePath,{headers:headers(key),cache:"no-store"});
 const scoreRows=scoredRes.ok?await scoredRes.json():[];
 const scored=(Array.isArray(scoreRows)?scoreRows:[]).map((x:any)=>({
   id:String(x.product_id||""),title:x.title||"Untitled product",brand:x.metadata?.brand||x.metadata?.merchant_name||x.source||"YNOT",
   price:x.price??null,currency:x.currency||"EUR",image:x.image_url||"",images:Array.isArray(x.metadata?.images)?x.metadata.images:[],
   url:x.product_url||"",description:x.metadata?.description||"",category:x.metadata?.category||niche||"other",
   content_score:contentScore(x),advertability_score:x.advertability_score??null,
   signals:{visual_distinctiveness:x.visual_distinctiveness,image_quality:x.image_quality,image_variety:x.image_variety,offer_clarity:x.offer_clarity,niche_relevance:x.niche_relevance,ynot_signal:x.ynot_signal,social_proof:x.social_proof},
   why:reason(x),candidate_source:"ranked"
 })).filter((x:any)=>x.id&&x.image);

 const terms=q?[q]:[niche,...(expansions[niche]||[])].filter(Boolean);
 const liveLists=await Promise.all(terms.slice(0,9).map(async term=>{
   try{
     const u=new URL("/api/catalog",req.nextUrl.origin);u.searchParams.set("q",term);u.searchParams.set("source","shopify");u.searchParams.set("country","FR");
     const r=await fetch(u,{cache:"no-store"});if(!r.ok)return[];
     const j=await r.json();return (Array.isArray(j?.products)?j.products:[]).slice(0,20).map((p:any)=>normLive(p,niche));
   }catch{return[]}
 }));
 const merged=new Map<string,any>();
 for(const p of [...scored,...liveLists.flat()]){
   const keyId=p.id||p.url||((p.brand||"")+"|"+p.title);
   if(!keyId||merged.has(keyId))continue;
   merged.set(keyId,p);
 }
 let candidates=[...merged.values()];
 if(q){
   const s=q.toLowerCase(); candidates.sort((a,b)=>{
     const am=(a.title+" "+a.brand+" "+a.description).toLowerCase().includes(s)?1:0,bm=(b.title+" "+b.brand+" "+b.description).toLowerCase().includes(s)?1:0;
     if(am!==bm)return bm-am;
     return (b.content_score||0)-(a.content_score||0);
   });
 }else candidates.sort((a,b)=>(b.content_score||0)-(a.content_score||0));
 candidates=candidates.slice(0,limit);
 return NextResponse.json({selection_mode:"ynot_ranked_manual",niche,query:q,total:candidates.length,candidates});
}
