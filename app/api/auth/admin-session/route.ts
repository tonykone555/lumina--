import {NextRequest,NextResponse} from "next/server";

const supabaseBase=()=>String(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||"").replace(/\/$/,"");
const publishableKey=()=>String(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"");

export const runtime="nodejs";

export async function POST(req:NextRequest){
 const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
 if(!token)return NextResponse.json({error:"SIGN_IN_REQUIRED"},{status:401});
 const response=await fetch(`${supabaseBase()}/auth/v1/user`,{headers:{apikey:publishableKey(),Authorization:`Bearer ${token}`},cache:"no-store"});
 const user=await response.json().catch(()=>({}));
 if(!response.ok||!user?.id)return NextResponse.json({error:"INVALID_SESSION"},{status:401});
 const out=NextResponse.json({ok:true});
 out.cookies.set("ynot-admin-session",token,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:60*60});
 return out;
}

export async function DELETE(){
 const out=NextResponse.json({ok:true});
 out.cookies.set("ynot-admin-session","",{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:0});
 return out;
}
