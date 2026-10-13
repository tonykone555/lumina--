import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=120;
const PROFILE="https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json";
const Q=["robot vacuum","espresso coffee machine","air fryer","cordless garden trimmer","pressure washer","leaf blower","kitchen stand mixer","electric kettle","pet feeder","solar garden lights","blender kitchen","coffee grinder","electric lawn mower","pet grooming","floor lamp","vacuum cleaner"];
async function call(name:string,catalog:any){const r=await fetch("https://catalog.shopify.com/api/ucp/mcp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/call",params:{name,arguments:{meta:{"ucp-agent":{profile:PROFILE}},catalog}}}),signal:AbortSignal.timeout(14000),cache:"no-store"});if(!r.ok)throw Error("Shopify "+r.status);const j=await r.json();return j?.result?.structuredContent||{}}
function urls(v:any,d=0):string[]{if(d>6||v==null)return[];if(typeof v==="string")return /^https?:\/\//i.test(v)&&/\.(jpe?g|png|webp|avif)(?:[?&#]|$)/i.test(v)?[v]:[];if(Array.isArray(v))return v.flatMap(x=>urls(x,d+1));if(typeof v!=="object")return[];return ["url","src","image","images","media","image_urls","previewImage","featuredImage","featured_image","originalSource","variants","nodes","edges"].flatMap(k=>urls(v[k],d+1))}
const cell=(x:any)=>'"'+String(x??"").replace(/^([=+@-])/,"'$1").replace(/"/g,'""')+'"';
export async function GET(req:NextRequest){
  const min=Math.max(3,Math.min(8,Number(req.nextUrl.searchParams.get("min")||3)));
  const max=Math.max(1,Math.min(100,Number(req.nextUrl.searchParams.get("limit")||100)));
  const queries=req.nextUrl.searchParams.get("q")?[String(req.nextUrl.searchParams.get("q"))]:Q;
  const seen=new Set<string>();const list:any[]=[];const diagnostic:any[]=[];
  for(const q of queries){if(list.length>=max)break;try{
    const s=await call("search_catalog",{query:q,filters:{available:true,ships_to:{country:"CH"}},context:{address_country:"CH",intent:q},pagination:{limit:24}});
    const candidates=(s.products||[]).filter((p:any)=>{if(!p.id||seen.has(p.id))return false;seen.add(p.id);return true}).slice(0,24);
    let matches=0;
    for(let i=0;i<candidates.length;i+=12){if(list.length>=max)break;
      const found=await Promise.all(candidates.slice(i,i+12).map(async(p:any)=>{try{
        const d=await call("get_product",{id:p.id,context:{address_country:"CH"}});
        const x=d.product||d;
        const gallery=[...new Set(urls([x?.images,x?.media,x?.image_urls,x?.image,x?.featured_image,x?.variants]))].filter(x=>/cdn\.shopify\.com|shopifycdn|\.myshopify\.com/i.test(x));
        if(gallery.length<min)return null;
        const va=Array.isArray(x.variants)?x.variants:[];
        const site=va.map((v:any)=>v.url||v?.seller?.url).find((u:any)=>typeof u==="string"&&u.startsWith("http"))||x.url||p.url||"";
        return {id:p.id,title:x.title||p.title,brand:x.brand||p.brand||"",category:q,photoCount:gallery.length,images:gallery.slice(0,8),sellerUrl:site,variantCount:va.length,reviewStatus:"Supplier photo rights, exact variant, Swiss delivery, CHF price and Ricardo eligibility require confirmation"};
      }catch{return null}}));
      for(const x of found){if(x&&list.length<max){list.push(x);matches++}}
    }
    diagnostic.push({query:q,searched:candidates.length,qualified:matches});
  }catch(e){diagnostic.push({query:q,error:String(e)})}}
  const headers=["Shopify global product ID","Product title","Brand","Research category","Photo count","Photo 1","Photo 2","Photo 3","Photo 4","Photo 5","Photo 6","Photo 7","Photo 8","Supplier product URL","Variant count","Status"];
  const lines=[headers,...list.map(p=>[p.id,p.title,p.brand,p.category,p.photoCount,...Array.from({length:8},(_,i)=>p.images[i]||""),p.sellerUrl,p.variantCount,p.reviewStatus])];
  if(req.nextUrl.searchParams.get("format")==="json")return NextResponse.json({count:list.length,minImages:min,diagnostic,products:list},{headers:{"Cache-Control":"no-store"}});
  return new NextResponse("\uFEFF"+lines.map(row=>row.map(cell).join(",")).join("\r\n"),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="YNOT_Ricardo_Shopify_100_3plus_images.csv"',"Cache-Control":"no-store"}});
}