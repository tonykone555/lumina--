import {NextRequest,NextResponse} from "next/server";
import {requireYnotAdmin,adminErrorStatus} from "@/lib/ynot/admin-server";

export const runtime="nodejs";

function clean(s:any){return String(s||"").replace(/\s+/g," ").trim()}
function money(v:any){const n=Number(String(v||"").replace(/[^0-9.,]/g,"").replace(",","."));return Number.isFinite(n)?n:null}
function uniq<T>(xs:T[],key:(x:T)=>string){const seen=new Set<string>();return xs.filter(x=>{const k=key(x);if(!k||seen.has(k))return false;seen.add(k);return true})}

function parseJsonLd(html:string){
 const out:any[]=[];
 const rx=/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;let m:RegExpExecArray|null;
 while((m=rx.exec(html))){
  try{
   const raw=JSON.parse(m[1]);const nodes=Array.isArray(raw)?raw:[raw];
   const walk=(x:any)=>{if(!x||typeof x!=="object")return;if(Array.isArray(x)){x.forEach(walk);return}if(x["@type"]==="Product"){const offer=Array.isArray(x.offers)?x.offers[0]:x.offers||{};const image=Array.isArray(x.image)?x.image[0]:x.image;out.push({id:clean(x.sku||x.productID||x.url),product_id:clean(x.sku||x.productID||x.url),title:clean(x.name),brand:clean(x.brand?.name||x.brand||"Etsy seller"),description:clean(x.description),price:money(offer.price),currency:clean(offer.priceCurrency||"EUR"),image_url:clean(image),image:clean(image),url:clean(x.url),source:"etsy",marketplace:"etsy",supplierOfferCount:1,etsy:true})}Object.values(x).forEach(walk)};nodes.forEach(walk)
  }catch{}
 }
 return out;
}

function parseFallback(html:string){
 const out:any[]=[];const rx=/href=["'](https:\/\/www\.etsy\.com\/listing\/\d+\/[^"']+)["'][\s\S]{0,1800}?<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*[\s\S]{0,800}?(?:title=["']([^"']+)["']|alt=["']([^"']+)["'])/gi;let m:RegExpExecArray|null;
 while((m=rx.exec(html))){const url=clean(m[1]),image=clean(m[2]),title=clean(m[3]||m[4]);if(title&&image)out.push({id:url,product_id:url,title,brand:"Etsy seller",price:null,currency:"EUR",image_url:image,image,url,source:"etsy",marketplace:"etsy",supplierOfferCount:1,etsy:true})}
 return out;
}

export async function GET(req:NextRequest){
 try{
  await requireYnotAdmin(req);
  const q=clean(req.nextUrl.searchParams.get("q")||req.nextUrl.searchParams.get("query"));const page=Math.max(1,Math.min(20,Number(req.nextUrl.searchParams.get("page")||1)||1));
  if(q.length<2)return NextResponse.json({error:"QUERY_REQUIRED"},{status:400});
  const url=`https://www.etsy.com/search?q=${encodeURIComponent(q)}&page=${page}`;
  const r=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36","Accept-Language":"en-US,en;q=0.9"},cache:"no-store",redirect:"follow",signal:AbortSignal.timeout(30000)});
  if(!r.ok)return NextResponse.json({error:`ETSY_SEARCH_${r.status}`},{status:502});
  const html=await r.text();const products=uniq([...parseJsonLd(html),...parseFallback(html)],x=>String(x.url||x.id)).slice(0,48);
  return NextResponse.json({ok:true,provider:"etsy",query:q,page,products,hasNextPage:products.length>=18,sourceUrl:url});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"ETSY_SEARCH_FAILED"},{status:adminErrorStatus(e)})}
}
