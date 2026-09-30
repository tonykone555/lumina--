import {NextResponse} from "next/server";
import {ELECTRIC_VISUAL_TAXONOMY} from "@/lib/electric/image-taxonomy";
export const dynamic="force-dynamic";
const SB=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://iycxkwoxbkanfyraohge.supabase.co";
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
const BUCKET="YNOT FEED",ROOT="electric";
const TARGET=Number(process.env.ELECTRIC_TARGET_PER_SUBCATEGORY||50);
async function count(prefix:string){if(!KEY)return 0;const r=await fetch(`${SB}/storage/v1/object/list/${encodeURIComponent(BUCKET)}`,{method:"POST",headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":"application/json"},body:JSON.stringify({prefix,limit:1000,offset:0}),cache:"no-store"});if(!r.ok){console.error("electric:status:list",r.status,(await r.text()).slice(0,160));return 0}const rows=await r.json();return Array.isArray(rows)?rows.filter((x:any)=>/\.(jpe?g|png|webp|avif)$/i.test(x.name||"")).length:0}
export async function GET(){const categories=[];let total=0;for(const d of ELECTRIC_VISUAL_TAXONOMY){const current=await count(`${ROOT}/${d.category}/${d.subcategory}`);total+=Math.min(current,TARGET);categories.push({category:d.category,subcategory:d.subcategory,current,target:TARGET,complete:current>=TARGET})}const target=categories.length*TARGET;return NextResponse.json({current:total,target,complete:categories.every(x=>x.complete),bucket:BUCKET,categories})}
