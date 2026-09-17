import {NextRequest,NextResponse} from "next/server";
import {adminDb} from "@/lib/ynot/admin-server";
import {aiProductBatchIntelligence,researchMarketWithWeb,scoreMarket,type CatalogueProduct} from "@/lib/ynot/commercial-intelligence";

export const runtime="nodejs";
export const maxDuration=300;

function dedupe(rows:CatalogueProduct[]){const seen=new Set<string>();return rows.filter(p=>{const key=String(p.id||`${p.title}|${p.brand}`).toLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true})}
async function searchCatalog(origin:string,queries:string[]){
 const attempts=await Promise.all(queries.slice(0,10).map(async query=>{try{const u=new URL("/api/catalog",origin);u.searchParams.set("q",query);u.searchParams.set("source","shopify");u.searchParams.set("country","FR");u.searchParams.set("limit","36");const r=await fetch(u,{cache:"no-store",headers:{"x-ynot-research":"automation"}}),d=await r.json().catch(()=>({}));return Array.isArray(d?.products)?d.products:[]}catch{return[]}}));
 return dedupe(attempts.flat()).filter((p:any)=>p?.id&&p?.title&&p?.image&&p?.url&&p.url!=="#").slice(0,120) as CatalogueProduct[];
}
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
  const prompt=String(job.prompt||job.title||"").trim(),research=await researchMarketWithWeb(job.title||prompt,prompt,null);
  await patch(job.id,{progress:32,result_summary:`Market research complete. Building catalogue evidence for ${job.title}.`});
  const fallback=[prompt,`${prompt} professional`,`${prompt} premium`,`${prompt} upgrade`,`${prompt} replacement`,`${prompt} complete system`,`${prompt} accessories`];
  const queries=[...new Set([...(research.value.catalogueQueries||[]),...fallback].map(x=>String(x||"").trim()).filter(Boolean))];
  const products=await searchCatalog(req.nextUrl.origin,queries);
  await patch(job.id,{progress:58,result_summary:`Found ${products.length} unique catalogue products. Running AI portfolio analysis.`});
  const portfolio=await aiProductBatchIntelligence(job.title||prompt,research.value,products.slice(0,60)),byId=new Map(portfolio.items.map((x:any)=>[String(x.productId),x]));
  const ranked=products.map(p=>{const ai=byId.get(String(p.id))||{},price=Number(p.price||0);return {...p,ai,commercialScore:score(ai,price),ticket:price>=250?"high":price>=80?"mid":"low"}}).sort((a,b)=>b.commercialScore-a.commercialScore);
  const preferred=job.job_type==="high_ticket_radar"?ranked.filter(x=>x.ticket!=="low"):ranked;
  const top=(preferred.length?preferred:ranked).slice(0,24),metrics=scoreMarket(products,82);
  const result={research:{...research.value,usedAi:research.usedAi,usedWeb:research.usedWeb,diagnostic:research.diagnostic},portfolio:{usedAi:portfolio.usedAi,diagnostic:portfolio.diagnostic},queries,metrics,totalProducts:products.length,topProducts:top};
  await patch(job.id,{status:"succeeded",progress:100,result,result_summary:`Completed ${job.title}: ${products.length} products checked, ${top.length} ranked opportunities saved.`,completed_at:new Date().toISOString()});
  console.log("YNOT_AUTOMATION_COMPLETE",job.id,job.job_type,products.length,top.length,research.diagnostic,portfolio.diagnostic);
  return NextResponse.json({ok:true,processed:true,id:job.id,status:"succeeded",products:products.length,top:top.length});
 }catch(error){const message=error instanceof Error?error.message:String(error);await patch(job.id,{status:"failed",progress:100,error:message.slice(0,1000),result_summary:"Automation failed. Open the job for diagnostics.",completed_at:new Date().toISOString()});console.error("YNOT_AUTOMATION_FAILED",job.id,message);return NextResponse.json({ok:false,processed:true,id:job.id,error:message},{status:500})}
}
