import {NextRequest,NextResponse} from "next/server";
import {etsyApiHeader,getEtsyAccessToken,readEtsyConnection} from "@/lib/etsy/oauth";

export const runtime="nodejs";
export const dynamic="force-dynamic";

// 13 varied buyer-intent phrases, each within Etsy's 20-character tag limit.
// Pinterest is included because the playbook covers discovery/promotion channels; the tag describes that content rather than promising Pinterest distribution.
const DEFAULT_TAGS=[
 "ai shopping guide",
 "ai ecommerce",
 "chatgpt business",
 "ai business guide",
 "ecommerce guide",
 "shopify marketing",
 "product discovery",
 "ai marketing guide",
 "product seo guide",
 "online selling",
 "small business ai",
 "pinterest marketing",
 "business playbook"
];

function cleanTags(input:unknown){
 const raw=Array.isArray(input)?input:String(input||"").split(",");
 return [...new Set(raw.map(v=>String(v).toLowerCase().trim().replace(/[^\p{L}\p{N}\s'-]/gu,"").slice(0,20)).filter(Boolean))].slice(0,13);
}
async function etsy(path:string,init:RequestInit={}){
 const token=await getEtsyAccessToken(); const key=etsyApiHeader();
 if(!token)throw new Error("ETSY_NOT_CONNECTED"); if(!key)throw new Error("ETSY_API_KEY_MISSING");
 const headers=new Headers(init.headers); headers.set("x-api-key",key); headers.set("Authorization",`Bearer ${token}`);
 const r=await fetch(`https://api.etsy.com/v3/application${path}`,{...init,headers,cache:"no-store"});
 const text=await r.text(); let data:any={}; try{data=text?JSON.parse(text):{}}catch{data={message:text}}
 if(!r.ok)throw new Error(data?.error||data?.message||`ETSY_${r.status}`); return data;
}
async function shop(){
 const c=await readEtsyConnection(); const uid=c?.etsy_user_id||String((await getEtsyAccessToken())||"").split(".")[0];
 if(!uid)throw new Error("ETSY_USER_MISSING");
 const data=await etsy(`/users/${encodeURIComponent(uid)}/shops`);
 const s=Array.isArray(data?.results)?data.results[0]:data;
 if(!s?.shop_id)throw new Error("ETSY_SHOP_NOT_FOUND"); return s;
}
function flatten(nodes:any[],trail:string[]=[],out:any[]=[]){for(const n of nodes||[]){const p=[...trail,String(n.name||"")];out.push({id:n.id,name:n.name,path:p.filter(Boolean).join(" > ")});flatten(n.children||[],p,out)}return out}
async function taxonomy(){
 const data=await etsy("/seller-taxonomy/nodes"); const all=flatten(data?.results||[]);
 const score=(x:any)=>{const s=String(x.path).toLowerCase();return (s.includes("template")?12:0)+(s.includes("digital")?10:0)+(s.includes("business")?7:0)+(s.includes("guide")?6:0)+(s.includes("book")?4:0)+(s.includes("paper")?-3:0)};
 return all.sort((a,b)=>score(b)-score(a))[0]||null;
}
export async function GET(){try{const [s,t]=await Promise.all([shop(),taxonomy()]);return NextResponse.json({ok:true,shop:{id:s.shop_id,name:s.shop_name||s.title||"Etsy shop"},taxonomy:t,recommendedTags:DEFAULT_TAGS});}catch(e:any){return NextResponse.json({ok:false,error:e?.message||"ETSY_SETUP_FAILED"},{status:400})}}

export async function POST(req:NextRequest){
 try{
  const form=await req.formData(); const s=await shop();
  const title=String(form.get("title")||"AI Shopping & Ecommerce Playbook for ChatGPT Business and Product Discovery").trim().slice(0,140);
  const description=String(form.get("description")||"").trim(); if(!description)throw new Error("DESCRIPTION_REQUIRED");
  const price=Math.max(.2,Number(form.get("price")||19));
  const tax=Number(form.get("taxonomyId")||0)||(await taxonomy())?.id; if(!tax)throw new Error("TAXONOMY_REQUIRED");
  const tags=cleanTags(form.get("tags")||DEFAULT_TAGS.join(","));
  const body={quantity:999,title,description,price,who_made:"i_did",when_made:"2020_2026",taxonomy_id:tax,type:"download",tags,should_auto_renew:true,is_supply:false};
  const listing=await etsy(`/shops/${s.shop_id}/listings`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const listingId=Number(listing?.listing_id); if(!listingId)throw new Error("ETSY_DRAFT_ID_MISSING");
  const images=form.getAll("images").filter(v=>v instanceof File&&v.size>0) as File[];
  for(let i=0;i<Math.min(images.length,10);i++){const fd=new FormData();fd.set("image",images[i]);fd.set("rank",String(i+1));await etsy(`/shops/${s.shop_id}/listings/${listingId}/images`,{method:"POST",body:fd});}
  const pdf=form.get("pdf"); if(pdf instanceof File&&pdf.size>0){const fd=new FormData();fd.set("file",pdf);fd.set("name",pdf.name||"Sell-Through-AI-Playbook.pdf");await etsy(`/shops/${s.shop_id}/listings/${listingId}/files`,{method:"POST",body:fd});}
  return NextResponse.json({ok:true,listingId,state:listing?.state||"draft",url:listing?.url||null,tags});
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||"ETSY_DRAFT_FAILED"},{status:400})}
}
