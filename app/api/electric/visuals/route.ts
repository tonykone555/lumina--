import {NextRequest,NextResponse} from "next/server";
import {ELECTRIC_VISUAL_TAXONOMY} from "@/lib/electric/image-taxonomy";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://iycxkwoxbkanfyraohge.supabase.co";
const BUCKET=process.env.YNOT_ELECTRIC_FEED_BUCKET||"YNOT ELECTRIC FEED";

type Visual={id:string;src:string;world:string;category:string;subcategory:string;query:string;source?:string;width?:number;height?:number};

async function listFolder(folder:string){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)return [];
 const r=await fetch(`${SUPABASE_URL}/storage/v1/object/list/${encodeURIComponent(BUCKET)}`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({prefix:folder,limit:1000,offset:0,sortBy:{column:"name",order:"asc"}}),cache:"no-store"});
 if(!r.ok)return [];
 const rows=await r.json();
 return Array.isArray(rows)?rows:[];
}

export async function GET(req:NextRequest){
 const category=req.nextUrl.searchParams.get("category");
 const subcategory=req.nextUrl.searchParams.get("subcategory");
 const defs=ELECTRIC_VISUAL_TAXONOMY.filter(x=>(!category||x.category===category)&&(!subcategory||x.subcategory===subcategory));
 const out:Visual[]=[];
 for(const d of defs){
   const folder=`${d.category}/${d.subcategory}`;
   const files=await listFolder(folder);
   for(const f of files){
     if(!f?.name||!(/\.(jpe?g|png|webp|avif)$/i.test(f.name)))continue;
     const path=`${folder}/${f.name}`;
     out.push({id:path,src:`${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(BUCKET)}/${path.split('/').map(encodeURIComponent).join('/')}`,world:d.world,category:d.category,subcategory:d.subcategory,query:d.queries[0],source:"ynot-electric-feed"});
   }
 }
 return NextResponse.json({items:out,count:out.length,taxonomy:defs.map(x=>({category:x.category,subcategory:x.subcategory,queries:x.queries}))});
}
