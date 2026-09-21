import {NextRequest,NextResponse} from "next/server";
import {authenticatedUser,ensureCreator,rest} from "@/lib/creators/earn";
import {renderStudioVideo} from "@/lib/creators/higgsfield";
export const runtime="nodejs";export const maxDuration=300;
const sb=()=>String(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||"").replace(/\/$/,"");
const key=()=>String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"");
async function signed(path:string){if(!path)return"";const k=key(),r=await fetch(`${sb()}/storage/v1/object/sign/creator-studio/${path}`,{method:"POST",headers:{apikey:k,...(k.startsWith("sb_")?{}:{Authorization:`Bearer ${k}`}),"Content-Type":"application/json"},body:JSON.stringify({expiresIn:3600}),cache:"no-store"}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.message||"SOURCE_SIGN_FAILED");const raw=String(d?.signedURL||d?.signedUrl||"");return raw.startsWith("http")?raw:`${sb()}/storage/v1${raw}`}
export async function POST(req:NextRequest){
 try{
  const u=await authenticatedUser(req),c=await ensureCreator(u),b=await req.json().catch(()=>({})),product=b.product||{};
  const productId=String(product.product_id||product.id||"").slice(0,500),title=String(product.title||"").slice(0,240),image=String(product.image_url||product.image||"").slice(0,1600),mode=String(b.mode||"video-avatar"),angle=String(b.angle||"testimonial");
  if(!productId||!title||!image)throw new Error("PRODUCT_REQUIRED");
  const sourcePath=String(b.source_path||"").slice(0,1200),avatarPath=String(b.avatar_path||"").slice(0,1200),sourceVideoUrl=sourcePath?await signed(sourcePath):String(b.source_video_url||""),avatarImageUrl=avatarPath?await signed(avatarPath):String(b.avatar_image_url||"");
  const draft=(await rest("ynot_creator_studio_jobs",{method:"POST",body:JSON.stringify([{creator_id:c.id,product_id:productId,product_title:title,product_image_url:image,source_path:sourcePath||null,source_video_url:sourceVideoUrl||null,avatar_image_url:avatarImageUrl||null,mode,angle,status:"generating"}])}))?.[0];
  try{
    const result=await renderStudioVideo({mode,productTitle:title,productImageUrl:image,sourceVideoUrl:sourceVideoUrl||undefined,avatarImageUrl:avatarImageUrl||undefined,angle});
    const rows=await rest(`ynot_creator_studio_jobs?id=eq.${draft.id}`,{method:"PATCH",body:JSON.stringify({status:"completed",provider_model:result.model,provider_request_id:result.requestId||null,prompt:result.prompt,result_url:result.url,thumbnail_url:result.thumbnail,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
    return NextResponse.json({ok:true,job:rows?.[0]||{...draft,...result,status:"completed"}});
  }catch(error){await rest(`ynot_creator_studio_jobs?id=eq.${draft.id}`,{method:"PATCH",body:JSON.stringify({status:"failed",error:error instanceof Error?error.message:"HIGGSFIELD_FAILED",updated_at:new Date().toISOString()})}).catch(()=>{});throw error}
 }catch(e){const m=e instanceof Error?e.message:"STUDIO_GENERATION_FAILED";return NextResponse.json({error:m},{status:/SIGN_IN|SESSION/.test(m)?401:/NOT_CONFIGURED/.test(m)?503:400})}
}
