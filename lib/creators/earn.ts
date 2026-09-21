import crypto from "node:crypto";
import {NextRequest} from "next/server";

const base=()=>String(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||"").replace(/\/$/,"");
const service=()=>String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"");
const anon=()=>String(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"");
const svcHeaders=()=>{const k=service();return{apikey:k,...(k.startsWith("sb_")?{}:{Authorization:`Bearer ${k}`}),"Content-Type":"application/json"}};

export type EarnCreator={id:string;auth_user_id:string|null;display_name:string|null;email:string|null;status:string;referral_code:string;commission_rate:number;bio:string|null;niches:string[];social_links:Record<string,string>;avatar_url:string|null;payout_status:string;onboarded_at:string|null};

async function raw(path:string,init:RequestInit={}) {
  if(!base()||!service())throw new Error("CREATOR_STORE_NOT_CONFIGURED");
  const r=await fetch(`${base()}/rest/v1/${path}`,{...init,headers:{...svcHeaders(),Prefer:"return=representation",...(init.headers||{})},cache:"no-store"});
  const t=await r.text();
  if(!r.ok)throw new Error(t||`CREATOR_DB_${r.status}`);
  return {data:t?JSON.parse(t):null,headers:r.headers};
}
export async function rest(path:string,init:RequestInit={}){return (await raw(path,init)).data}

export async function authenticatedUser(req:NextRequest){
  const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  if(!token)throw new Error("SIGN_IN_REQUIRED");
  const r=await fetch(`${base()}/auth/v1/user`,{headers:{apikey:anon(),Authorization:`Bearer ${token}`},cache:"no-store"});
  const u=await r.json().catch(()=>({}));
  if(!r.ok||!u?.id)throw new Error("INVALID_SESSION");
  return u;
}
function cleanCode(value:string){return value.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,16)}
function makeCode(name:string){const stem=cleanCode(name)||"creator";return `${stem.slice(0,10)}${crypto.randomBytes(3).toString("hex")}`}
export async function ensureCreator(u:any):Promise<EarnCreator>{
  let rows=await rest(`ynot_creators?auth_user_id=eq.${encodeURIComponent(u.id)}&select=*&limit=1`) as EarnCreator[];
  if(rows?.[0])return rows[0];
  const accountRows=await rest(`ynot_users?auth_user_id=eq.${encodeURIComponent(u.id)}&select=display_name,email,avatar_data&limit=1`).catch(()=>[]) as any[];
  const account=accountRows?.[0]||{},name=String(account.display_name||u.user_metadata?.full_name||u.user_metadata?.name||u.email?.split("@")[0]||"YNOT Creator").slice(0,80);
  const payload={auth_user_id:u.id,display_name:name,email:u.email||account.email||null,status:"active",referral_code:makeCode(name),source:"ynot_earn",commission_rate:0.05,avatar_url:account.avatar_data||u.user_metadata?.avatar_url||u.user_metadata?.picture||null,onboarded_at:null,payout_status:"not_connected"};
  rows=await rest("ynot_creators",{method:"POST",body:JSON.stringify([payload])}) as EarnCreator[];
  return rows[0];
}
export async function creatorDashboard(c:EarnCreator){
  const [products,commissions,payouts,clickCount]=await Promise.all([
    rest(`ynot_creator_products?creator_id=eq.${c.id}&status=eq.active&select=*&order=created_at.desc&limit=100`),
    rest(`ynot_creator_commissions?creator_id=eq.${c.id}&select=id,product_id,commission_cents,currency,status,hold_until,earned_at,paid_at,created_at,payout_id&order=created_at.desc&limit=200`),
    rest(`ynot_creator_payouts?creator_id=eq.${c.id}&select=*&order=created_at.desc&limit=50`),
    count(`ynot_creator_clicks?creator_id=eq.${c.id}&select=id`)
  ]);
  const now=Date.now();let pending=0,available=0,paid=0;
  for(const x of commissions||[]){const cents=Number(x.commission_cents||0),status=String(x.status||"");
    if(status==="paid")paid+=cents;
    else if(["reversed","payout_requested"].includes(status)){}
    else if(status==="earned"||((status==="pending")&&(!x.hold_until||new Date(x.hold_until).getTime()<=now)))available+=cents;
    else pending+=cents;
  }
  return {creator:c,stats:{clicks:clickCount,products:(products||[]).length,pending_cents:pending,available_cents:available,paid_cents:paid},products:products||[],commissions:commissions||[],payouts:payouts||[]};
}
async function count(path:string){
  const r=await fetch(`${base()}/rest/v1/${path}&limit=1`,{headers:{...svcHeaders(),Prefer:"count=exact"},cache:"no-store"});
  if(!r.ok)return 0;const range=r.headers.get("content-range")||"";const total=range.split("/")[1];return total&&total!=="*"?Number(total):0;
}
export function shareUrl(productId:string,code:string){return `${process.env.NEXT_PUBLIC_APP_URL||"https://ynotworld.app"}/p/${encodeURIComponent(productId)}?ref=${encodeURIComponent(code)}`}
export function storefrontUrl(code:string){return `${process.env.NEXT_PUBLIC_APP_URL||"https://ynotworld.app"}/c/${encodeURIComponent(code)}`}
