import {NextRequest,NextResponse} from "next/server";
import {adminDb,adminErrorStatus,requireYnotAdmin} from "@/lib/ynot/admin-server";

export const runtime="nodejs";

const ALLOWED=new Set(["market_research","high_ticket_radar","daily_radar","creative_research"]);

export async function GET(req:NextRequest){
 try{
  await requireYnotAdmin(req);
  const jobs=await adminDb("ynot_automation_jobs?select=*&order=created_at.desc&limit=50");
  return NextResponse.json({ok:true,jobs:jobs||[],aiConfig:{keyConfigured:Boolean(process.env.OPENAI_API_KEY),researchModel:String(process.env.YNOT_RESEARCH_MODEL||process.env.YNOT_INTELLIGENCE_MODEL||"gpt-5.6-terra"),productModel:String(process.env.YNOT_PRODUCT_MODEL||"gpt-5.6-luna")}});
 }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"ADMIN_ERROR"},{status:adminErrorStatus(error)})}
}

export async function POST(req:NextRequest){
 try{
  const admin=await requireYnotAdmin(req),body=await req.json().catch(()=>({}));
  const jobType=String(body?.jobType||"market_research");
  if(!ALLOWED.has(jobType))return NextResponse.json({ok:false,error:"UNSUPPORTED_JOB_TYPE"},{status:400});
  const prompt=String(body?.prompt||body?.query||"").trim().slice(0,1200),title=String(body?.title||prompt||jobType).trim().slice(0,180);
  if(!prompt)return NextResponse.json({ok:false,error:"PROMPT_REQUIRED"},{status:400});
  const rows=await adminDb("ynot_automation_jobs",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({requested_by:admin.profile.id,source:"admin",job_type:jobType,title,prompt,payload:body?.payload||{},status:"queued",progress:0})});
  return NextResponse.json({ok:true,job:rows?.[0]});
 }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"ADMIN_ERROR"},{status:adminErrorStatus(error)})}
}
