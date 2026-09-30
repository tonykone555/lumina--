import {NextRequest,NextResponse} from "next/server";
import crypto from "node:crypto";
import {ELECTRIC_VISUAL_TAXONOMY} from "@/lib/electric/image-taxonomy";

export const maxDuration=300;
export const dynamic="force-dynamic";

const SB=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://iycxkwoxbkanfyraohge.supabase.co";
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
const APIFY=process.env.APIFY_API_TOKEN||process.env.APIFY_TOKEN||process.env.APIFY_KEY||"";
const ACTOR=process.env.PINTEREST_APIFY_ACTOR||"accountable_eel~pinterest-search-lookup";
const BUCKET=process.env.YNOT_ELECTRIC_REFERENCE_BUCKET||"YNOT ELECTRIC REFERENCES";
const TARGET=Number(process.env.ELECTRIC_TARGET_PER_SUBCATEGORY||50);

const enc=(s:string)=>s.split("/").map(encodeURIComponent).join("/");
async function list(prefix:string){const r=await fetch(`${SB}/storage/v1/object/list/${encodeURIComponent(BUCKET)}`,{method:"POST",headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":"application/json"},body:JSON.stringify({prefix,limit:1000,offset:0})});if(!r.ok)return[];const j=await r.json();return Array.isArray(j)?j:[]}
async function upload(path:string,body:Buffer,type:string){const r=await fetch(`${SB}/storage/v1/object/${encodeURIComponent(BUCKET)}/${enc(path)}`,{method:"POST",headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":type,"x-upsert":"false"},body});return r.ok}
async function pins(query:string,limit:number){const r=await fetch(`https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(APIFY)}&clean=true`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({searchQueries:[query],queries:[query],query,maxPinsPerSearch:Math.min(50,limit),maxResults:Math.min(50,limit),resultsPerPage:Math.min(50,limit)})});if(!r.ok)throw new Error(`Apify ${r.status}: ${(await r.text()).slice(0,180)}`);const j=await r.json();return Array.isArray(j)?j:(j.items||j.results||[])}
const pick=(x:any)=>x.imageUrl||x.image_url||x.image?.url||x.images?.orig?.url||x.images?.original?.url||x.url||x.src||"";
const dim=(x:any,k:"width"|"height")=>Number(x[k]||x.image?.[k]||x.images?.orig?.[k]||x.images?.original?.[k]||0);

async function fill(def:(typeof ELECTRIC_VISUAL_TAXONOMY)[number]){
 const folder=`${def.category}/${def.subcategory}`;const existing=(await list(folder)).filter((x:any)=>/\.(jpe?g|png|webp|avif)$/i.test(x.name||""));let need=Math.max(0,TARGET-existing.length),added=0,seen=new Set(existing.map((x:any)=>x.name));
 if(!need)return {subcategory:def.subcategory,before:existing.length,added:0,total:existing.length,status:"full"};
 for(const query of def.queries){if(need<=0)break;let items:any[]=[];try{items=await pins(query,Math.min(50,need+15))}catch(e:any){return {subcategory:def.subcategory,before:existing.length,added,total:existing.length+added,status:"error",error:e.message}}
  for(const item of items){if(need<=0)break;try{const url=pick(item);if(!url)continue;const w=dim(item,"width"),h=dim(item,"height");if((w&&w<800)||(h&&h<600))continue;const r=await fetch(url,{redirect:"follow"});if(!r.ok)continue;const type=r.headers.get("content-type")||"";if(!type.startsWith("image/"))continue;const b=Buffer.from(await r.arrayBuffer());if(b.length<60000)continue;const hash=crypto.createHash("sha256").update(b).digest("hex");const ext=type.includes("png")?"png":type.includes("webp")?"webp":"jpg",name=`${hash.slice(0,20)}.${ext}`;if(seen.has(name))continue;const path=`${folder}/${name}`;if(!await upload(path,b,type))continue;seen.add(name);const pinUrl=item.pinUrl||item.pin_url||item.link||item.url||"";const meta={world:"electric",category:def.category,subcategory:def.subcategory,query,pinUrl,originalSourceUrl:item.destinationUrl||item.destination_url||item.sourceUrl||item.source_url||"",title:item.title||item.name||"",width:w,height:h,sha256:hash,status:"reference-only",collectedAt:new Date().toISOString()};await upload(`${folder}/${hash.slice(0,20)}.json`,Buffer.from(JSON.stringify(meta)),"application/json");added++;need--}catch{}}
 }
 return {subcategory:def.subcategory,before:existing.length,added,total:existing.length+added,status:need<=0?"full":"partial"};
}

export async function POST(req:NextRequest){
 if(!KEY||!APIFY)return NextResponse.json({error:"Missing server credentials"},{status:500});
 const secret=process.env.ELECTRIC_POPULATE_SECRET;const supplied=req.headers.get("x-ynot-populate-secret")||req.nextUrl.searchParams.get("secret");if(secret&&supplied!==secret)return NextResponse.json({error:"Unauthorized"},{status:401});
 const body=await req.json().catch(()=>({}));const only=String(body?.subcategory||req.nextUrl.searchParams.get("subcategory")||"");const defs=only?ELECTRIC_VISUAL_TAXONOMY.filter(x=>x.subcategory===only):ELECTRIC_VISUAL_TAXONOMY;
 const results=[];for(const d of defs)results.push(await fill(d));
 return NextResponse.json({targetPerSubcategory:TARGET,processed:results.length,results});
}

export async function GET(){return NextResponse.json({ready:Boolean(KEY&&APIFY),targetPerSubcategory:TARGET,subcategories:ELECTRIC_VISUAL_TAXONOMY.map(x=>x.subcategory),usage:"POST to populate missing images; existing full subcategories are skipped."})}
