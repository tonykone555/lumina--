import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";
const cache=new Map<string,{description:string;at:number}>();
const TTL=1000*60*60*24*7;
function text(html:string){return html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<br\s*\/?>/gi,"\n").replace(/<\/p>/gi,"\n\n").replace(/<\/li>/gi,"\n").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/[ \t]+/g," ").replace(/\n\s+/g,"\n").replace(/\n{3,}/g,"\n\n").trim()}
function candidates(html:string){
 const out:string[]=[];
 for(const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const raw=JSON.parse(m[1]);const walk=(v:any)=>{if(!v)return;if(Array.isArray(v))return v.forEach(walk);if(typeof v==="object"){if((v["@type"]==="Product"||v["@type"]?.includes?.("Product"))&&v.description)out.push(text(String(v.description)));Object.values(v).forEach(walk)}};walk(raw)}catch{}}
 for(const re of [/<meta[^>]+(?:property|name)=["'](?:og:description|description)["'][^>]+content=["']([^"']+)["'][^>]*>/gi,/<(?:div|section)[^>]+(?:id|class)=["'][^"']*(?:product[^"']*description|description[^"']*product|product-description|product__description|rte)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/gi])for(const m of html.matchAll(re))out.push(text(m[1]));
 return out.filter(v=>v.length>40).sort((a,b)=>b.length-a.length);
}
function safe(url:string){try{const u=new URL(url);if(u.protocol!=="https:"&&u.protocol!=="http:")return null;const h=u.hostname.toLowerCase();if(h==="localhost"||h.endsWith(".local")||/^127\.|^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(h))return null;return u}catch{return null}}
export async function POST(req:NextRequest){
 try{
  const body=await req.json(),u=safe(String(body?.url||""));if(!u)return NextResponse.json({error:"INVALID_MERCHANT_URL"},{status:400});
  const key=u.origin+u.pathname;const hit=cache.get(key);if(hit&&Date.now()-hit.at<TTL)return NextResponse.json({description:hit.description,cached:true});
  const response=await fetch(u,{headers:{"User-Agent":"Mozilla/5.0 (compatible; YNOTProductEnricher/1.0)","Accept":"text/html,application/xhtml+xml"},redirect:"follow",cache:"no-store",signal:AbortSignal.timeout(6500)});
  if(!response.ok)return NextResponse.json({error:"MERCHANT_FETCH_FAILED"},{status:502});
  const type=response.headers.get("content-type")||"";if(!type.includes("text/html"))return NextResponse.json({error:"MERCHANT_NOT_HTML"},{status:422});
  const html=(await response.text()).slice(0,2500000),best=candidates(html)[0]||"";
  if(!best)return NextResponse.json({description:"",found:false});
  cache.set(key,{description:best,at:Date.now()});return NextResponse.json({description:best,found:true});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"ENRICH_FAILED"},{status:500})}
}
