import {NextRequest,NextResponse} from "next/server";
import {huggingFaceConfigured,motionPrompt,rest,sourceHash,submitHuggingFace,type VideoProduct} from "@/lib/catalog/hf-video";

export const runtime="nodejs";
export const maxDuration=60;

type JobRow={id:string;product_id:string;source_image_hash:string;external_job_id?:string|null;status:string;video_url?:string|null;error?:string|null};

async function countProcessing(){
 const rows=await rest("ynot_video_jobs?select=id&status=eq.processing&limit=8");
 return Array.isArray(rows)?rows.length:0;
}

async function existingVideo(productId:string,hash:string){
 const q="ynot_product_media?select=product_id,video_url,poster_url,status&product_id=eq."+encodeURIComponent(productId)+"&source_image_hash=eq."+encodeURIComponent(hash)+"&media_type=eq.video_ai&status=eq.ready&limit=1";
 const rows=await rest(q);
 return Array.isArray(rows)&&rows[0]?.video_url?rows[0]:null;
}

async function jobFor(productId:string,hash:string){
 const q="ynot_video_jobs?select=id,product_id,source_image_hash,external_job_id,status,video_url,error&product_id=eq."+encodeURIComponent(productId)+"&source_image_hash=eq."+encodeURIComponent(hash)+"&provider=eq.huggingface_zerogpu_lightricks&model=eq.ltx_video_0_9_8_13b_distilled&limit=1";
 const rows=await rest(q);
 return (Array.isArray(rows)?rows[0]:null) as JobRow|null;
}

async function createOrResetJob(product:VideoProduct,hash:string,prompt:string){
 const payload=[{product_id:product.id,source_image_url:product.image,source_image_hash:hash,title:product.title,category:product.category||null,prompt,provider:"huggingface_zerogpu_lightricks",model:"ltx_video_0_9_8_13b_distilled",status:"queued",error:null,poster_url:product.image,metadata:{duration_seconds:2,width:512,height:640,source:"ynot-deals",space:"Lightricks/ltx-video-distilled",api:"image_to_video"},updated_at:new Date().toISOString()}];
 const rows=await rest("ynot_video_jobs?on_conflict=product_id,source_image_hash,provider,model",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify(payload)});
 return rows?.[0] as JobRow;
}

async function start(job:JobRow,product:VideoProduct,prompt:string){
 const eventId=await submitHuggingFace(product,prompt);
 const rows=await rest("ynot_video_jobs?id=eq."+encodeURIComponent(job.id),{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({external_job_id:eventId,status:"processing",error:null,updated_at:new Date().toISOString()})});
 return rows?.[0]||{...job,external_job_id:eventId,status:"processing"};
}

export async function POST(req:NextRequest){
 try{
  const b=await req.json().catch(()=>({}));
  const products:VideoProduct[]=(Array.isArray(b?.products)?b.products:[]).slice(0,12).map((p:any)=>({id:String(p?.id||"").slice(0,500),title:String(p?.title||"").slice(0,260),image:String(p?.image||"").slice(0,1800),category:String(p?.category||"").slice(0,160)})).filter((p:VideoProduct)=>p.id&&p.image);
  if(!products.length)return NextResponse.json({configured:huggingFaceConfigured(),jobs:{}});
  let slots=Math.max(0,1-await countProcessing());
  const out:Record<string,any>={};
  for(const product of products){
   const hash=sourceHash(product.image);
   const ready=await existingVideo(product.id,hash);
   if(ready){out[product.id]={status:"ready",video_url:ready.video_url,poster_url:ready.poster_url||product.image};continue}
   const prompt=motionPrompt(product);
   let job=await jobFor(product.id,hash);
   if(!job||job.status==="failed")job=await createOrResetJob(product,hash,prompt);
   if(job.status==="queued"&&slots>0&&huggingFaceConfigured()){
    try{job=await start(job,product,prompt);slots--}
    catch(e){await rest("ynot_video_jobs?id=eq."+encodeURIComponent(job.id),{method:"PATCH",body:JSON.stringify({status:"queued",error:e instanceof Error?e.message:"HF_SUBMIT_FAILED",updated_at:new Date().toISOString()})}).catch(()=>{});}
   }
   out[product.id]={status:job.status,event_id:job.external_job_id||null,error:job.error||null};
  }
  return NextResponse.json({configured:huggingFaceConfigured(),jobs:out});
 }catch(e){
  const m=e instanceof Error?e.message:"VIDEO_GENERATE_FAILED";
  return NextResponse.json({error:m},{status:/NOT_CONFIGURED/.test(m)?503:500});
 }
}
