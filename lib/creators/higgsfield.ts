import {createHiggsfieldClient} from "@higgsfield/client/v2";
import {buildStudioPrompt} from "./studio-prompts";

function credentials(){
 const joined=String(process.env.HF_CREDENTIALS||"").trim();
 if(joined)return joined;
 const id=String(process.env.HF_API_KEY||"").trim(),secret=String(process.env.HF_API_SECRET||"").trim();
 if(id&&secret)return `${id}:${secret}`;
 throw new Error("HIGGSFIELD_NOT_CONFIGURED");
}
function client(){return createHiggsfieldClient({credentials:credentials(),timeout:120000,maxRetries:3,retryBackoff:1500,retryMaxBackoff:20000,pollInterval:2000,maxPollTime:300000})}

const MODELS={
 motion:"higgsfiled/genjutsu/motion-transfer/v1.0",
 reference:"alibaba/happy-horse/reference-to-video",
 productVideo:"kling-video/v3.0/std/image-to-video"
} as const;

export function studioModelRoute(mode:string,qualityTier:"standard"|"premium"="standard"){
 if(mode==="video-avatar"||mode==="video-self")return{model:MODELS.motion,tier:qualityTier==="premium"?"premium-motion":"standard-motion",reason:qualityTier==="premium"?"premium source-video motion transfer":"standard source-video route; Genjutsu remains the current fallback until economy motion provider credentials are configured"};
 if(mode==="product-only"&&qualityTier==="standard")return{model:MODELS.productVideo,tier:"standard-economy-video",reason:"Nano Banana 2 keyframe can use lower-cost Kling image-to-video"};
 if(mode==="product-only")return{model:MODELS.reference,tier:"premium-reference-video",reason:"Nano Banana Pro keyframe uses higher-fidelity reference-to-video"};
 return{model:MODELS.reference,tier:qualityTier==="premium"?"premium-reference-video":"standard-reference-video",reason:qualityTier==="premium"?"premium composed keyframe with reference-video fidelity":"standard composed keyframe with reference-video fidelity"};
}
export async function renderStudioVideo(input:{mode:string;qualityTier?:"standard"|"premium";productTitle:string;productDescription?:string;productCategory?:string;productBrand?:string;productImageUrl:string;baseImageUrl?:string;sourceVideoUrl?:string;avatarImageUrl?:string;backgroundImageUrl?:string;angle:string}){
 const c=client(),prompt=buildStudioPrompt({product:{title:input.productTitle,description:input.productDescription,category:input.productCategory,brand:input.productBrand},angle:input.angle,mode:input.mode,hasBackground:Boolean(input.backgroundImageUrl)}),route=studioModelRoute(input.mode,input.qualityTier||"standard"),base=input.baseImageUrl||input.productImageUrl;
 if(input.mode==="video-avatar"){
   if(!input.sourceVideoUrl||!input.avatarImageUrl)throw new Error("SOURCE_VIDEO_AND_AVATAR_REQUIRED");
   const job=await c.subscribe(MODELS.motion,{input:{prompt,video_url:input.sourceVideoUrl,image_urls:[base,input.avatarImageUrl,input.productImageUrl].filter(Boolean),resolution:"720p"},withPolling:true});
   return normalize(job,MODELS.motion,prompt,route);
 }
 if(input.mode==="video-self"){
   if(!input.sourceVideoUrl)throw new Error("SOURCE_VIDEO_REQUIRED");
   const refs=[base,input.productImageUrl].filter(Boolean);
   const job=await c.subscribe(MODELS.motion,{input:{prompt,video_url:input.sourceVideoUrl,image_urls:refs,resolution:"720p"},withPolling:true});
   return normalize(job,MODELS.motion,prompt,route);
 }
 if(input.mode==="image-self"||input.mode==="ai-avatar"){
   if(!input.avatarImageUrl)throw new Error("AVATAR_IMAGE_REQUIRED");
   const job=await c.subscribe(MODELS.reference,{input:{prompt,duration:5,image_urls:[base,input.avatarImageUrl,input.productImageUrl].filter(Boolean),resolution:"720p"},withPolling:true});
   return normalize(job,MODELS.reference,prompt,route);
 }
 if((input.qualityTier||"standard")==="premium"){
   const job=await c.subscribe(MODELS.reference,{input:{prompt,duration:5,image_urls:[base],resolution:"720p"},withPolling:true});
   return normalize(job,MODELS.reference,prompt,route);
 }
 const job=await c.subscribe(MODELS.productVideo,{input:{prompt,duration:5,image_url:base,sound:"off",multi_shots:false,cfg_scale:0.5},withPolling:true});
 return normalize(job,MODELS.productVideo,prompt,route);
}
function normalize(job:any,model:string,prompt:string,route:{model:string;tier:string;reason:string}){
 const first=job?.jobs?.[0],url=first?.results?.raw?.url||first?.results?.min?.url||null;
 if(!url)throw new Error(first?.error||"HIGGSFIELD_GENERATION_NO_RESULT");
 return {requestId:String(job?.id||first?.id||""),url,thumbnail:first?.results?.min?.url||url,model,prompt,status:first?.status||"completed",routingTier:route.tier,routingReason:route.reason};
}
