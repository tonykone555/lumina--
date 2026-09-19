import {NextRequest} from "next/server";

const supabaseBase=()=>String(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||"").replace(/\/$/,"");
const publishableKey=()=>String(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"");
const serviceKey=()=>String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"");

function serviceHeaders(prefer?:string){const key=serviceKey();return{apikey:key,...(key.startsWith("sb_")?{}:{Authorization:`Bearer ${key}`}),"Content-Type":"application/json",...(prefer?{Prefer:prefer}:{})}}

export async function adminDb(path:string,init:RequestInit={}){
 const response=await fetch(`${supabaseBase()}/rest/v1/${path}`,{...init,headers:{...serviceHeaders(),...(init.headers||{})},cache:"no-store"});
 const text=await response.text();
 if(!response.ok)throw new Error(text||"DATABASE_ERROR");
 return text?JSON.parse(text):null;
}

export type AdminContext={authUser:{id:string;email?:string};profile:{id:string;display_name?:string;email?:string;is_admin:boolean}};

export async function requireYnotUser(req:NextRequest):Promise<AdminContext>{
 const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"") || req.cookies.get("ynot-admin-session")?.value || req.cookies.get("sb-access-token")?.value || req.cookies.get("supabase-auth-token")?.value;
 if(!token)throw new Error("SIGN_IN_REQUIRED");
 const userResponse=await fetch(`${supabaseBase()}/auth/v1/user`,{headers:{apikey:publishableKey(),Authorization:`Bearer ${token}`},cache:"no-store"});
 const authUser=await userResponse.json().catch(()=>({}));
 if(!userResponse.ok||!authUser?.id)throw new Error("INVALID_SESSION");
 const rows=await adminDb(`ynot_users?auth_user_id=eq.${encodeURIComponent(authUser.id)}&select=id,display_name,email,is_admin&limit=1`);
 const profile=rows?.[0];
 if(!profile)throw new Error("ACCOUNT_NOT_FOUND");
 return {authUser,profile};
}

export async function requireYnotAdmin(req:NextRequest):Promise<AdminContext>{
 const context=await requireYnotUser(req);
 if(context.profile.is_admin!==true)throw new Error("OWNER_ACCESS_REQUIRED");
 return context;
}

export function adminErrorStatus(error:unknown){
 const message=error instanceof Error?error.message:"ADMIN_ERROR";
 if(message==="SIGN_IN_REQUIRED"||message==="INVALID_SESSION")return 401;
 if(message==="ACCOUNT_NOT_FOUND"||message==="OWNER_ACCESS_REQUIRED")return 403;
 return 500;
}
