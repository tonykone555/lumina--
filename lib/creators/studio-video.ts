import {buildStudioPrompt} from "./studio-prompts";
import {renderStudioVideo as renderHiggsfieldVideo} from "./higgsfield";
import {renderViggleMotion} from "./viggle";
import {renderMuapiStudioVideo} from "./muapi";
import {modalStudioConfigured,renderModalStudioVideo} from "./modal-studio";

export type StudioVideoTier="standard"|"premium";

export async function renderStudioVideo(input:{
 mode:string;
 qualityTier?:StudioVideoTier;
 standardProvider?:"modal"|"muapi";
 productTitle:string;
 productDescription?:string;
 productCategory?:string;
 productBrand?:string;
 productImageUrl:string;
 baseImageUrl?:string;
 sourceVideoUrl?:string;
 avatarImageUrl?:string;
 backgroundImageUrl?:string;
 angle:string;
}){
 const tier=input.qualityTier||"standard";
 const prompt=buildStudioPrompt({
  product:{title:input.productTitle,description:input.productDescription,category:input.productCategory,brand:input.productBrand},
  angle:input.angle,
  mode:input.mode,
  hasBackground:Boolean(input.backgroundImageUrl)
 });

 // Premium remains Higgsfield. Replace-me is also always Higgsfield because
 // it needs specialist identity + motion transfer rather than plain I2V.
 if(tier==="premium"||input.mode==="video-avatar"){
  const result=await renderHiggsfieldVideo({...input,qualityTier:"premium"});
  return{...result,provider:"higgsfield" as const};
 }

 const baseImageUrl=input.baseImageUrl||input.avatarImageUrl||input.productImageUrl;
 // Explicit MuAPI selection bypasses Modal entirely for Standard video.
 if(tier==="standard"&&input.standardProvider==="muapi"){
  const result=await renderMuapiStudioVideo({mode:input.mode,prompt,baseImageUrl,sourceVideoUrl:input.sourceVideoUrl});
  return{...result,provider:"muapi" as const,routingTier:"standard-muapi",routingReason:"Creator selected MuAPI"};
 }
 const modalModes=new Set(["product-only","image-self","ai-avatar"]);

 // New normal route: Nano Banana/Flow prepares the frame, Wan 2.2 on Modal
 // turns it into video. MuAPI remains available as the standard fallback.
 if(modalModes.has(input.mode)&&modalStudioConfigured()){
  try{
   return await renderModalStudioVideo({imageUrl:baseImageUrl,prompt});
  }catch(modalError){
   try{
    const fallback=await renderMuapiStudioVideo({mode:input.mode,prompt,baseImageUrl,sourceVideoUrl:input.sourceVideoUrl});
    return{
     ...fallback,
     routingTier:"standard-muapi-fallback",
     routingReason:"Modal Wan 2.2 failed; MuAPI fallback used: "+(modalError instanceof Error?modalError.message:"unknown")
    };
   }catch(muapiError){
    const m=modalError instanceof Error?modalError.message:"MODAL_STUDIO_FAILED";
    const u=muapiError instanceof Error?muapiError.message:"MUAPI_FAILED";
    throw new Error("STANDARD_VIDEO_FAILED | Modal: "+m+" | MuAPI: "+u);
   }
  }
 }

 try{
  return await renderMuapiStudioVideo({
   mode:input.mode,
   prompt,
   baseImageUrl,
   sourceVideoUrl:input.sourceVideoUrl
  });
 }catch(muapiError){
  if(input.mode==="video-self"&&input.sourceVideoUrl&&String(process.env.VIGGLE_API_KEY||"").trim()){
   try{
    const fallback=await renderViggleMotion({characterImageUrl:baseImageUrl,motionVideoUrl:input.sourceVideoUrl});
    return{
     ...fallback,
     prompt,
     routingTier:"standard-motion-fallback",
     routingReason:"MuAPI failed; Viggle JST-2 fallback used: "+(muapiError instanceof Error?muapiError.message:"unknown")
    };
   }catch(viggleError){
    const m=muapiError instanceof Error?muapiError.message:"MUAPI_FAILED";
    const v=viggleError instanceof Error?viggleError.message:"VIGGLE_FAILED";
    throw new Error("STANDARD_VIDEO_FAILED | MuAPI: "+m+" | Viggle: "+v);
   }
  }
  throw muapiError;
 }
}
