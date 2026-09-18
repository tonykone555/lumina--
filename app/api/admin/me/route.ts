import {NextRequest,NextResponse} from "next/server";

export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
  const auth=req.headers.get("authorization")||"";
  const token=auth.toLowerCase().startsWith("bearer ")?auth.slice(7).trim():"";
  const url=String(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||"").replace(/\/$/,"");
  const anon=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.SUPABASE_ANON_KEY;
  const service=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!token||!url||!anon||!service)return NextResponse.json({admin:false},{status:200});
  const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anon,Authorization:`Bearer ${token}`},cache:"no-store"});
  if(!ur.ok)return NextResponse.json({admin:false},{status:200});
  const user=await ur.json();
  if(!user?.id)return NextResponse.json({admin:false},{status:200});
  const ar=await fetch(`${url}/rest/v1/ynot_admin_access_requests?auth_user_id=eq.${encodeURIComponent(user.id)}&status=eq.approved&select=id&limit=1`,{headers:{apikey:service,Authorization:`Bearer ${service}`},cache:"no-store"});
  if(!ar.ok)return NextResponse.json({admin:false},{status:200});
  const rows=await ar.json();
  return NextResponse.json({admin:Array.isArray(rows)&&rows.length>0},{headers:{"Cache-Control":"no-store"}});
}
