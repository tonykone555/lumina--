import {NextRequest,NextResponse} from "next/server";
import {adminDb} from "@/lib/ynot/admin-server";
import {aiProductBatchIntelligence,researchMarketWithWeb,scoreMarket,type CatalogueProduct} from "@/lib/ynot/commercial-intelligence";

export const runtime="nodejs";
export const maxDuration=300;

const RADAR_SEEDS=["professional automotive diagnostic scanner","thermal imaging inspection camera","premium recovery compression boots","golf launch monitor simulator","creator camera monitor wireless video","portable power station solar generator","premium home cinema projector","professional workshop laser measurement tools","smart home security system","premium espresso grinder machine","3d printer professional maker tools","cycling radar camera safety","premium ergonomic standing desk","professional drone accessories","infrared sauna home wellness"];
function dedupe(rows:CatalogueProduct[]){const seen=new Set<string>();return rows.filter(p=>{const key=String(p.id||`${p.title}|${p.brand}`).toLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true})}
async function searchCatalog(origin:string,queries:string[]){const attempts=await Promise.all(queries.slice(0,10).map(async query=>{try{const u=new URL("/api/catalog",origin);u.searchParams.set("q",query);u.searchParams.set("source","shopify");u.searchParams.set("country","FR");u.searchParams.set("limit","36");const r=await fetch(u,{cache:"no-store",headers:{"x-ynot-research":"automation"}}),d=await r.json().catch(()=>({}));return Array.isArray(d?.products)?d.products:[]}catch{return[]}}));return dedupe(attempts.flat()).filter((p:any)=>p?.id&&p?.title&&p?.image&&p?.url&&p.url!=="#").slice(0,120) as CatalogueProduct[]}
function score(ai:any,price:number){const ticket=price>=250?20:price>=80?12:0;return Math.round((Number(ai?.commercialPotential||0)*.38)+(Number(ai?.highTicketFit||0)*.28)+(Number(ai?.replicability||0)*.18)+(Number(ai?.relevance||0)*.16)+ticket)}
async function patch(id:string,body:any){return adminDb(`ynot_automation_jobs?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({...body,updated_at:new Date().toISOString()})})}

export async function GET(req:NextRequest){
 const queued=await adminDb("ynot_automation_jobs?status=eq.queued&select=*&order=created_at.asc&limit=1"),job=queued?.[0];
 if(!job)return NextResponse.json({ok:true,processed:false});
 const ua=req.headers.get("user-agent")||"",cronSecret=String(process.env.CRON_SECRET||""),auth=req.headers.get("authorization")||"",manualToken=String(req.nextUrl.searchParams.get("token")||""),jobToken=String(job?.payload?.run_token||"");
 const validManual=Boolean(manualToken&&jobToken&&manualToken===jobToken&&job.source==="chatgpt"),validCron=cronSecret?auth===`Bearer ${cronSecret}`:ua.toLowerCase().includes("vercel-cron");
 if(!validManual&&!validCron)return NextResponse.json({ok:false,error:"UNAUTHORIZED"},{status:401});
 await patch(job.id,{status:"running",progress:8,started_at:new Date().toISOString(),error:null});
 try{
  const prompt=String(job.prompt||job.title||"").trim(),broad=job.job_type==="daily_radar"||(job.job_type==="high_ticket_radar"&&prompt.length>120),researchName=broad?"YNOT mid and high-ticket opportunity radar":job.title||prompt,researchQuery=broad?"mid and high-ticket ecommerce products with replacement, upgrade, professional and complete-system buying behavior":prompt,research=await researchMarketWithWeb(researchName,researchQuery,null);
  await patch(job.id,{progress:32,result_summary:`Market research complete. Building catalogue evidence for ${job.title}.`});
  const fallback=broad?RADAR_SEEDS:[prompt,`${prompt} professional`,`${prompt} premium`,`${prompt} upgrade`,`${prompt} replacement`,`${prompt} complete system`,`${prompt} accessories`];
  const researched=(research.value.catalogueQueries||[]).map(x=>String(x||"").trim()).filter(x=>x.length>=3&&x.length<=140),queries=[...new Set([...researched,...fallback].filter(Boolean))];
  const products=await searchCatalog(req.nextUrl.origin,queries);
  if(!products.length){const result={research:{...research.value,usedAi:research.usedAi,usedWeb:research.usedWeb,diagnostic:research.diagnostic},queries,totalProducts:0,topProducts:[]};await patch(job.id,{status:"needs_approval",progress:100,result,result_summary:`No catalogue evidence returned for ${job.title}. Refine the niche or verify the AI/catalogue connection.`,error:"NO_CATALOGUE_EVIDENCE",completed_at:new Date().toISOString()});return NextResponse.json({ok:true,processed:true,id:job.id,status:"needs_approval",products:0,top:0})}
  await patch(job.id,{progress:58,result_summary:`Found ${products.length} unique catalogue products. Running AI portfolio analysis.`});
  const portfolio=await aiProductBatchIntelligence(researchName,research.value,products.slice(0,60)),byId=new Map(portfolio.items.map((x:any)=>[String(x.productId),x]));
  const ranked=products.map(p=>{const ai=byId.get(String(p.id))||{},price=Number(p.price||0);return {...p,ai,commercialScore:score(ai,price),ticket:price>=250?"high":price>=80?"mid":"low"}}).sort((a,b)=>b.commercialScore-a.commercialScore),preferred=job.job_type==="high_ticket_radar"||job.job_type==="daily_radar"?ranked.filter(x=>x.ticket!=="low"):ranked,top=(preferred.length?preferred:ranked).slice(0,24),metrics=scoreMarket(products,82);
  const result={research:{...research.value,usedAi:research.usedAi,usedWeb:research.usedWeb,diagnostic:research.diagnostic},portfolio:{usedAi:portfolio.usedAi,diagnostic:portfolio.diagnostic},queries,metrics,totalProducts:products.length,topProducts:top};
  const aiLabel=research.usedAi&&portfolio.usedAi?"AI + web intelligence active":"fallback intelligence used";
  await patch(job.id,{status:"succeeded",progress:100,result,result_summary:`Completed ${job.title}: ${products.length} products checked, ${top.length} ranked opportunities saved · ${aiLabel}.`,completed_at:new Date().toISOString()});
  console.log("YNOT_AUTOMATION_COMPLETE",job.id,job.job_type,products.length,top.length,research.diagnostic,portfolio.diagnostic);
  return NextResponse.json({ok:true,processed:true,id:job.id,status:"succeeded",products:products.length,top:top.length,ai:research.usedAi&&portfolio.usedAi});
 }catch(error){const message=error instanceof Error?error.message:String(error);await patch(job.id,{status:"failed",progress:100,error:message.slice(0,1000),result_summary:"Automation failed. Open the job for diagnostics.",completed_at:new Date().toISOString()});console.error("YNOT_AUTOMATION_FAILED",job.id,message);return NextResponse.json({ok:false,processed:true,id:job.id,error:message},{status:500})}
}
