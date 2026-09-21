import {renderStudioVideo as renderHiggsfieldVideo} from "./higgsfield";
import {renderViggleMotion} from "./viggle";

export type StudioVideoTier="standard"|"premium";

export async function renderStudioVideo(input:{
 mode:string;
 qualityTier?:StudioVideoTier;
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

 if(tier==="standard"&&(input.mode==="video-avatar"||input.mode==="video-self")){
  if(!input.sourceVideoUrl)throw new Error("SOURCE_VIDEO_REQUIRED");
  const characterImageUrl=input.baseImageUrl||input.avatarImageUrl||input.productImageUrl;
  try{
   return await renderViggleMotion({
    characterImageUrl,
    motionVideoUrl:input.sourceVideoUrl
   });
  }catch(viggleError){
   try{
    const fallback=await renderHiggsfieldVideo({...input,qualityTier:"standard"});
    return{
     ...fallback,
     provider:"higgsfield" as const,
     routingTier:"standard-motion-fallback",
     routingReason:"Viggle failed; Genjutsu fallback used: "+(viggleError instanceof Error?viggleError.message:"unknown")
    };
   }catch(higgsfieldError){
    const v=viggleError instanceof Error?viggleError.message:"VIGGLE_FAILED";
    const h=higgsfieldError instanceof Error?higgsfieldError.message:"HIGGSFIELD_FAILED";
    throw new Error("STANDARD_MOTION_FAILED | Viggle: "+v+" | Higgsfield: "+h);
   }
  }
 }

 const result=await renderHiggsfieldVideo(input);
 return{...result,provider:"higgsfield" as const};
}
