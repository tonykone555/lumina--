import {NextRequest,NextResponse} from "next/server";
import {etsyApiHeader,getEtsyAccessToken,readEtsyConnection} from "@/lib/etsy/oauth";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const ETSY_BASE="https://api.etsy.com/v3/application";
const DEFAULT_TAGS=["ai commerce","ai shopping guide","chatgpt business","ecommerce guide","ai marketing","product discovery","shopify guide","business playbook","online selling","small business ai","product seo","ai business","pinterest guide"];

function cleanTags(input:unknown){
 const raw=Array.isArray(input)?input:String(input||"").split(",");
 return [...new Set(raw.map(v=>String(v).toLowerCase().trim().replace(/[^\p{L}\p{N}\s'-]/gu,"")).filter(v=>v&&v.length<=20))].slice(0,13);
}
function safeId(value:unknown,label:string){const v=String(value??"").trim();if(!/^\d+$/.test(v))throw new Error(`${label}_INVALID`);return v}
function safeHeader(value:string,label:string){const v=String(value||"").trim();if(!v||/[\r\n]/.test(v))throw new Error(`${label}_INVALID`);return v}

async function etsy(path:string,init:RequestInit={},stage="etsy_request"){
 const token=safeHeader(await getEtsyAccessToken(),"ETSY_ACCESS_TOKEN");
 const key=safeHeader(etsyApiHeader(),"ETSY_API_KEY");
 if(!path.startsWith("/"))throw new Error(`ETSY_PATH_INVALID_${stage}`);
 const url=`${ETSY_BASE}${path}`;
 const headers=new Headers(init.headers);
 headers.set("x-api-key",key);
 headers.set("Authorization",`Bearer ${token}`);
 try{
  const r=await fetch(url,{...init,headers,cache:"no-store"});
  const text=await r.text(); let data:any={};
  try{data=text?JSON.parse(text):{}}catch{data={message:text}}
  if(!r.ok){
   const detail=String(data?.error||data?.message||data?.detail||`HTTP ${r.status}`).slice(0,500);
   throw new Error(`${stage}: Etsy ${r.status} — ${detail}`);
  }
  return data;
 }catch(error:any){
  if(String(error?.message||"").startsWith(`${stage}:`))throw error;
  throw new Error(`${stage}: ${error?.message||"request failed"}`);
 }
}

async function shop(){
 let c:any=null;try{c=await readEtsyConnection()}catch{}
 const access=await getEtsyAccessToken();
 const uid=c?.etsy_user_id||String(access||"").split(".")[0];
 const userId=safeId(uid,"ETSY_USER");
 const data=await etsy(`/users/${encodeURIComponent(userId)}/shops`,{},"load_shop");
 const s=Array.isArray(data?.results)?data.results[0]:data;
 if(!s?.shop_id)throw new Error("load_shop: Etsy shop not found");
 return s;
}
function flatten(nodes:any[],trail:string[]=[],out:any[]=[]){for(const n of nodes||[]){const p=[...trail,String(n.name||"")];out.push({id:n.id,name:n.name,path:p.filter(Boolean).join(" > ")});flatten(n.children||[],p,out)}return out}
async function taxonomy(){
 const data=await etsy("/seller-taxonomy/nodes",{},"load_taxonomy"); const all=flatten(data?.results||[]);
 const score=(x:any)=>{const s=String(x.path).toLowerCase();return (s.includes("template")?12:0)+(s.includes("digital")?10:0)+(s.includes("business")?7:0)+(s.includes("guide")?6:0)+(s.includes("book")?4:0)+(s.includes("paper")?-3:0)};
 return all.sort((a,b)=>score(b)-score(a))[0]||null;
}
export async function GET(){try{const [s,t]=await Promise.all([shop(),taxonomy()]);return NextResponse.json({ok:true,shop:{id:s.shop_id,name:s.shop_name||s.title||"Etsy shop"},taxonomy:t,recommendedTags:DEFAULT_TAGS});}catch(e:any){return NextResponse.json({ok:false,error:e?.message||"ETSY_SETUP_FAILED"},{status:400})}}

export async function POST(req:NextRequest){
 let stage="read_form";
 try{
  const form=await req.formData(); stage="load_shop"; const s=await shop(); const shopId=safeId(s.shop_id,"ETSY_SHOP");
  const title=String(form.get("title")||"Sell Through AI: AI Commerce Playbook").trim().slice(0,140);
  const description=String(form.get("description")||"").trim(); if(!description)throw new Error("DESCRIPTION_REQUIRED");
  const price=Number(form.get("price")||19); if(!Number.isFinite(price)||price<0.2)throw new Error("PRICE_INVALID");
  stage="load_taxonomy"; const taxRaw=Number(form.get("taxonomyId")||0)||(await taxonomy())?.id; const tax=Number(taxRaw); if(!Number.isInteger(tax)||tax<=0)throw new Error("TAXONOMY_REQUIRED");
  const tags=cleanTags(form.get("tags")||DEFAULT_TAGS.join(",")); if(tags.length!==13)throw new Error("USE_13_TAGS_MAX_20_CHARS_EACH");

  // Etsy's documented digital-listing flow is: create the draft, upload its
  // assets, then mark it as a download. Keep the initial draft payload simple.
  stage="create_draft";
  const body={quantity:999,title,description,price,who_made:"i_did",when_made:"2020_2026",taxonomy_id:tax,tags,should_auto_renew:true,is_supply:false};
  const listing=await etsy(`/shops/${shopId}/listings`,{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify(body)},stage);
  const listingId=safeId(listing?.listing_id,"ETSY_DRAFT_ID");

  const images=form.getAll("images").filter(v=>v instanceof File&&v.size>0) as File[];
  if(!images.length)throw new Error("LISTING_IMAGES_REQUIRED");
  for(let i=0;i<Math.min(images.length,10);i++){
   stage=`upload_image_${i+1}`; const fd=new FormData(); fd.set("image",images[i]); fd.set("rank",String(i+1));
   await etsy(`/shops/${shopId}/listings/${listingId}/images`,{method:"POST",body:fd},stage);
  }

  let pdfs=form.getAll("pdfs").filter(v=>v instanceof File&&v.size>0) as File[];
  if(!pdfs.length){const old=form.get("pdf");if(old instanceof File&&old.size>0)pdfs=[old];}
  if(!pdfs.length)throw new Error("PDF_REQUIRED"); if(pdfs.length>5)throw new Error("ETSY_MAX_5_DIGITAL_FILES");
  for(let i=0;i<pdfs.length;i++){
   stage=`upload_pdf_${i+1}`; const pdf=pdfs[i]; const fd=new FormData(); fd.set("file",pdf,pdf.name||`Sell-Through-AI-${i+1}.pdf`);
   await etsy(`/shops/${shopId}/listings/${listingId}/files`,{method:"POST",body:fd},stage);
  }

  stage="set_download_type";
  await etsy(`/shops/${shopId}/listings/${listingId}`,{method:"PATCH",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify({type:"download"})},stage);
  return NextResponse.json({ok:true,listingId:Number(listingId),state:listing?.state||"draft",url:listing?.url||null,tags,filesUploaded:pdfs.length,imagesUploaded:Math.min(images.length,10)});
 }catch(e:any){
  const message=String(e?.message||"ETSY_DRAFT_FAILED");
  console.error("Etsy draft failed",{stage,message});
  return NextResponse.json({ok:false,error:message,stage},{status:400});
 }
}
