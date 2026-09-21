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
export async function renderStudioVideo(input:{mode:string;productTitle:string;productDescription?:string;productCategory?:string;productBrand?:string;productImageUrl:string;sourceVideoUrl?:string;avatarImageUrl?:string;backgroundImageUrl?:string;angle:string}){
 const c=client(),prompt=buildStudioPrompt({product:{title:input.productTitle,description:input.productDescription,category:input.productCategory,brand:input.productBrand},angle:input.angle,mode:input.mode,hasBackground:Boolean(input.backgroundImageUrl)});
 if(input.mode==="video-avatar"){
   if(!input.sourceVideoUrl||!input.avatarImageUrl)throw new Error("SOURCE_VIDEO_AND_AVATAR_REQUIRED");
   const job=await c.subscribe("higgsfiled/genjutsu/motion-transfer/v1.0",{input:{prompt,video_url:input.sourceVideoUrl,image_urls:[input.avatarImageUrl,input.productImageUrl,input.backgroundImageUrl].filter(Boolean),resolution:"720p"},withPolling:true});
   return normalize(job,"higgsfiled/genjutsu/motion-transfer/v1.0",prompt);
 }
 if(input.mode==="video-self"){
   if(!input.sourceVideoUrl)throw new Error("SOURCE_VIDEO_REQUIRED");
   const refs=[input.productImageUrl,input.backgroundImageUrl].filter(Boolean);
   const job=await c.subscribe("higgsfiled/genjutsu/motion-transfer/v1.0",{input:{prompt,video_url:input.sourceVideoUrl,image_urls:refs,resolution:"720p"},withPolling:true});
   return normalize(job,"higgsfiled/genjutsu/motion-transfer/v1.0",prompt);
 }
 if(input.mode==="image-self"||input.mode==="ai-avatar"){
   if(!input.avatarImageUrl)throw new Error("AVATAR_IMAGE_REQUIRED");
   const job=await c.subscribe("alibaba/happy-horse/reference-to-video",{input:{prompt,duration:5,image_urls:[input.avatarImageUrl,input.productImageUrl,input.backgroundImageUrl].filter(Boolean),resolution:"720p"},withPolling:true});
   return normalize(job,"alibaba/happy-horse/reference-to-video",prompt);
 }
 const job=await c.subscribe("alibaba/happy-horse/reference-to-video",{input:{prompt,duration:5,image_urls:[input.productImageUrl,input.backgroundImageUrl].filter(Boolean),resolution:"720p"},withPolling:true});
 return normalize(job,"alibaba/happy-horse/reference-to-video",prompt);
}
function normalize(job:any,model:string,prompt:string){
 const first=job?.jobs?.[0],url=first?.results?.raw?.url||first?.results?.min?.url||null;
 if(!url)throw new Error(first?.error||"HIGGSFIELD_GENERATION_NO_RESULT");
 return {requestId:String(job?.id||first?.id||""),url,thumbnail:first?.results?.min?.url||url,model,prompt,status:first?.status||"completed"};
}
