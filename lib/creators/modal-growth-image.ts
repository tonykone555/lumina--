import {FunctionTimeoutError,ModalClient,TimeoutError} from "modal";

const APP_NAME=String(process.env.MODAL_IMAGE_APP_NAME||"ynot-image-worker");
const FUNCTION_NAME=String(process.env.MODAL_IMAGE_FUNCTION_NAME||"generate_ad_variants");

function client(){
 const tokenId=String(process.env.MODAL_TOKEN_ID||"");
 const tokenSecret=String(process.env.MODAL_TOKEN_SECRET||"");
 if(!tokenId||!tokenSecret)throw new Error("MODAL_NOT_CONFIGURED");
 return new ModalClient({tokenId,tokenSecret});
}

function db(){
 const base=String(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||"").replace(/\/$/,"");
 const key=String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"");
 if(!base||!key)throw new Error("IMAGE_STORE_NOT_CONFIGURED");
 return{base,key};
}

async function storeImage(data:string,contentType="image/png"){
 const {base,key}=db();
 const bytes=Buffer.from(data,"base64");
 if(!bytes.length||bytes.byteLength>24*1024*1024)throw new Error("MODAL_IMAGE_SIZE_INVALID");
 const ext=contentType.includes("png")?"png":"jpg";
 const path=`generated/growth/${Date.now()}-${crypto.randomUUID()}.${ext}`;
 const h:Record<string,string>={apikey:key,"Content-Type":contentType,"x-upsert":"false"};
 if(!key.startsWith("sb_"))h.Authorization=`Bearer ${key}`;
 const up=await fetch(`${base}/storage/v1/object/creator-studio/${path.split("/").map(encodeURIComponent).join("/")}`,{method:"POST",headers:h,body:bytes,cache:"no-store"});
 if(!up.ok)throw new Error("MODAL_IMAGE_STORE_"+up.status+":"+(await up.text()).slice(0,160));
 const sh:Record<string,string>={apikey:key,"Content-Type":"application/json"};if(!key.startsWith("sb_"))sh.Authorization=`Bearer ${key}`;
 const sign=await fetch(`${base}/storage/v1/object/sign/creator-studio/${path.split("/").map(encodeURIComponent).join("/")}`,{method:"POST",headers:sh,body:JSON.stringify({expiresIn:60*60*24*30}),cache:"no-store"});
 const j=await sign.json().catch(()=>({}));if(!sign.ok)throw new Error("MODAL_IMAGE_SIGN_"+sign.status);
 const raw=String(j?.signedURL||j?.signedUrl||"");
 return raw.startsWith("http")?raw:`${base}/storage/v1${raw}`;
}

export function modalGrowthImageConfigured(){return Boolean(String(process.env.MODAL_TOKEN_ID||"").trim()&&String(process.env.MODAL_TOKEN_SECRET||"").trim())}

export async function generateModalAdVariants(input:{productImageUrl:string;directions:any[];variantsPerDirection?:number}){
 const modal=client();
 try{
  const fn=await modal.functions.fromName(APP_NAME,FUNCTION_NAME);
  const call=await fn.spawn([],{product_image_url:input.productImageUrl,directions:input.directions.slice(0,5),variants_per_direction:Math.max(1,Math.min(4,input.variantsPerDirection||4)),width:1024,height:1280});
  let result:any;
  try{result=await call.get({timeoutMs:14*60*1000})}catch(e){if(e instanceof TimeoutError||e instanceof FunctionTimeoutError)throw new Error("MODAL_IMAGE_TIMEOUT");throw e}
  if(!result?.ok||!Array.isArray(result?.variants))throw new Error(String(result?.error||"MODAL_IMAGE_OUTPUT_MISSING"));
  const variants=[] as any[];
  for(const v of result.variants.slice(0,20)){
   if(!v?.image_base64)continue;
   const url=await storeImage(String(v.image_base64),String(v.content_type||"image/png"));
   variants.push({directionId:String(v.direction_id||""),variantIndex:Number(v.variant_index||0),seed:Number(v.seed||0),url,prompt:String(v.prompt||""),contentType:String(v.content_type||"image/png")});
  }
  return{provider:"modal-flux2-klein-reference" as const,model:String(result.model||"black-forest-labs/FLUX.2-klein-4B"),gpu:String(result.gpu||"A10G"),generationSeconds:Number(result.generation_seconds||0),requestId:call.functionCallId,variants};
 }finally{modal.close()}
}
