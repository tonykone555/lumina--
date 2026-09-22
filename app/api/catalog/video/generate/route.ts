import {NextRequest,NextResponse} from "next/server";
import {huggingFaceConfigured,motionPrompt,rest,sourceHash,submitHuggingFace,type VideoProduct} from "@/lib/catalog/hf-video";
import {modalConfigured,submitModalVideo} from "@/lib/catalog/modal-video";
import {selectVideoCandidates,scoreVideoCandidate,type VideoGenerationSource} from "@/lib/catalog/video-score";

export const runtime="nodejs";
export const maxDuration=60;

type JobRow={id:string;product_id:string;source_image_hash:string;external_job_id?:string|null;status:string;video_url?:string|null;error?:string|null};

const HF_PROVIDER="huggingface_zerogpu_lightricks",HF_MODEL="ltx_video_0_9_8_13b_distilled";
const MODAL_PROVIDER="modal_ltx",MODAL_MODEL="ltx_video_2b_fast";

function provider(){
 if(modalConfigured())return{provider:MODAL_PROVIDER,model:MODAL_MODEL,configured:true};
 return{provider:HF_PROVIDER,model:HF_MODEL,configured:huggingFaceConfigured()};
}

async function countProcessing(providerName:string,modelName:string){
 const rows=await rest("ynot_video_jobs?select=id&status=eq.processing&provider=eq."+encodeURIComponent(providerName)+"&model=eq."+encodeURIComponent(modelName)+"&limit=8");
 return Array.isArray(rows)?rows.length:0;
}

async function existingVideo(productId:string,hash:string){
 const q="ynot_product_media?select=product_id,video_url,poster_url,status&product_id=eq."+encodeURIComponent(productId)+"&source_image_hash=eq."+encodeURIComponent(hash)+"&media_type=eq.video_ai&status=eq.ready&limit=1";
 const rows=await rest(q);
 return Array.isArray(rows)&&rows[0]?.video_url?rows[0]:null;
}

async function jobFor(productId:string,hash:string,providerName:string,modelName:string){
 const q="ynot_video_jobs?select=id,product_id,source_image_hash,external_job_id,status,video_url,error&product_id=eq."+encodeURIComponent(productId)+"&source_image_hash=eq."+encodeURIComponent(hash)+"&provider=eq."+encodeURIComponent(providerName)+"&model=eq."+encodeURIComponent(modelName)+"&limit=1";
 const rows=await rest(q);
 return (Array.isArray(rows)?rows[0]:null) as JobRow|null;
}

async function createOrResetJob(product:VideoProduct,hash:string,prompt:string,providerName:string,modelName:string){
 const isModal=providerName===MODAL_PROVIDER;
 const payload=[{
  product_id:product.id,
  source_image_url:product.image,
  source_image_hash:hash,
  title:product.title,
  category:product.category||null,
  prompt,
  provider:providerName,
  model:modelName,
  status:"queued",
  error:null,
  poster_url:product.image,
  metadata:isModal
   ?{duration_seconds:2,width:512,height:320,source:"ynot-deals",runtime:"modal",gpu:"L4",function:"generate_video"}
   :{duration_seconds:2,width:512,height:640,source:"ynot-deals",space:"Lightricks/ltx-video-distilled",api:"image_to_video"},
  updated_at:new Date().toISOString()
 }];
 const rows=await rest("ynot_video_jobs?on_conflict=product_id,source_image_hash,provider,model",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify(payload)});
 return rows?.[0] as JobRow;
}

async function start(job:JobRow,product:VideoProduct,prompt:string,providerName:string){
 const eventId=providerName===MODAL_PROVIDER
  ?await submitModalVideo(product,prompt)
  :await submitHuggingFace(product,prompt);
 const rows=await rest("ynot_video_jobs?id=eq."+encodeURIComponent(job.id),{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({external_job_id:eventId,status:"processing",error:null,updated_at:new Date().toISOString()})});
 return rows?.[0]||{...job,external_job_id:eventId,status:"processing"};
}

export async function POST(req:NextRequest){
 try{
  const b=await req.json().catch(()=>({}));
  const products:VideoProduct[]=(Array.isArray(b?.products)?b.products:[]).slice(0,12).map((p:any)=>({
   id:String(p?.id||"").slice(0,500),
   title:String(p?.title||"").slice(0,260),
   image:String(p?.image||"").slice(0,1800),
   category:String(p?.category||"").slice(0,160)
  })).filter((p:VideoProduct)=>p.id&&p.image);
  const active=provider();
  if(!products.length)return NextResponse.json({configured:active.configured,provider:active.provider,jobs:{}});
  const requestedSource=String(b?.source||"search");
  const source:VideoGenerationSource=requestedSource==="showcase"?"showcase":requestedSource==="admin"?"admin":"search";
  const selected=selectVideoCandidates(products,source),selectedIds=new Set(selected.map(x=>x.product.id));
  let slots=Math.max(0,1-await countProcessing(active.provider,active.model));
  const out:Record<string,any>={};

  for(const product of products){
   if(!selectedIds.has(product.id)){
    const scored=scoreVideoCandidate(product,source);
    out[product.id]={status:"skipped",score:scored.score,reasons:scored.reasons};
    continue;
   }

   const hash=sourceHash(product.image);
   const ready=await existingVideo(product.id,hash);
   if(ready){
    out[product.id]={status:"ready",video_url:ready.video_url,poster_url:ready.poster_url||product.image};
    continue;
   }

   const prompt=motionPrompt(product);
   let job=await jobFor(product.id,hash,active.provider,active.model);
   if(!job||job.status==="failed")job=await createOrResetJob(product,hash,prompt,active.provider,active.model);

   if(job.status==="queued"&&slots>0&&active.configured){
    try{
     job=await start(job,product,prompt,active.provider);
     slots--;
    }catch(e){
     await rest("ynot_video_jobs?id=eq."+encodeURIComponent(job.id),{
      method:"PATCH",
      body:JSON.stringify({status:"queued",error:e instanceof Error?e.message:"VIDEO_SUBMIT_FAILED",updated_at:new Date().toISOString()})
     }).catch(()=>{});
    }
   }

   const scored=scoreVideoCandidate(product,source);
   out[product.id]={status:job.status,event_id:job.external_job_id||null,error:job.error||null,score:scored.score,reasons:scored.reasons};
  }

  return NextResponse.json({configured:active.configured,provider:active.provider,jobs:out});
 }catch(e){
  const m=e instanceof Error?e.message:"VIDEO_GENERATE_FAILED";
  return NextResponse.json({error:m},{status:/NOT_CONFIGURED/.test(m)?503:500});
 }
}
