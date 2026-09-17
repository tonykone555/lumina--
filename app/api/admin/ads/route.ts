import {NextRequest,NextResponse} from "next/server";
import {adminDb,adminErrorStatus,requireYnotAdmin} from "@/lib/ynot/admin-server";

export const runtime="nodejs";

async function counts(){
 const [niches,creatives,jobs,campaigns,strategies]=await Promise.all([
  adminDb("ynot_ad_niches?select=id,name,category,subcategory,attributes,query,status,created_at&order=created_at.desc&limit=120"),
  adminDb("ynot_ad_creatives?select=id,status,quality_score,template_key,aspect_ratio,hook,headline,cta,payload,source_product_ids,created_at,updated_at&order=created_at.desc&limit=120"),
  adminDb("ynot_ad_jobs?select=id,status,job_type,creative_id,provider,output,created_at&order=created_at.desc&limit=120"),
  adminDb("ynot_ad_campaigns?select=id,status,platform,daily_budget,currency,name,objective,created_at&order=created_at.desc&limit=120"),
  adminDb("ynot_ad_strategies?select=id,name,objective,country,platform,daily_budget,currency,niche_queries,creative_mix,test_plan,status,created_at&order=created_at.desc&limit=60")
 ]);
 const count=(rows:any[],status?:string)=>status?rows.filter(row=>row.status===status).length:rows.length;
 return {niches:{total:count(niches),active:count(niches,"active"),draft:count(niches,"draft")},creatives:{total:count(creatives),draft:count(creatives,"draft"),approved:count(creatives,"approved"),rendered:count(creatives,"rendered")},jobs:{total:count(jobs),queued:count(jobs,"queued"),running:count(jobs,"running"),failed:count(jobs,"failed")},campaigns:{total:count(campaigns),draft:count(campaigns,"draft"),active:count(campaigns,"active")},strategies:{total:count(strategies),draft:count(strategies,"draft"),active:count(strategies,"active")},recentNiches:niches.slice(0,30),recentCreatives:creatives.slice(0,30),recentJobs:jobs.slice(0,30),recentCampaigns:campaigns.slice(0,30),recentStrategies:strategies.slice(0,20)};
}

export async function GET(req:NextRequest){try{const admin=await requireYnotAdmin(req);return NextResponse.json({ok:true,owner:{name:admin.profile.display_name||"YNOT Owner"},overview:await counts()})}catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"ADMIN_ERROR"},{status:adminErrorStatus(error)})}}

export async function POST(req:NextRequest){
 try{
  const admin=await requireYnotAdmin(req);const body=await req.json().catch(()=>({}));const action=String(body?.action||"");
  if(action==="create_niche"){
   const name=String(body?.name||"").trim().slice(0,120);if(!name)return NextResponse.json({ok:false,error:"NICHE_NAME_REQUIRED"},{status:400});
   const rows=await adminDb("ynot_ad_niches",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({name,category:String(body?.category||"").slice(0,80)||null,subcategory:String(body?.subcategory||"").slice(0,80)||null,attributes:Array.isArray(body?.attributes)?body.attributes.slice(0,20):[],query:String(body?.query||name).slice(0,500),status:String(body?.status||"draft").slice(0,20),created_by:admin.profile.id})});return NextResponse.json({ok:true,niche:rows?.[0]});
  }
  if(action==="create_strategy"){
   const rows=await adminDb("ynot_ad_strategies",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({created_by:admin.profile.id,name:String(body?.name||"YNOT test plan").trim().slice(0,140),objective:String(body?.objective||"sales").slice(0,80),country:String(body?.country||"France").slice(0,80),platform:String(body?.platform||"Meta + Instagram").slice(0,100),daily_budget:Number(body?.dailyBudget||10),currency:String(body?.currency||"EUR").slice(0,10),niche_queries:Array.isArray(body?.nicheQueries)?body.nicheQueries.slice(0,50):[],creative_mix:body?.creativeMix||{},test_plan:body?.testPlan||{},status:"draft"})});return NextResponse.json({ok:true,strategy:rows?.[0]});
  }
  if(action==="create_creative"){
   const productIds=Array.isArray(body?.productIds)?body.productIds.map((v:unknown)=>String(v)).filter(Boolean).slice(0,12):[];if(!productIds.length)return NextResponse.json({ok:false,error:"PRODUCTS_REQUIRED"},{status:400});
   const payload={products:Array.isArray(body?.products)?body.products.slice(0,12):[],niche:body?.niche||null,format:body?.aspectRatio||"9:16",intent:body?.intent||"conversion",ticket:body?.ticket||"mixed",createdFrom:"ynot-ad-factory-v3"};
   const rows=await adminDb("ynot_ad_creatives",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({niche_id:body?.nicheId||null,created_by:admin.profile.id,source_product_ids:productIds,template_key:String(body?.templateKey||"things-i-found").slice(0,80),aspect_ratio:String(body?.aspectRatio||"9:16").slice(0,20),hook:String(body?.hook||"").slice(0,500)||null,primary_text:String(body?.primaryText||"").slice(0,2000)||null,headline:String(body?.headline||"").slice(0,500)||null,cta:String(body?.cta||"Shop on YNOT").slice(0,120),payload,status:"draft"})});return NextResponse.json({ok:true,creative:rows?.[0]});
  }
  if(action==="bulk_generate_creatives"){
   const products=Array.isArray(body?.products)?body.products.slice(0,24):[];if(!products.length)return NextResponse.json({ok:false,error:"PRODUCTS_REQUIRED"},{status:400});
   const requested=Math.max(1,Math.min(60,Number(body?.count||12)));const hooks=Array.isArray(body?.hooks)&&body.hooks.length?body.hooks.slice(0,12):[String(body?.hook||"Things worth finding on YNOT")];const templates=Array.isArray(body?.templates)&&body.templates.length?body.templates.slice(0,8):["things-i-found","ugc-discovery","collection-edit","single-product-premium","ynot-lens"];const formats=Array.isArray(body?.formats)&&body.formats.length?body.formats:["9:16","4:5","1:1"];
   const rows=[] as any[];
   for(let i=0;i<requested;i++){
    const size=Math.min(products.length,1+(i%Math.min(6,products.length)));const start=i%products.length;const picked=Array.from({length:size},(_,j)=>products[(start+j)%products.length]);const template=String(templates[i%templates.length]);const aspect=String(formats[i%formats.length]);const hook=String(hooks[i%hooks.length]);
    rows.push({created_by:admin.profile.id,source_product_ids:picked.map((p:any)=>String(p.id||p.product_id||"")).filter(Boolean),template_key:template,aspect_ratio:aspect,hook,primary_text:String(body?.primaryText||`${hook}. Discover the full edit on YNOT.`).slice(0,2000),headline:String(body?.headline||body?.nicheName||"Discover on YNOT").slice(0,500),cta:"Explore on YNOT",payload:{products:picked,niche:body?.nicheName||null,intent:body?.intent||"mixed",ticket:body?.ticket||"mixed",audience:body?.audience||null,variant:i+1,createdFrom:"ynot-bulk-v1"},status:"draft"});
   }
   const created=await adminDb("ynot_ad_creatives",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(rows)});return NextResponse.json({ok:true,count:created?.length||rows.length,creatives:created});
  }
  if(action==="update_creative_status"){
   const creativeId=String(body?.creativeId||"");const status=String(body?.status||"");if(!creativeId||!["draft","approved","rejected"].includes(status))return NextResponse.json({ok:false,error:"INVALID_CREATIVE_UPDATE"},{status:400});const rows=await adminDb(`ynot_ad_creatives?id=eq.${encodeURIComponent(creativeId)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({status,updated_at:new Date().toISOString()})});return NextResponse.json({ok:true,creative:rows?.[0]});
  }
  if(action==="regenerate_creative"){
   const creativeId=String(body?.creativeId||"");if(!creativeId)return NextResponse.json({ok:false,error:"CREATIVE_REQUIRED"},{status:400});const source=(await adminDb(`ynot_ad_creatives?id=eq.${encodeURIComponent(creativeId)}&select=*&limit=1`))?.[0];if(!source)return NextResponse.json({ok:false,error:"CREATIVE_NOT_FOUND"},{status:404});const rows=await adminDb("ynot_ad_creatives",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({niche_id:source.niche_id,created_by:admin.profile.id,source_product_ids:source.source_product_ids,template_key:source.template_key,aspect_ratio:source.aspect_ratio,hook:source.hook,primary_text:source.primary_text,headline:source.headline,cta:source.cta,payload:{...(source.payload||{}),regeneratedFrom:creativeId,variantSeed:Date.now()},status:"draft"})});return NextResponse.json({ok:true,creative:rows?.[0]});
  }
  if(action==="queue_render"){
   const creativeId=String(body?.creativeId||"");if(!creativeId)return NextResponse.json({ok:false,error:"CREATIVE_REQUIRED"},{status:400});const rows=await adminDb("ynot_ad_jobs",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({creative_id:creativeId,job_type:"render",status:"queued",provider:"remotion",output:{requestedAspectRatio:body?.aspectRatio||"9:16"}})});await adminDb(`ynot_ad_creatives?id=eq.${encodeURIComponent(creativeId)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({status:"queued",updated_at:new Date().toISOString()})});return NextResponse.json({ok:true,job:rows?.[0]});
  }
  if(action==="create_campaign_draft"){
   const creativeId=String(body?.creativeId||"");if(!creativeId)return NextResponse.json({ok:false,error:"CREATIVE_REQUIRED"},{status:400});const rows=await adminDb("ynot_ad_campaigns",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({name:String(body?.name||"YNOT test campaign").slice(0,140),platform:String(body?.platform||"meta").slice(0,40),objective:String(body?.objective||"sales").slice(0,80),daily_budget:Number(body?.dailyBudget||10),currency:String(body?.currency||"EUR").slice(0,10),status:"draft",created_by:admin.profile.id,settings:{creativeId,audience:body?.audience||null,intent:body?.intent||"conversion"}})});return NextResponse.json({ok:true,campaign:rows?.[0]});
  }
  return NextResponse.json({ok:false,error:"UNKNOWN_ACTION"},{status:400});
 }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"ADMIN_ERROR"},{status:adminErrorStatus(error)})}
}
