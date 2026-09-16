import {NextRequest,NextResponse} from "next/server";
import {adminDb,adminErrorStatus,requireYnotAdmin} from "@/lib/ynot/admin-server";

export const runtime="nodejs";

async function counts(){
 const [niches,creatives,jobs,campaigns]=await Promise.all([
  adminDb("ynot_ad_niches?select=id,status"),
  adminDb("ynot_ad_creatives?select=id,status,quality_score,template_key&order=created_at.desc&limit=60"),
  adminDb("ynot_ad_jobs?select=id,status,job_type&order=created_at.desc&limit=60"),
  adminDb("ynot_ad_campaigns?select=id,status,platform,daily_budget,currency&order=created_at.desc&limit=60")
 ]);
 const count=(rows:any[],status?:string)=>status?rows.filter(row=>row.status===status).length:rows.length;
 return {
  niches:{total:count(niches),active:count(niches,"active"),draft:count(niches,"draft")},
  creatives:{total:count(creatives),draft:count(creatives,"draft"),approved:count(creatives,"approved"),rendered:count(creatives,"rendered")},
  jobs:{total:count(jobs),queued:count(jobs,"queued"),running:count(jobs,"running"),failed:count(jobs,"failed")},
  campaigns:{total:count(campaigns),draft:count(campaigns,"draft"),active:count(campaigns,"active")},
  recentCreatives:creatives.slice(0,12),recentJobs:jobs.slice(0,12),recentCampaigns:campaigns.slice(0,12)
 };
}

export async function GET(req:NextRequest){
 try{
  const admin=await requireYnotAdmin(req);
  return NextResponse.json({ok:true,owner:{name:admin.profile.display_name||"YNOT Owner"},overview:await counts()});
 }catch(error){
  return NextResponse.json({ok:false,error:error instanceof Error?error.message:"ADMIN_ERROR"},{status:adminErrorStatus(error)});
 }
}

export async function POST(req:NextRequest){
 try{
  const admin=await requireYnotAdmin(req);
  const body=await req.json().catch(()=>({}));
  const action=String(body?.action||"");
  if(action==="create_niche"){
   const name=String(body?.name||"").trim().slice(0,120);
   if(!name)return NextResponse.json({ok:false,error:"NICHE_NAME_REQUIRED"},{status:400});
   const rows=await adminDb("ynot_ad_niches",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({name,category:String(body?.category||"").slice(0,80)||null,subcategory:String(body?.subcategory||"").slice(0,80)||null,attributes:Array.isArray(body?.attributes)?body.attributes.slice(0,12):[],query:String(body?.query||name).slice(0,500),status:"draft",created_by:admin.profile.id})});
   return NextResponse.json({ok:true,niche:rows?.[0]});
  }
  if(action==="create_creative"){
   const productIds=Array.isArray(body?.productIds)?body.productIds.map((v:unknown)=>String(v)).filter(Boolean).slice(0,12):[];
   if(!productIds.length)return NextResponse.json({ok:false,error:"PRODUCTS_REQUIRED"},{status:400});
   const payload={products:Array.isArray(body?.products)?body.products.slice(0,12):[],niche:body?.niche||null,format:body?.aspectRatio||"9:16",createdFrom:"ynot-ad-factory-v1"};
   const rows=await adminDb("ynot_ad_creatives",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({niche_id:body?.nicheId||null,created_by:admin.profile.id,source_product_ids:productIds,template_key:String(body?.templateKey||"things-i-found").slice(0,80),aspect_ratio:String(body?.aspectRatio||"9:16").slice(0,20),hook:String(body?.hook||"").slice(0,500)||null,primary_text:String(body?.primaryText||"").slice(0,2000)||null,headline:String(body?.headline||"").slice(0,500)||null,cta:String(body?.cta||"Shop on YNOT").slice(0,120),payload,status:"draft"})});
   return NextResponse.json({ok:true,creative:rows?.[0]});
  }
  if(action==="queue_render"){
   const creativeId=String(body?.creativeId||"");
   if(!creativeId)return NextResponse.json({ok:false,error:"CREATIVE_REQUIRED"},{status:400});
   const rows=await adminDb("ynot_ad_jobs",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({creative_id:creativeId,job_type:"render",status:"queued",provider:"remotion",output:{requestedAspectRatio:body?.aspectRatio||"9:16"}})});
   await adminDb(`ynot_ad_creatives?id=eq.${encodeURIComponent(creativeId)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({status:"queued",updated_at:new Date().toISOString()})});
   return NextResponse.json({ok:true,job:rows?.[0]});
  }
  return NextResponse.json({ok:false,error:"UNKNOWN_ACTION"},{status:400});
 }catch(error){
  return NextResponse.json({ok:false,error:error instanceof Error?error.message:"ADMIN_ERROR"},{status:adminErrorStatus(error)});
 }
}
