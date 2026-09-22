import {NextRequest,NextResponse} from "next/server";
import {huggingFaceConfigured,persistVideo,pollHuggingFace,rest,submitHuggingFace,type VideoProduct} from "@/lib/catalog/hf-video";

export const runtime="nodejs";
export const maxDuration=60;

type Job={id:string;product_id:string;source_image_url:string;source_image_hash:string;title:string;category?:string|null;prompt:string;external_job_id?:string|null;status:string;video_url?:string|null;poster_url?:string|null;error?:string|null};

async function rowsFor(ids:string[]){
 const filter=ids.length?"&product_id=in.("+encodeURIComponent(ids.map(id=>'"'+id.replace(/"/g,"")+'"').join(","))+")":"";
 const rows=await rest("ynot_video_jobs?select=id,product_id,source_image_url,source_image_hash,title,category,prompt,external_job_id,status,video_url,poster_url,error&status=in.(queued,processing,ready,failed)"+filter+"&order=updated_at.desc&limit=80");
 return Array.isArray(rows)?rows as Job[]:[];
}
async function processingCount(){
 const rows=await rest("ynot_video_jobs?select=id&status=eq.processing&limit=8");
 return Array.isArray(rows)?rows.length:0;
}
async function startQueued(job:Job){
 const product:VideoProduct={id:job.product_id,title:job.title||"",image:job.source_image_url,category:job.category||undefined};
 const eventId=await submitHuggingFace(product,job.prompt);
 await rest("ynot_video_jobs?id=eq."+encodeURIComponent(job.id),{method:"PATCH",body:JSON.stringify({external_job_id:eventId,status:"processing",error:null,updated_at:new Date().toISOString()})});
 return{...job,external_job_id:eventId,status:"processing"};
}
async function poll(job:Job){
 if(!job.external_job_id)return job;
 try{
  const result=await pollHuggingFace(job.external_job_id,3500);
  if(result.status==="processing")return job;
  if(result.status==="failed"){
   await rest("ynot_video_jobs?id=eq."+encodeURIComponent(job.id),{method:"PATCH",body:JSON.stringify({status:"failed",error:result.error,updated_at:new Date().toISOString()})});
   return{...job,status:"failed",error:result.error};
  }
  const videoUrl=await persistVideo(job.product_id,job.source_image_hash,result.url,job.poster_url||job.source_image_url);
  await rest("ynot_video_jobs?id=eq."+encodeURIComponent(job.id),{method:"PATCH",body:JSON.stringify({status:"ready",video_url:videoUrl,error:null,updated_at:new Date().toISOString()})});
  return{...job,status:"ready",video_url:videoUrl,error:null};
 }catch(e){
  const m=e instanceof Error?e.message:"HF_STATUS_FAILED";
  if(/404|NOT_FOUND|OUTPUT_FILE_MISSING/.test(m)){
   await rest("ynot_video_jobs?id=eq."+encodeURIComponent(job.id),{method:"PATCH",body:JSON.stringify({status:"failed",error:m,updated_at:new Date().toISOString()})}).catch(()=>{});
   return{...job,status:"failed",error:m};
  }
  return job;
 }
}

export async function POST(req:NextRequest){
 try{
  const b=await req.json().catch(()=>({}));
  const ids=(Array.isArray(b?.product_ids)?b.product_ids:[]).slice(0,40).map((x:any)=>String(x||"").slice(0,500)).filter(Boolean);
  let jobs=await rowsFor(ids);
  if(huggingFaceConfigured()){
   let slots=Math.max(0,2-await processingCount());
   for(let i=0;i<jobs.length&&slots>0;i++){
    if(jobs[i].status!=="queued")continue;
    try{jobs[i]=await startQueued(jobs[i]);slots--}catch{}
   }
   const processing=jobs.filter(j=>j.status==="processing"&&j.external_job_id).slice(0,4);
   const polled=await Promise.all(processing.map(poll));
   const byId=new Map(polled.map(j=>[j.id,j]));
   jobs=jobs.map(j=>byId.get(j.id)||j);
  }
  const out:Record<string,any>={};
  for(const j of jobs){
   if(out[j.product_id])continue;
   out[j.product_id]={status:j.status,video_url:j.video_url||null,error:j.error||null};
  }
  return NextResponse.json({configured:huggingFaceConfigured(),jobs:out});
 }catch(e){
  return NextResponse.json({error:e instanceof Error?e.message:"VIDEO_STATUS_FAILED"},{status:500});
 }
}
