import "server-only";
import crypto from "node:crypto";

export type CircleProfile={id:string;referral_code:string;parent_user_id:string|null;display_name:string|null;avatar_data?:string|null;created_at:string};
const base=()=>String(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||"").replace(/\/$/,"");
const key=()=>String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"");
const authHeaders=()=>{const value=key();return{apikey:value,...(value.startsWith("sb_")?{}:{Authorization:`Bearer ${value}`})}};
export function circleReady(){return Boolean(base()&&key())}
async function request(path:string,init:RequestInit={}){
 if(!circleReady())throw new Error("CIRCLE_NOT_CONFIGURED");
 const response=await fetch(`${base()}/rest/v1/${path}`,{...init,headers:{...authHeaders(),"Content-Type":"application/json",Prefer:"return=representation",...(init.headers||{})},cache:"no-store"});
 const text=await response.text();if(!response.ok)throw new Error(text||"CIRCLE_DATABASE_ERROR");return text?JSON.parse(text):null;
}
export function referralCode(){return crypto.randomBytes(4).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,7)}
export async function ensureProfile(id:string){
 const found=await request(`ynot_users?id=eq.${encodeURIComponent(id)}&select=*`);
 if(found?.[0])return found[0] as CircleProfile;
 for(let i=0;i<4;i++){try{const made=await request("ynot_users",{method:"POST",body:JSON.stringify({id,referral_code:referralCode()})});if(made?.[0])return made[0] as CircleProfile}catch{}}
 throw new Error("CIRCLE_PROFILE_FAILED");
}
export async function claimReferrer(userId:string,code:string){
 return request("rpc/ynot_claim_referrer",{method:"POST",body:JSON.stringify({p_user_id:userId,p_code:code.trim().toUpperCase()})});
}
export async function dashboard(userId:string){
 await request("rpc/ynot_release_expired_reservations",{method:"POST",body:"{}"});
 const [profile,members,ledger]=await Promise.all([
  request(`ynot_users?id=eq.${encodeURIComponent(userId)}&select=*`),
  request(`ynot_users?parent_user_id=eq.${encodeURIComponent(userId)}&select=id,display_name,avatar_data,created_at&order=created_at.desc&limit=60`),
  request(`credit_transactions?user_id=eq.${encodeURIComponent(userId)}&status=eq.settled&select=id,amount_cents,event_type,description,created_at,order_id&order=created_at.desc&limit=40`)
 ]);
 const transactions=ledger||[];const balanceCents=transactions.reduce((sum:number,row:{amount_cents:number})=>sum+Number(row.amount_cents||0),0);
 const qualifying=(transactions as {event_type:string}[]).filter(row=>row.event_type==="referral_order_reward").length;
 return{profile:profile?.[0],members:members||[],transactions,balanceCents,qualifyingPurchases:qualifying};
}
export async function availableCredit(userId:string){const data=await request("rpc/ynot_available_credit",{method:"POST",body:JSON.stringify({p_user_id:userId})});return Number(data||0)}
export async function reserveCredit(userId:string,checkoutRef:string,amountCents:number){return request("rpc/ynot_reserve_credit",{method:"POST",body:JSON.stringify({p_user_id:userId,p_checkout_ref:checkoutRef,p_amount_cents:amountCents})})}
export async function releaseCredit(checkoutRef:string){return request("rpc/ynot_release_credit",{method:"POST",body:JSON.stringify({p_checkout_ref:checkoutRef})})}
export async function settleOrder(args:{buyerId:string;orderId:string;subtotalCents:number;creditCents:number;checkoutRef?:string}){return request("rpc/ynot_settle_order",{method:"POST",body:JSON.stringify({p_buyer_id:args.buyerId,p_order_id:args.orderId,p_subtotal_cents:args.subtotalCents,p_credit_cents:args.creditCents,p_checkout_ref:args.checkoutRef||null})})}
export async function reverseOrder(orderId:string){return request("rpc/ynot_reverse_order",{method:"POST",body:JSON.stringify({p_order_id:orderId})})}
