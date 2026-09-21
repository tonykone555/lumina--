import {NextRequest,NextResponse} from "next/server";
import crypto from "node:crypto";
import {authenticatedUser,ensureCreator} from "@/lib/creators/earn";
export const runtime="nodejs";
const base=()=>String(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||"").replace(/\/$/,"");
const service=()=>String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"");
export async function POST(req:NextRequest){
 try{
  const u=await authenticatedUser(req),c=await ensureCreator(u),b=await req.json().catch(()=>({})),kind=String(b.kind||"video"),ext=String(b.extension||"mp4").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,8)||"mp4";
  if(!["video","avatar","flow"].includes(kind))throw new Error("INVALID_UPLOAD_KIND");
  const path=`${c.id}/${kind}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`,k=service();if(!base()||!k)throw new Error("STORAGE_NOT_CONFIGURED");
  const r=await fetch(`${base()}/storage/v1/object/upload/sign/creator-studio/${path}`,{method:"POST",headers:{apikey:k,...(k.startsWith("sb_")?{}:{Authorization:`Bearer ${k}`}),"Content-Type":"application/json"},body:"{}",cache:"no-store"}),d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d?.message||"SIGNED_UPLOAD_FAILED");
  const raw=String(d?.url||d?.signedURL||""),signedUrl=raw.startsWith("http")?raw:`${base()}/storage/v1${raw.startsWith("/")?raw:"/"+raw}`;
  const token=new URL(signedUrl).searchParams.get("token");if(!token)throw new Error("SIGNED_UPLOAD_TOKEN_MISSING");
  return NextResponse.json({path,token,signed_url:signedUrl});
 }catch(e){const m=e instanceof Error?e.message:"UPLOAD_PREP_FAILED";return NextResponse.json({error:m},{status:/SIGN_IN|SESSION/.test(m)?401:400})}
}
