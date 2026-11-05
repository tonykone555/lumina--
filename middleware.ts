import { NextRequest, NextResponse } from "next/server";

const ADMIN_PATH = "/admin/growth";
const ACCESS_PATH = "/access";
const ACCESS_COOKIE = "ynot-site-access";

function deny(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("admin", "denied");
  return NextResponse.redirect(url);
}
function serviceHeaders(key:string){return{apikey:key,...(key.startsWith("sb_")?{}:{Authorization:`Bearer ${key}`}),"Content-Type":"application/json"}}

async function hasValidSiteSession(req: NextRequest) {
  const secret = process.env.YNOT_SITE_SESSION_SECRET;
  const token = req.cookies.get(ACCESS_COOKIE)?.value || "";
  if (!secret || !token) return false;
  const [expires, supplied, extra] = token.split(".");
  if (!expires || !supplied || extra || !/^\d{13}$/.test(expires) || Number(expires) <= Date.now()) return false;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("ynot-site-access:" + expires));
    const expected = Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
    if (expected.length !== supplied.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
    return diff === 0;
  } catch { return false; }
}

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
  const pathname = req.nextUrl.pathname;

  // Keep image-analysis endpoints behind the same signed access session as the private website.
  const protectedPrivateApi = pathname === "/api/room/quick/analyze";
  if (protectedPrivateApi && !(await hasValidSiteSession(req))) {
    return NextResponse.json({error:"ACCESS_REQUIRED"},{status:401,headers:{"Cache-Control":"no-store"}});
  }

  // Allow only the password entry page before a valid site session.
  if (pathname === ACCESS_PATH) return NextResponse.next();
  if (!(await hasValidSiteSession(req))) {
    const url = req.nextUrl.clone();
    url.pathname = ACCESS_PATH;
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if(pathname==="/"){
    const tracked=await captureCreatorReferral(req);
    if(tracked)return tracked;
    return NextResponse.next();
  }
  if (!pathname.startsWith(ADMIN_PATH)) return NextResponse.next();

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

export const config = {
  matcher: ["/((?!api/|_next/|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff2?|ttf|otf|mp4|webm)$).*)", "/api/room/quick/analyze"],
};
