import { NextRequest, NextResponse } from "next/server";

const ADMIN_PATH = "/admin/growth";

function deny(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("admin", "denied");
  return NextResponse.redirect(url);
}
function serviceHeaders(key:string){return{apikey:key,...(key.startsWith("sb_")?{}:{Authorization:`Bearer ${key}`}),"Content-Type":"application/json"}}

async function captureCreatorReferral(req:NextRequest){
  const ref=String(req.nextUrl.searchParams.get("ref")||"").toLowerCase().replace(/[^a-z0-9_-]/g,"").slice(0,40);
  if(!ref)return null;
  const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL;
  const serviceKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!supabaseUrl||!serviceKey)return null;
  const base=supabaseUrl.replace(/\/$/,""),h=serviceHeaders(serviceKey);
  try{
    const lookup=await fetch(`${base}/rest/v1/ynot_creators?referral_code=eq.${encodeURIComponent(ref)}&status=eq.active&select=id,referral_code&limit=1`,{headers:h,cache:"no-store"});
    if(!lookup.ok)return null;
    const rows=await lookup.json(),creator=rows?.[0];if(!creator?.id)return null;
    const productId=String(req.nextUrl.searchParams.get("product")||"").slice(0,500),source=String(req.nextUrl.searchParams.get("utm_source")||req.nextUrl.searchParams.get("source")||"creator_link").slice(0,100);
    await fetch(`${base}/rest/v1/ynot_creator_clicks`,{method:"POST",headers:{...h,Prefer:"return=minimal"},body:JSON.stringify([{creator_id:creator.id,referral_code:creator.referral_code,product_id:productId||null,landing_path:(req.nextUrl.pathname+req.nextUrl.search).slice(0,500),user_agent:String(req.headers.get("user-agent")||"").slice(0,500),referrer:String(req.headers.get("referer")||"").slice(0,500),source}]),cache:"no-store"});
    const response=NextResponse.next(),cookie={httpOnly:true,sameSite:"lax" as const,secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*24*30};
    response.cookies.set("ynot-creator-id",creator.id,cookie);
    response.cookies.set("ynot-creator-ref",creator.referral_code,cookie);
    if(productId)response.cookies.set("ynot-creator-product",productId,cookie);
    return response;
  }catch{return null}
}

export async function middleware(req: NextRequest) {
  if(req.nextUrl.pathname==="/"){
    const tracked=await captureCreatorReferral(req);
    if(tracked)return tracked;
    return NextResponse.next();
  }
  if (!req.nextUrl.pathname.startsWith(ADMIN_PATH)) return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey || !anonKey) return deny(req);

  const bearer = req.cookies.get("ynot-admin-session")?.value || req.cookies.get("sb-access-token")?.value || req.cookies.get("supabase-auth-token")?.value;
  if (!bearer) return deny(req);

  const userRes = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${bearer}` },
    cache: "no-store",
  });
  if (!userRes.ok) return deny(req);
  const user = await userRes.json();
  if (!user?.id) return deny(req);

  const access = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/ynot_admin_access_requests?auth_user_id=eq.${encodeURIComponent(user.id)}&status=eq.approved&select=id&limit=1`,
    { headers: { apikey: serviceKey, ...(serviceKey.startsWith("sb_") ? {} : { Authorization: `Bearer ${serviceKey}` }) }, cache: "no-store" }
  );
  if (!access.ok) return deny(req);
  const rows = await access.json();
  return Array.isArray(rows) && rows.length ? NextResponse.next() : deny(req);
}

export const config = { matcher: ["/", "/admin/growth/:path*"] };
