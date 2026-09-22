import {NextRequest,NextResponse} from "next/server";
import {huggingFaceConfigured,persistVideo,pollHuggingFace,rest,submitHuggingFace,type VideoProduct} from "@/lib/catalog/hf-video";
import {modalConfigured,persistModalVideo,pollModalVideo,submitModalVideo} from "@/lib/catalog/modal-video";

export const runtime="nodejs";
export const maxDuration=60;

type Job={id:string;product_id:string;source_image_url:string;source_image_hash:string;title:string;category?:string|null;prompt:string;provider:string;model:string;external_job_id?:string|null;status:string;video_url?:string|null;poster_url?:string|null;error?:string|null};

const HF_PROVIDER="huggingface_zerogpu_lightricks",HF_MODEL="ltx_video_0_9_8_13b_distilled";
const MODAL_PROVIDER="modal_ltx",MODAL_MODEL="ltx_video_2b_fast";

function provider(){
 if(modalConfigured())return{provider:MODAL_PROVIDER,model:MODAL_MODEL,configured:true};
 return{provider:HF_PROVIDER,model:HF_MODEL,configured:huggingFaceConfigured()};
}

async function rowsFor(ids:string[],providerName:string,modelName:string){
 const filter=ids.length?"&product_id=in.("+encodeURIComponent(ids.map(id=>'"'+id.replace(/"/g,"")+'"').join(","))+")":"";
 const rows=await rest("ynot_video_jobs?select=id,product_id,source_image_url,source_image_hash,title,category,prompt,provider,model,external_job_id,status,video_url,poster_url,error&provider=eq."+encodeURIComponent(providerName)+"&model=eq."+encodeURIComponent(modelName)+"&status=in.(queued,processing,ready,failed)"+filter+"&order=updated_at.desc&limit=80");
 return Array.isArray(rows)?rows as Job[]:[];
}

async function processingCount(providerName:string,modelName:string){
 const rows=await rest("ynot_video_jobs?select=id&status=eq.processing&provider=eq."+encodeURIComponent(providerName)+"&model=eq."+encodeURIComponent(modelName)+"&limit=8");
 return Array.isArray(rows)?rows.length:0;
}

async function startQueued(job:Job){
 const product:VideoProduct={id:job.product_id,title:job.title||"",image:job.source_image_url,category:job.category||undefined};
 const eventId=job.provider===MODAL_PROVIDER
  ?await submitModalVideo(product,job.prompt)
  :await submitHuggingFace(product,job.prompt);
 await rest("ynot_video_jobs?id=eq."+encodeURIComponent(job.id),{method:"PATCH",body:JSON.stringify({external_job_id:eventId,status:"processing",error:null,updated_at:new Date().toISOString()})});
 return{...job,external_job_id:eventId,status:"processing"};
}

async function poll(job:Job){
 if(!job.external_job_id)return job;

 try{
  if(job.provider===MODAL_PROVIDER){
   const result=await pollModalVideo(job.external_job_id,0);
   if(result.status==="processing")return job;
   if(result.status==="failed"){
    await rest("ynot_video_jobs?id=eq."+encodeURIComponent(job.id),{method:"PATCH",body:JSON.stringify({status:"failed",error:result.error,updated_at:new Date().toISOString()})});
    return{...job,status:"failed",error:result.error};
   }
   const videoUrl=await persistModalVideo(
    job.product_id,
    job.source_image_hash,
    result.video_base64||"",
    job.poster_url||job.source_image_url,
    result.content_type||"video/mp4",
    {model:result.model||MODAL_MODEL,gpu:result.gpu||"L4",generation_seconds:result.generation_seconds||0,runtime:"modal"}
   );
   await rest("ynot_video_jobs?id=eq."+encodeURIComponent(job.id),{method:"PATCH",body:JSON.stringify({status:"ready",video_url:videoUrl,error:null,updated_at:new Date().toISOString()})});
   return{...job,status:"ready",video_url:videoUrl,error:null};
  }

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
  const m=e instanceof Error?e.message:"VIDEO_STATUS_FAILED";
  if(/404|NOT_FOUND|OUTPUT_FILE_MISSING|OUTPUT_MISSING/.test(m)){
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
  const active=provider();
  let jobs=await rowsFor(ids,active.provider,active.model);

  if(active.configured){
   let slots=Math.max(0,1-await processingCount(active.provider,active.model));
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

  return NextResponse.json({configured:active.configured,provider:active.provider,jobs:out});
 }catch(e){
  return NextResponse.json({error:e instanceof Error?e.message:"VIDEO_STATUS_FAILED"},{status:500});
 }
}
