import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const BUCKET = "YNOT FEED";
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
type FileRow = { name: string; created_at?: string; metadata?: { size?: number } };
const image = (n:string) => /\.(jpe?g|png|webp|avif)$/i.test(n);
function authorized(req:NextRequest) {
 const supplied = req.headers.get("authorization")?.replace(/^Bearer\s+/i,"") || "";
 return Boolean(supplied && ((process.env.YNOT_EBAY_DASHBOARD_PIN && supplied===process.env.YNOT_EBAY_DASHBOARD_PIN) || (process.env.YNOT_MCP_TOKEN && supplied===process.env.YNOT_MCP_TOKEN)));
}
function headers(){return {apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":"application/json"};}
async function api(path:string, method:string, body:unknown){
 const r=await fetch(`${BASE.replace(/\/$/,"")}/storage/v1${path}`,{method,headers:headers(),body:JSON.stringify(body),cache:"no-store"});
 const data=await r.json().catch(()=>null);
 if(!r.ok)throw new Error(`Storage API ${r.status}: ${String(data?.message||data?.error||"Request failed").slice(0,100)}`);
 return data;
}
async function folderFiles(prefix:string){
 const all:FileRow[]=[];
 for(let offset=0;offset<10000;offset+=1000){
  const page=await api(`/object/list/${encodeURIComponent(BUCKET)}`,"POST",{prefix,limit:1000,offset,sortBy:{column:"name",order:"asc"}});
  if(!Array.isArray(page))throw new Error("Storage list returned invalid data");
  all.push(...page.map((f:FileRow)=>({...f,name:f.name.startsWith(prefix)?f.name:`${prefix}${f.name}`})));
  if(page.length<1000)break;
 }
 return all.filter(f=>image(f.name)||/\.json$/i.test(f.name));
}
async function plan(){
 const album=await folderFiles("album-covers/");
 const electric=await folderFiles("electric/");
 const groups=new Map<string,FileRow[]>();
 for(const f of album.filter(x=>image(x.name))){
  const folder=f.name.substring(0,f.name.lastIndexOf("/"));
  groups.set(folder,[...(groups.get(folder)||[]),f]);
 }
 const deletes:string[]=[];
 for(const entries of groups.values()){
  entries.sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||""))||b.name.localeCompare(a.name));
  deletes.push(...entries.slice(2).map(x=>x.name));
 }
 const egroups=new Map<string,FileRow[]>();
 for(const f of electric.filter(x=>image(x.name))){
  const folder=f.name.substring(0,f.name.lastIndexOf("/"));
  egroups.set(folder,[...(egroups.get(folder)||[]),f]);
 }
 const retained=new Set<string>();
 for(const entries of egroups.values()){
  entries.sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||""))||b.name.localeCompare(a.name));
  retained.add(entries[0].name.replace(/\.[^.]+$/,""));
  deletes.push(...entries.slice(1).map(x=>x.name));
 }
 // Keep the sidecar JSON that belongs to the retained Electric image.
 for(const f of electric.filter(x=>/\.json$/i.test(x.name)))
  if(!retained.has(f.name.replace(/\.json$/i,"")))deletes.push(f.name);
 return {deletes,albumTotal:album.filter(x=>image(x.name)).length,electricImages:electric.filter(x=>image(x.name)).length,albumFolders:groups.size,electricFolders:egroups.size,estimatedBytes:[...album,...electric].filter(f=>deletes.includes(f.name)).reduce((n,f)=>n+Number(f.metadata?.size||0),0)};
}
async function handle(req:NextRequest,remove:boolean){
 if(!authorized(req))return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!BASE||!KEY)return NextResponse.json({error:"Supabase server credentials unavailable"},{status:503});
 try {
  if(remove){
   const body=await req.json().catch(()=>({}));
   if(body.confirm!=="DELETE_SURPLUS_COVERS")return NextResponse.json({error:"Confirmation required"},{status:400});
  }
  const p=await plan();
  if(!remove)return NextResponse.json({ok:true,albumTotal:p.albumTotal,electricImages:p.electricImages,albumFolders:p.albumFolders,electricFolders:p.electricFolders,surplus:p.deletes.length,estimatedBytes:p.estimatedBytes});
  const batch=p.deletes.slice(0,100);
  if(batch.length){
   const result=await api(`/object/${encodeURIComponent(BUCKET)}`,"DELETE",{prefixes:batch});
   if(!Array.isArray(result))throw new Error("Storage deletion response could not be confirmed");
  }
  return NextResponse.json({ok:true,deleted:batch.length,remainingEstimate:Math.max(0,p.deletes.length-batch.length),done:p.deletes.length<=batch.length});
 }catch(err){return NextResponse.json({error:err instanceof Error?err.message:"Cleanup error"},{status:502})}
}
export const GET=(req:NextRequest)=>handle(req,false);
export const POST=(req:NextRequest)=>handle(req,true);
