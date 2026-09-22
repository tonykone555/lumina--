import {FunctionTimeoutError,ModalClient,TimeoutError} from "modal";

const APP_NAME=String(process.env.MODAL_APP_NAME||"ynot-video-worker");
const FUNCTION_NAME=String(process.env.MODAL_STUDIO_FUNCTION_NAME||"generate_studio_video");

function client(){
 const tokenId=String(process.env.MODAL_TOKEN_ID||"");
 const tokenSecret=String(process.env.MODAL_TOKEN_SECRET||"");
 if(!tokenId||!tokenSecret)throw new Error("MODAL_NOT_CONFIGURED");
 return new ModalClient({tokenId,tokenSecret});
}

export function modalStudioConfigured(){
 return Boolean(String(process.env.MODAL_TOKEN_ID||"").trim()&&String(process.env.MODAL_TOKEN_SECRET||"").trim());
}

function db(){
 const base=String(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||"").replace(/\/$/,"");
 const key=String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"");
 if(!base||!key)throw new Error("VIDEO_DB_NOT_CONFIGURED");
 return{base,key};
}

async function storeVideo(videoBase64:string,contentType="video/mp4"){
 const {base,key}=db();
 const bytes=Buffer.from(videoBase64,"base64");
 if(!bytes.length||bytes.byteLength>80*1024*1024)throw new Error("MODAL_STUDIO_VIDEO_SIZE_INVALID");
 const path=`generated/modal/${Date.now()}-${crypto.randomUUID()}.mp4`;
 const headers:Record<string,string>={apikey:key,"Content-Type":contentType,"x-upsert":"false"};
 if(!key.startsWith("sb_"))headers.Authorization="Bearer "+key;
 const up=await fetch(`${base}/storage/v1/object/creator-studio/${path.split("/").map(encodeURIComponent).join("/")}`,{method:"POST",headers,body:bytes,cache:"no-store"});
 if(!up.ok)throw new Error("MODAL_STUDIO_STORE_"+up.status+":"+(await up.text()).slice(0,180));
 const sign=await fetch(`${base}/storage/v1/object/sign/creator-studio/${path.split("/").map(encodeURIComponent).join("/")}`,{
  method:"POST",
  headers:{apikey:key,...(key.startsWith("sb_")?{}:{Authorization:"Bearer "+key}),"Content-Type":"application/json"},
  body:JSON.stringify({expiresIn:60*60*24*7}),
  cache:"no-store"
 });
 const data=await sign.json().catch(()=>({}));
 if(!sign.ok)throw new Error("MODAL_STUDIO_SIGN_"+sign.status);
 const raw=String(data?.signedURL||data?.signedUrl||"");
 return raw.startsWith("http")?raw:`${base}/storage/v1${raw}`;
}

export async function renderModalStudioVideo(input:{imageUrl:string;prompt:string}){
 const modal=client();
 try{
  const fn=await modal.functions.fromName(APP_NAME,FUNCTION_NAME);
  const call=await fn.spawn([],{image_url:input.imageUrl,prompt:input.prompt,width:480,height:832,num_frames:49});
  let result:any;
  try{
   result=await call.get({timeoutMs:285000});
  }catch(e){
   if(e instanceof TimeoutError||e instanceof FunctionTimeoutError)throw new Error("MODAL_STUDIO_TIMEOUT");
   throw e;
  }
  if(!result?.ok||!result?.video_base64)throw new Error(String(result?.error||"MODAL_STUDIO_OUTPUT_MISSING"));
  const url=await storeVideo(String(result.video_base64),String(result.content_type||"video/mp4"));
  return{
   url,
   thumbnail:input.imageUrl,
   model:String(result.model||"Wan-AI/Wan2.2-TI2V-5B-Diffusers"),
   requestId:call.functionCallId,
   provider:"modal-wan22" as const,
   prompt:input.prompt,
   routingTier:"standard-modal",
   routingReason:"Wan 2.2 image-to-video on Modal"
  };
 }finally{
  modal.close();
 }
}
