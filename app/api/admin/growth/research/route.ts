import {NextRequest,NextResponse} from "next/server";
import {requireYnotAdmin,adminErrorStatus} from "@/lib/ynot/admin-server";

export const runtime="nodejs";

function cfg(){
 const url=String(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||"").replace(/\/$/,"");
 const key=String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"");
 if(!url||!key)throw new Error("SUPABASE_NOT_CONFIGURED");
 return{url,key,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"}};
}

export async function GET(req:NextRequest){
 try{
  await requireYnotAdmin(req);
  const {url,headers}=cfg();
  const r=await fetch(`${url}/rest/v1/ynot_growth_research_folders?select=id,name,niche,description,status,cover_image_url,created_at,updated_at,ynot_growth_research_items(id,kind,source,title,summary,url,image_url,score,payload,created_at)&order=updated_at.desc&ynot_growth_research_items.order=created_at.desc`,{headers,cache:"no-store"});
  const data=await r.json().catch(()=>[]);
  if(!r.ok)throw new Error(String(data?.message||data?.error||"RESEARCH_LIBRARY_READ_FAILED"));
  return NextResponse.json({folders:Array.isArray(data)?data:[]});
 }catch(e){const m=e instanceof Error?e.message:"RESEARCH_LIBRARY_READ_FAILED";return NextResponse.json({error:m},{status:adminErrorStatus(e)});}
}

export async function POST(req:NextRequest){
 try{
  await requireYnotAdmin(req);
  const body=await req.json();
  const name=String(body?.name||"").trim().slice(0,140);
  const niche=String(body?.niche||"").trim().slice(0,180);
  const description=String(body?.description||"").trim().slice(0,1000);
  const rawItems=Array.isArray(body?.items)?body.items.slice(0,100):[];
  if(!name)return NextResponse.json({error:"NAME_REQUIRED"},{status:400});
  const {url,headers}=cfg();
  const cover=String(body?.cover_image_url||rawItems.find((x:any)=>x?.image_url)?.image_url||"").slice(0,1200)||null;
  const fr=await fetch(`${url}/rest/v1/ynot_growth_research_folders`,{method:"POST",headers:{...headers,Prefer:"return=representation"},body:JSON.stringify({name,niche:niche||null,description:description||null,cover_image_url:cover})});
  const folders=await fr.json().catch(()=>[]);
  if(!fr.ok)throw new Error(String(folders?.message||folders?.error||"RESEARCH_FOLDER_CREATE_FAILED"));
  const folder=Array.isArray(folders)?folders[0]:folders;
  if(!folder?.id)throw new Error("RESEARCH_FOLDER_CREATE_FAILED");
  if(rawItems.length){
   const items=rawItems.map((x:any)=>({folder_id:folder.id,kind:String(x?.kind||"signal").slice(0,80),source:String(x?.source||"").slice(0,120)||null,title:String(x?.title||"Saved research").slice(0,300),summary:String(x?.summary||"").slice(0,3000)||null,url:String(x?.url||"").slice(0,1600)||null,image_url:String(x?.image_url||"").slice(0,1600)||null,score:Number.isFinite(Number(x?.score))?Number(x.score):null,payload:x?.payload&&typeof x.payload==="object"?x.payload:{}}));
   const ir=await fetch(`${url}/rest/v1/ynot_growth_research_items`,{method:"POST",headers:{...headers,Prefer:"return=minimal"},body:JSON.stringify(items)});
   if(!ir.ok){const d=await ir.json().catch(()=>({}));throw new Error(String(d?.message||d?.error||"RESEARCH_ITEMS_SAVE_FAILED"));}
  }
  return NextResponse.json({folder:{...folder,item_count:rawItems.length}});
 }catch(e){const m=e instanceof Error?e.message:"RESEARCH_LIBRARY_SAVE_FAILED";return NextResponse.json({error:m},{status:/SUPABASE_NOT_CONFIGURED/.test(m)?503:adminErrorStatus(e)});}
}
