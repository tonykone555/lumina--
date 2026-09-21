import {NextRequest,NextResponse} from "next/server";
import {authenticatedUser,ensureCreator,rest} from "@/lib/creators/earn";
import {renderStudioVideo} from "@/lib/creators/higgsfield";
import {composeStudioBaseImage,type StudioQualityTier} from "@/lib/creators/studio-image";
export const runtime="nodejs";export const maxDuration=300;
const sb=()=>String(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||"").replace(/\/$/,"");
const key=()=>String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"");
async function signed(path:string){if(!path)return"";const k=key(),r=await fetch(`${sb()}/storage/v1/object/sign/creator-studio/${path}`,{method:"POST",headers:{apikey:k,...(k.startsWith("sb_")?{}:{Authorization:`Bearer ${k}`}),"Content-Type":"application/json"},body:JSON.stringify({expiresIn:3600}),cache:"no-store"}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.message||"SOURCE_SIGN_FAILED");const raw=String(d?.signedURL||d?.signedUrl||"");return raw.startsWith("http")?raw:`${sb()}/storage/v1${raw}`}
async function storeGeneratedImage(path:string,mimeType:string,data:string){
 const k=key(),bytes=Buffer.from(data,"base64");
 const r=await fetch(`${sb()}/storage/v1/object/creator-studio/${path}`,{method:"POST",headers:{apikey:k,...(k.startsWith("sb_")?{}:{Authorization:`Bearer ${k}`}),"Content-Type":mimeType,"x-upsert":"true"},body:bytes,cache:"no-store"});
 if(!r.ok){const d=await r.text();throw new Error("BASE_IMAGE_STORE_FAILED_"+r.status+": "+d.slice(0,180))}
 return signed(path);
}
export async function POST(req:NextRequest){
 try{
  const u=await authenticatedUser(req),c=await ensureCreator(u),b=await req.json().catch(()=>({})),product=b.product||{};
  const productId=String(product.product_id||product.id||"").slice(0,500),title=String(product.title||"").slice(0,240),image=String(product.image_url||product.image||"").slice(0,1600),description=String(product.description||"").slice(0,2400),category=String(product.category||"").slice(0,240),brand=String(product.brand||"").slice(0,240),mode=String(b.mode||"video-avatar"),angle=String(b.angle||"testimonial"),qualityTier=(String(b.quality_tier||"standard")==="premium"?"premium":"standard") as StudioQualityTier,imageSource=["ynot_standard","ynot_premium","google_flow"].includes(String(b.image_source))?String(b.image_source):"ynot_standard",flowImagePath=String(b.flow_image_path||"").slice(0,1200);
  if(!productId||!title||!image)throw new Error("PRODUCT_REQUIRED");
  const sourcePath=String(b.source_path||"").slice(0,1200),avatarPath=String(b.avatar_path||"").slice(0,1200),sourceVideoUrl=sourcePath?await signed(sourcePath):String(b.source_video_url||"").slice(0,1600),avatarImageUrl=avatarPath?await signed(avatarPath):String(b.avatar_image_url||"").slice(0,1600),backgroundImageUrl=String(b.background_image_url||"").slice(0,1600);
  let baseImageUrl="",basePath="",baseImageModel="",baseImagePrompt="";
  if(imageSource==="google_flow"){
    if(!flowImagePath)throw new Error("FLOW_IMAGE_REQUIRED");
    basePath=flowImagePath;
    baseImageUrl=await signed(flowImagePath);
    baseImageModel="google-flow-user";
    baseImagePrompt=String(b.flow_prompt||"").slice(0,12000);
  }else{
    const imageTier:StudioQualityTier=imageSource==="ynot_premium"?"premium":"standard";
    const baseImage=await composeStudioBaseImage({qualityTier:imageTier,product:{title,description:description||undefined,category:category||undefined,brand:brand||undefined},productImageUrl:image,avatarImageUrl:avatarImageUrl||undefined,backgroundImageUrl:backgroundImageUrl||undefined,mode,angle});
    const ext=baseImage.mimeType.includes("jpeg")?"jpg":baseImage.mimeType.includes("webp")?"webp":"png";
    basePath=`generated/${c.id}/${Date.now()}-${imageTier}-base.${ext}`;
    baseImageUrl=await storeGeneratedImage(basePath,baseImage.mimeType,baseImage.data);
    baseImageModel=baseImage.model;
    baseImagePrompt=baseImage.prompt;
  }
  const draft=(await rest("ynot_creator_studio_jobs",{method:"POST",body:JSON.stringify([{creator_id:c.id,product_id:productId,product_title:title,product_image_url:image,source_path:sourcePath||null,source_video_url:sourceVideoUrl||null,avatar_image_url:avatarImageUrl||null,mode,angle,status:"generating",metadata:{quality_tier:qualityTier,image_source:imageSource,base_image_path:basePath,base_image_model:baseImageModel,base_image_prompt:baseImagePrompt,background_image_url:backgroundImageUrl||null,avatar_source:avatarPath?"upload":avatarImageUrl?"remote":"none"}}])}))?.[0];
  try{
    const result=await renderStudioVideo({mode,qualityTier,productTitle:title,productDescription:description||undefined,productCategory:category||undefined,productBrand:brand||undefined,productImageUrl:image,baseImageUrl,sourceVideoUrl:sourceVideoUrl||undefined,avatarImageUrl:avatarImageUrl||undefined,backgroundImageUrl:backgroundImageUrl||undefined,angle});
    const rows=await rest(`ynot_creator_studio_jobs?id=eq.${draft.id}`,{method:"PATCH",body:JSON.stringify({status:"completed",provider_model:result.model,provider_request_id:result.requestId||null,prompt:result.prompt,result_url:result.url,thumbnail_url:result.thumbnail,metadata:{quality_tier:qualityTier,image_source:imageSource,base_image_path:basePath,base_image_model:baseImageModel,routing_tier:result.routingTier,routing_reason:result.routingReason},completed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
    return NextResponse.json({ok:true,job:rows?.[0]||{...draft,...result,status:"completed"}});
  }catch(error){await rest(`ynot_creator_studio_jobs?id=eq.${draft.id}`,{method:"PATCH",body:JSON.stringify({status:"failed",error:error instanceof Error?error.message:"HIGGSFIELD_FAILED",updated_at:new Date().toISOString()})}).catch(()=>{});throw error}
 }catch(e){const m=e instanceof Error?e.message:"STUDIO_GENERATION_FAILED";return NextResponse.json({error:m},{status:/SIGN_IN|SESSION/.test(m)?401:/NOT_CONFIGURED/.test(m)?503:400})}
}
