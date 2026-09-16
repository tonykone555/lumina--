import {NextRequest,NextResponse} from "next/server";
import crypto from "node:crypto";

export const runtime="nodejs";
const base=()=>String(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||"").replace(/\/$/,"");
const service=()=>String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"");
const serviceHeaders=()=>{const k=service();return{apikey:k,...(k.startsWith("sb_")?{}:{Authorization:`Bearer ${k}`}),"Content-Type":"application/json"}};
function code(){return crypto.randomBytes(4).toString("hex").toUpperCase()}
function cleanEmail(value:unknown){return String(value||"").trim().toLowerCase()}

export async function POST(req:NextRequest){
 try{
  if(!base()||!service())return NextResponse.json({error:"AUTH_NOT_CONFIGURED"},{status:503});
  const body=await req.json().catch(()=>({})),email=cleanEmail(body.email),password=String(body.password||""),name=String(body.name||"").trim().slice(0,30),avatar=String(body.avatar||"");
  if(!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:"ENTER_A_VALID_EMAIL"},{status:400});
  if(password.length<8)return NextResponse.json({error:"PASSWORD_MUST_BE_AT_LEAST_8_CHARACTERS"},{status:400});
  if(name.length<2)return NextResponse.json({error:"ENTER_YOUR_NAME"},{status:400});
  if(avatar.length>500000)return NextResponse.json({error:"PROFILE_PICTURE_TOO_LARGE"},{status:400});

  const authResponse=await fetch(`${base()}/auth/v1/admin/users`,{method:"POST",headers:serviceHeaders(),body:JSON.stringify({email,password,email_confirm:true,user_metadata:{name,full_name:name}}),cache:"no-store"});
  const authUser=await authResponse.json().catch(()=>({}));
  if(!authResponse.ok){
   const message=String(authUser?.msg||authUser?.message||authUser?.error_description||"");
   const exists=/already|registered|exists/i.test(message);
   return NextResponse.json({error:exists?"ACCOUNT_ALREADY_EXISTS":message||"ACCOUNT_CREATION_FAILED"},{status:exists?409:400});
  }
  const userId=String(authUser.id||authUser.user?.id||"");
  if(!userId)throw new Error("ACCOUNT_CREATION_FAILED");

  const now=new Date().toISOString(),record={id:userId,auth_user_id:userId,email,display_name:name,avatar_data:avatar||null,auth_provider:"email",email_verified_at:now,referral_code:code(),last_seen_at:now};
  const db=await fetch(`${base()}/rest/v1/ynot_users`,{method:"POST",headers:{...serviceHeaders(),Prefer:"return=minimal"},body:JSON.stringify(record),cache:"no-store"});
  if(!db.ok){
   const text=await db.text();
   await fetch(`${base()}/auth/v1/admin/users/${encodeURIComponent(userId)}`,{method:"DELETE",headers:serviceHeaders(),cache:"no-store"}).catch(()=>{});
   throw new Error(text||"PROFILE_CREATION_FAILED");
  }
  return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"ACCOUNT_CREATION_FAILED"},{status:500})}
}
