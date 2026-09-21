import {NextRequest,NextResponse} from "next/server";
import {gunzipSync} from "zlib";

export const runtime="nodejs";
export const maxDuration=300;

const TAXONOMY_URL="https://github.com/Shopify/product-taxonomy/releases/latest/download/categories.en.txt.gz";

function supabase(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("SUPABASE_NOT_CONFIGURED");
  return{url:url.replace(/\/$/,""),key};
}

async function sb(path:string,init:RequestInit={}){
  const {url,key}=supabase();
  const res=await fetch(`${url}/rest/v1/${path}`,{
    ...init,
    headers:{
      apikey:key,
      Authorization:`Bearer ${key}`,
      "Content-Type":"application/json",
      Prefer:"resolution=merge-duplicates,return=minimal",
      ...(init.headers||{})
    },
    cache:"no-store"
  });
  if(!res.ok)throw new Error(`SUPABASE_${res.status}:${await res.text()}`);
}

function chunks<T>(items:T[],size=400){
  const out:T[][]=[];
  for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));
  return out;
}

function rootKey(id:string){
  const slug=id.split("/").pop()||"";
  return slug.split("-")[0]||"unknown";
}
function parentId(id:string){
  const prefix="gid://shopify/TaxonomyCategory/";
  const slug=id.replace(prefix,"");
  const bits=slug.split("-");
  if(bits.length<=1)return null;
  bits.pop();
  return prefix+bits.join("-");
}

export async function POST(req:NextRequest){
  const secret=process.env.YNOT_ADMIN_SECRET;
  const provided=req.headers.get("x-ynot-admin-secret");
  if(secret&&provided!==secret)return NextResponse.json({error:"UNAUTHORIZED"},{status:401});

  const response=await fetch(TAXONOMY_URL,{cache:"no-store",redirect:"follow"});
  if(!response.ok)throw new Error(`TAXONOMY_DOWNLOAD_${response.status}`);
  const compressed=Buffer.from(await response.arrayBuffer());
  const text=gunzipSync(compressed).toString("utf8");

  const parsed=text.split(/\r?\n/)
    .filter(line=>line && !line.startsWith("#"))
    .map(line=>{
      const idx=line.indexOf(":");
      if(idx<0)return null;
      const id=line.slice(0,idx).trim();
      const fullName=line.slice(idx+1).trim();
      if(!id.startsWith("gid://shopify/TaxonomyCategory/")||!fullName)return null;
      const parts=fullName.split(" > ").map(x=>x.trim()).filter(Boolean);
      return{
        taxonomy_id:id,
        root_key:rootKey(id),
        name:parts[parts.length-1]||fullName,
        full_name:fullName,
        level:parts.length,
        parent_id:parentId(id),
      };
    })
    .filter(Boolean) as Array<{
      taxonomy_id:string;root_key:string;name:string;full_name:string;level:number;parent_id:string|null
    }>;

  const parentIds=new Set(parsed.map(x=>x.parent_id).filter(Boolean) as string[]);
  const now=new Date().toISOString();
  const rows=parsed.map(x=>({
    ...x,
    is_leaf:!parentIds.has(x.taxonomy_id),
    active:true,
    source:"shopify-taxonomy",
    updated_at:now
  }));

  for(const batch of chunks(rows)){
    await sb("ynot_product_universe_categories?on_conflict=taxonomy_id",{
      method:"POST",
      body:JSON.stringify(batch)
    });
  }

  const queue=rows.filter(x=>x.is_leaf).map(x=>({
    taxonomy_id:x.taxonomy_id,
    object_name:x.name,
    full_name:x.full_name,
    root_key:x.root_key,
    status:"pending",
    priority:50,
    updated_at:now
  }));
  for(const batch of chunks(queue)){
    await sb("ynot_product_research_queue?on_conflict=taxonomy_id",{
      method:"POST",
      body:JSON.stringify(batch)
    });
  }

  return NextResponse.json({
    ok:true,
    source:TAXONOMY_URL,
    categories:rows.length,
    leafObjects:queue.length,
    roots:[...new Set(rows.map(x=>x.root_key))].length,
    generatedAt:now
  });
}
