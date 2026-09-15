"use client";

type AuthUser={id:string;email?:string;user_metadata?:Record<string,unknown>;app_metadata?:Record<string,unknown>;email_confirmed_at?:string};
const base=()=>String(process.env.NEXT_PUBLIC_SUPABASE_URL||"").replace(/\/$/,"");
const key=()=>String(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"");
const TOKEN_KEY="ynot-supabase-session-v1";
export type YnotSession={access_token:string;refresh_token:string;expires_at?:number;user:AuthUser};
function headers(token?:string){return{apikey:key(),"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})}}
export function readSession():YnotSession|null{try{return JSON.parse(localStorage.getItem(TOKEN_KEY)||"null") as YnotSession|null}catch{return null}}
export function saveSession(session:YnotSession|null){if(session)localStorage.setItem(TOKEN_KEY,JSON.stringify(session));else localStorage.removeItem(TOKEN_KEY);window.dispatchEvent(new CustomEvent("ynot:auth-changed",{detail:session}))}
export function authConfigured(){return Boolean(base()&&key())}
export async function exchangeHash(){if(typeof window==="undefined"||!location.hash)return null;const p=new URLSearchParams(location.hash.slice(1)),access_token=p.get("access_token"),refresh_token=p.get("refresh_token");if(!access_token||!refresh_token)return null;const r=await fetch(`${base()}/auth/v1/user`,{headers:headers(access_token)}),user=await r.json();if(!r.ok)throw new Error(user?.msg||"Unable to finish sign in");const session={access_token,refresh_token,user,expires_at:Date.now()/1000+Number(p.get("expires_in")||3600)} as YnotSession;saveSession(session);history.replaceState(null,"",location.pathname+location.search);return session}
export async function refreshSession(){const current=readSession();if(!current?.refresh_token)return null;if((current.expires_at||0)>Date.now()/1000+60)return current;const r=await fetch(`${base()}/auth/v1/token?grant_type=refresh_token`,{method:"POST",headers:headers(),body:JSON.stringify({refresh_token:current.refresh_token})}),data=await r.json();if(!r.ok){saveSession(null);return null}const session={...data,expires_at:Date.now()/1000+Number(data.expires_in||3600)} as YnotSession;saveSession(session);return session}
export async function googleSignIn(){const redirect=`${location.origin}/`;location.assign(`${base()}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}`)}
export async function emailSignIn(email:string){const redirect=`${location.origin}/`;const r=await fetch(`${base()}/auth/v1/otp`,{method:"POST",headers:headers(),body:JSON.stringify({email,email_redirect_to:redirect,create_user:true})});if(!r.ok){const data=await r.json().catch(()=>({}));throw new Error(data?.msg||data?.message||"Unable to send sign-in email")}}
export async function signOut(){const s=readSession();if(s?.access_token)await fetch(`${base()}/auth/v1/logout`,{method:"POST",headers:headers(s.access_token)}).catch(()=>{});saveSession(null)}
export async function authedFetch(input:string,init:RequestInit={}){const s=await refreshSession();return fetch(input,{...init,headers:{...(init.headers||{}),...(s?.access_token?{Authorization:`Bearer ${s.access_token}`}:{})}})}
