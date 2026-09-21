import {buildStudioPrompt,type StudioProductInput} from "./studio-prompts";

export type StudioQualityTier="standard"|"premium";

const MODELS={
 standard:"gemini-3.1-flash-image",
 premium:"gemini-3-pro-image"
} as const;

function apiKey(){
 const value=String(process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||"").trim();
 if(!value)throw new Error("GEMINI_IMAGE_NOT_CONFIGURED");
 return value;
}

async function imagePart(url:string){
 const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error("REFERENCE_IMAGE_FETCH_"+response.status);
 const mime=(response.headers.get("content-type")||"image/jpeg").split(";")[0];
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length>12*1024*1024)throw new Error("REFERENCE_IMAGE_TOO_LARGE");
 return{inlineData:{mimeType:mime,data:bytes.toString("base64")}};
}

function baseImagePrompt(input:{
 product:StudioProductInput;
 mode:string;
 angle:string;
 hasAvatar:boolean;
 hasBackground:boolean;
}){
 const videoDirection=buildStudioPrompt({product:input.product,mode:input.mode,angle:input.angle,hasBackground:input.hasBackground});
 const identity=input.hasAvatar
  ?"Use the supplied creator/avatar reference as the exact visible identity. Preserve face, hair, body proportions, skin tone and defining visual features."
  :"If a person appears, keep them generic and secondary to the exact product.";
 const background=input.hasBackground
  ?"Use the supplied background reference as the environment and composition guide."
  :"Create the most believable environment for real use of this product.";
 return [
  "Create ONE photorealistic vertical 9:16 hero keyframe that will be used as the starting frame for an AI video.",
  "This is a composition step, not a poster: no added text, captions, badges, borders, UI, watermarks or invented logos.",
  identity,
  background,
  "The supplied product image is authoritative. Preserve its exact design, branding, color, proportions, materials and recognizable details.",
  "Compose the creator, product and environment into one physically believable frame with realistic contact, shadows, scale, perspective, hands and body interaction.",
  "Make the frame look like authentic premium UGC captured on a modern phone rather than a glossy catalogue render.",
  videoDirection
 ].join(" ");
}

export async function composeStudioBaseImage(input:{
 qualityTier:StudioQualityTier;
 product:StudioProductInput;
 productImageUrl:string;
 avatarImageUrl?:string;
 backgroundImageUrl?:string;
 mode:string;
 angle:string;
}){
 const model=MODELS[input.qualityTier];
 const prompt=baseImagePrompt({
  product:input.product,
  mode:input.mode,
  angle:input.angle,
  hasAvatar:Boolean(input.avatarImageUrl),
  hasBackground:Boolean(input.backgroundImageUrl)
 });
 const parts:any[]=[{text:prompt}];
 if(input.avatarImageUrl)parts.push(await imagePart(input.avatarImageUrl));
 parts.push(await imagePart(input.productImageUrl));
 if(input.backgroundImageUrl)parts.push(await imagePart(input.backgroundImageUrl));
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey())}`,{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({
   contents:[{role:"user",parts}],
   generationConfig:{
    responseModalities:["TEXT","IMAGE"],
    imageConfig:{aspectRatio:"9:16",imageSize:"2K"}
   }
  }),
  cache:"no-store",
  signal:AbortSignal.timeout(120000)
 });
 const json=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error("GEMINI_IMAGE_FAILED_"+response.status+": "+String(json?.error?.message||"unknown").slice(0,300));
 const out=(json?.candidates?.[0]?.content?.parts||[]).find((part:any)=>part?.inlineData?.data);
 if(!out?.inlineData?.data)throw new Error("GEMINI_IMAGE_NO_RESULT");
 return{
  model,
  tier:input.qualityTier,
  prompt,
  mimeType:String(out.inlineData.mimeType||"image/png"),
  data:String(out.inlineData.data)
 };
}
