import {FunctionTimeoutError,ModalClient,TimeoutError} from "modal";
import type {VideoProduct} from "./hf-video";

const APP_NAME=String(process.env.MODAL_APP_NAME||"ynot-video-worker");
const FUNCTION_NAME=String(process.env.MODAL_FUNCTION_NAME||"generate_video");

function modalClient(){
 const tokenId=String(process.env.MODAL_TOKEN_ID||"");
 const tokenSecret=String(process.env.MODAL_TOKEN_SECRET||"");
 if(!tokenId||!tokenSecret)throw new Error("MODAL_NOT_CONFIGURED");
 return new ModalClient({tokenId,tokenSecret});
}

export function modalConfigured(){
 return Boolean(process.env.MODAL_TOKEN_ID&&process.env.MODAL_TOKEN_SECRET);
}

export async function submitModalVideo(product:VideoProduct,prompt:string){
 const modal=modalClient();
 try{
  const fn=await modal.functions.fromName(APP_NAME,FUNCTION_NAME);
  const call=await fn.spawn([],{
   image_url:product.image,
   prompt,
   product_id:product.id,
   width:512,
   height:320,
   num_frames:25
  });
  return call.functionCallId;
 }finally{
  modal.close();
 }
}

export type ModalVideoResult={
 status:"processing"|"ready"|"failed";
 video_base64?:string;
 content_type?:string;
 model?:string;
 gpu?:string;
 generation_seconds?:number;
 error?:string;
};

export async function pollModalVideo(callId:string,timeoutMs=0):Promise<ModalVideoResult>{
 const modal=modalClient();
 try{
  const call=await modal.functionCalls.fromId(callId);
  try{
   const result=await call.get({timeoutMs});
   if(!result?.ok||!result?.video_base64)return{status:"failed",error:String(result?.error||"MODAL_VIDEO_OUTPUT_MISSING")};
   return{
    status:"ready",
    video_base64:String(result.video_base64),
    content_type:String(result.content_type||"video/mp4"),
    model:String(result.model||"Lightricks/LTX-Video"),
    gpu:String(result.gpu||"L4"),
    generation_seconds:Number(result.generation_seconds||0)
   };
  }catch(e){
   if(e instanceof TimeoutError||e instanceof FunctionTimeoutError||/timeout|not.*ready|pending/i.test(e instanceof Error?e.message:String(e)))return{status:"processing"};
   return{status:"failed",error:e instanceof Error?e.message:"MODAL_STATUS_FAILED"};
  }
 }finally{
  modal.close();
 }
}

function dbConfig(){
 const base=String(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||"").replace(/\/$/,"");
 const key=String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"");
 if(!base||!key)throw new Error("VIDEO_DB_NOT_CONFIGURED");
 return{base,key};
}

export async function persistModalVideo(productId:string,hash:string,videoBase64:string,posterUrl:string,contentType="video/mp4",metadata:Record<string,unknown>={}){
 const{base,key}=dbConfig();
 const bytes=Buffer.from(videoBase64,"base64");
 if(!bytes.length||bytes.byteLength>50*1024*1024)throw new Error("MODAL_VIDEO_SIZE_INVALID");
 const ext=contentType.includes("webm")?"webm":"mp4";
 const safeId=productId.replace(/[^a-zA-Z0-9._-]+/g,"_").slice(0,180);
 const path=`generated/${safeId}/${hash}.${ext}`;
 const headers:Record<string,string>={apikey:key,"Content-Type":contentType,"x-upsert":"true"};
 if(!key.startsWith("sb_"))headers.Authorization="Bearer "+key;
 const up=await fetch(`${base}/storage/v1/object/product-media/${path.split("/").map(encodeURIComponent).join("/")}`,{method:"POST",headers,body:bytes,cache:"no-store"});
 if(!up.ok)throw new Error("VIDEO_STORE_"+up.status+":"+(await up.text()).slice(0,160));
 const publicUrl=`${base}/storage/v1/object/public/product-media/${path.split("/").map(encodeURIComponent).join("/")}`;
 const restHeaders:Record<string,string>={apikey:key,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"};
 if(!key.startsWith("sb_"))restHeaders.Authorization="Bearer "+key;
 const media=await fetch(base+"/rest/v1/ynot_product_media?on_conflict=product_id,media_type,source_image_hash",{
  method:"POST",headers:restHeaders,cache:"no-store",
  body:JSON.stringify([{product_id:productId,source_image_url:posterUrl,source_image_hash:hash,media_type:"video_ai",provider:"modal-ltx",video_url:publicUrl,poster_url:posterUrl,preset:null,status:"ready",priority:60,metadata:{...metadata,cached:true},updated_at:new Date().toISOString()}])
 });
 if(!media.ok)throw new Error("MODAL_MEDIA_DB_"+media.status+":"+(await media.text()).slice(0,160));
 return publicUrl;
}
