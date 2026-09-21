const base=()=>String(process.env.TRYPOST_API_BASE||"https://app.trypost.it/api").replace(/\/$/,"");
const token=()=>{const v=String(process.env.TRYPOST_API_TOKEN||"").trim();if(!v)throw new Error("TRYPOST_NOT_CONFIGURED");return v};
async function req(path:string,init:RequestInit={}){const r=await fetch(`${base()}${path.startsWith("/")?path:"/"+path}`,{...init,headers:{Authorization:`Bearer ${token()}`,"Content-Type":"application/json",...(init.headers||{})},cache:"no-store"}),t=await r.text();let d:any={};try{d=t?JSON.parse(t):{}}catch{d={raw:t}}if(!r.ok)throw new Error(`TRYPOST_${r.status}:${d?.message||d?.error||t||"Unknown error"}`);return d}
export async function listTryPostAccounts(){const d=await req("/social-accounts");return Array.isArray(d)?d:Array.isArray(d?.data)?d.data:[]}
const contentType=(platform:string)=>({instagram:"instagram_reel",instagram_facebook:"instagram_reel",tiktok:"tiktok_video",youtube:"youtube_short",threads:"threads_post",facebook:"facebook_reel",x:"x_post",twitter:"x_post",pinterest:"pinterest_video_pin",linkedin:"linkedin_post",linkedin_page:"linkedin_page_post",bluesky:"bluesky_post",mastodon:"mastodon_post"}[platform]||null);
export async function createTryPostVideo(input:{content:string;mediaUrl:string;platforms:string[];scheduledAt?:string|null}){
 const accounts=await listTryPostAccounts(),wanted=new Set(input.platforms.map(x=>x.toLowerCase()));
 const selected=accounts.filter((a:any)=>a?.is_active!==false&&wanted.has(String(a.platform||"").toLowerCase())).map((a:any)=>({social_account_id:a.id,content_type:contentType(String(a.platform||"").toLowerCase())})).filter((x:any)=>x.content_type);
 if(!selected.length)throw new Error("TRYPOST_NO_MATCHING_CONNECTED_ACCOUNTS");
 const payload:any={content:input.content,media:[{url:input.mediaUrl}],platforms:selected};
 if(input.scheduledAt)payload.scheduled_at=input.scheduledAt;
 const post=await req("/posts",{method:"POST",body:JSON.stringify(payload)});
 return {post,accounts:selected};
}
