import { NextRequest, NextResponse } from "next/server";

const ADMIN_PATH = "/admin/growth";

function deny(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("admin", "denied");
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith(ADMIN_PATH)) return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey || !anonKey) return deny(req);

  const bearer = req.cookies.get("sb-access-token")?.value || req.cookies.get("supabase-auth-token")?.value;
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
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store" }
  );
  if (!access.ok) return deny(req);
  const rows = await access.json();
  return Array.isArray(rows) && rows.length ? NextResponse.next() : deny(req);
}

export const config = { matcher: ["/admin/growth/:path*"] };
