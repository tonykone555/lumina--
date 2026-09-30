#!/usr/bin/env node
/**
 * YNOT Electric image collector.
 *
 * Provider-neutral: point IMAGE_SEARCH_ENDPOINT at an image-search service you are
 * authorized to use. It must accept ?q=&page=&per_page= and return either
 * {results:[{url,width,height,source,license,title}]} or an array with those fields.
 *
 * Accepted images are copied to Supabase Storage under:
 *   ride/dirt-bikes/<hash>.jpg, water/efoils/<hash>.jpg, ...
 * Metadata is written alongside each image as <hash>.json.
 */
import crypto from "node:crypto";

const endpoint=process.env.IMAGE_SEARCH_ENDPOINT;
const token=process.env.IMAGE_SEARCH_TOKEN||"";
const sb=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://iycxkwoxbkanfyraohge.supabase.co";
const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket=process.env.YNOT_ELECTRIC_FEED_BUCKET||"YNOT ELECTRIC FEED";
const perQuery=Number(process.env.ELECTRIC_IMAGES_PER_QUERY||30);
const minWidth=Number(process.env.ELECTRIC_MIN_IMAGE_WIDTH||1200);
const minHeight=Number(process.env.ELECTRIC_MIN_IMAGE_HEIGHT||800);
const allowedLicenses=(process.env.ELECTRIC_ALLOWED_LICENSES||"cc0,public domain,unsplash,pexels,pixabay,licensed,owned").toLowerCase().split(",").map(x=>x.trim());

const taxonomy=[
 ["ride","dirt-bikes",["electric dirt bike supermoto","custom electric dirt bike","electric motocross bike"]],
 ["ride","ebikes",["premium electric mountain bike","electric cargo bike","electric fat tire bike"]],
 ["ride","scooters",["performance electric scooter","off road electric scooter","premium electric scooter"]],
 ["ride","motorcycles",["electric street motorcycle","electric cafe racer motorcycle","electric supermoto"]],
 ["ride","boards",["electric skateboard","electric longboard","electric unicycle"]],
 ["play","go-karts",["electric go kart","electric drift kart","adult electric go kart"]],
 ["play","atv-buggies",["electric ATV","electric quad bike","electric buggy"]],
 ["play","rc",["premium electric RC car","electric RC boat","electric RC off road"]],
 ["water","efoils",["electric hydrofoil efoil","premium efoil board"]],
 ["water","jetboards",["electric jetboard","electric surfboard"]],
 ["water","underwater",["underwater electric scooter","sea scooter"]],
 ["family","ride-ons",["kids electric ride on car","kids electric motorcycle","kids electric quad"]],
 ["home","garden",["robot lawn mower","electric garden cart","electric riding mower"]],
 ["home","robots",["robot pool cleaner","robot window cleaner","premium home robot"]],
 ["mods","customization",["electric dirt bike customization","electric bike custom parts","supermoto customization"]],
 ["mods","batteries",["electric bike battery pack","electric motorcycle battery"]],
 ["pro","utility",["electric utility vehicle","electric cargo vehicle","electric mini loader"]],
];

if(!endpoint||!service){console.error("Missing IMAGE_SEARCH_ENDPOINT or SUPABASE_SERVICE_ROLE_KEY");process.exit(1)}
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const ext=t=>t?.includes("png")?"png":t?.includes("webp")?"webp":"jpg";
const permitted=x=>{const l=String(x.license||"").toLowerCase();return allowedLicenses.some(a=>l.includes(a))};
async function search(q){const u=new URL(endpoint);u.searchParams.set("q",q);u.searchParams.set("page","1");u.searchParams.set("per_page",String(perQuery));const r=await fetch(u,{headers:token?{Authorization:`Bearer ${token}`}:{}});if(!r.ok)throw new Error(`search ${r.status}`);const j=await r.json();return Array.isArray(j)?j:(j.results||j.items||[])}
async function upload(path,body,type){const r=await fetch(`${sb}/storage/v1/object/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`,{method:"POST",headers:{apikey:service,Authorization:`Bearer ${service}`,"Content-Type":type,"x-upsert":"true"},body});if(!r.ok)throw new Error(`upload ${r.status} ${await r.text()}`)}
const seen=new Set();let accepted=0,rejected=0;
for(const [category,subcategory,queries] of taxonomy){for(const query of queries){let results=[];try{results=await search(query)}catch(e){console.error(query,e.message);continue}for(const item of results){try{if(!item?.url||Number(item.width||0)<minWidth||Number(item.height||0)<minHeight||!permitted(item)){rejected++;continue}const r=await fetch(item.url,{redirect:"follow"});if(!r.ok){rejected++;continue}const type=r.headers.get("content-type")||"";if(!type.startsWith("image/")){rejected++;continue}const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length<80_000){rejected++;continue}const hash=sha(bytes);if(seen.has(hash)){rejected++;continue}seen.add(hash);const name=`${hash.slice(0,20)}.${ext(type)}`,path=`${category}/${subcategory}/${name}`;await upload(path,bytes,type);const meta={world:"electric",category,subcategory,query,source:item.source||item.url,sourceUrl:item.url,license:item.license||"",title:item.title||"",width:item.width,height:item.height,sha256:hash,collectedAt:new Date().toISOString()};await upload(path.replace(/\.[^.]+$/,".json"),Buffer.from(JSON.stringify(meta,null,2)),"application/json");accepted++;console.log("+",path)}catch(e){rejected++;console.error("skip",e.message)}}}}
console.log(JSON.stringify({accepted,rejected,bucket},null,2));
