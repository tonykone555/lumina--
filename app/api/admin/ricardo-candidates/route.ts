import { NextRequest, NextResponse } from "next/server";
import { listCatalogProducts } from "@/lib/commerce/catalog-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TERMS = /(?:vacuum|hoover|robot|clean|steam|garden|lawn|blower|trimmer|tiller|cultivat|pressure wash|cordless|electric|coffee|espresso|froth|grinder|kitchen|cooker|blender|toaster|air fryer|grill|mixer|pasta|waffle|lamp|light|home|decor|pet|dog|cat|animal|bird|aquarium|solar)/i;
const CATEGORIES = new Set(["home","kitchen","cleaning","appliances","pets","outdoors","garden","tools","tech"]);
const escapeCell = (value:unknown) => {
  const s=String(value??"").replace(/^([=+@-])/,"'$1");
  return '"'+s.replace(/"/g,'""')+'"';
};
function gallery(value:unknown):string[]{
  const raw=Array.isArray(value)?value:typeof value==="string"?(()=>{try{return JSON.parse(value)}catch{return []}})():[];
  const urls=raw.flatMap((x:unknown)=>typeof x==="string"?[x]:x&&typeof x==="object"?[String((x as {url?:string}).url||"")]:[]);
  return [...new Set(urls.filter(u=>/^https:\/\//i.test(u)))];
}
export async function GET(req:NextRequest) {
  // Supplier costs and inventory information must not be exposed by a public route.
  const token=process.env.YNOT_MCP_TOKEN;
  if(!token||req.headers.get("authorization")!==`Bearer ${token}`)return NextResponse.json({error:"Unauthorized"},{status:401});
  const minImages=Math.max(3,Math.min(10,Number(req.nextUrl.searchParams.get("minImages")||3)));
  const limit=Math.max(1,Math.min(100,Number(req.nextUrl.searchParams.get("limit")||100)));
  const format=req.nextUrl.searchParams.get("format")==="json"?"json":"csv";
  try {
    const source=await listCatalogProducts(10000);
    const selected=source.map((p:any)=>{
      const images=gallery(p.image_urls);
      return {id:String(p.ynot_id||""),title:String(p.title||""),brand:String(p.source_brand||p.brand||""),category:String(p.category||""),country:String(p.country||""),price:p.ynot_price,currency:p.currency,source_url:p.best_source_url,source_product_id:p.source_product_id,images,image_count:images.length,keywords:Array.isArray(p.intent_tags)?p.intent_tags:[],shipping_to_ch_verified:false,photo_rights_verified:false,ricardo_publish_approved:false};
    }).filter(p=>p.id&&p.title&&p.image_count>=minImages&&(CATEGORIES.has(p.category)||TERMS.test(p.title))).sort((a,b)=>b.image_count-a.image_count).slice(0,limit);
    const headers=["ynot_id","title","brand","category","country","ynot_price","currency","image_count","image_1","image_2","image_3","image_4","image_5","image_6","image_7","image_8","source_product_url","source_product_id","search_keywords","shipping_to_ch_verified","photo_rights_verified","ricardo_publish_approved"];
    const records=selected.map(p=>[p.id,p.title,p.brand,p.category,p.country,p.price,p.currency,p.image_count,...Array.from({length:8},(_,i)=>p.images[i]||""),p.source_url,p.source_product_id,p.keywords.join(", "),false,false,false]);
    if(format==="json")return NextResponse.json({count:selected.length,minimum_images:minImages,source:"ynot_catalog_products",products:selected},{headers:{"Cache-Control":"no-store"}});
    const csv=[headers,...records].map(r=>r.map(escapeCell).join(",")).join("\r\n");
    return new NextResponse("\uFEFF"+csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="ynot-ricardo-multi-image-candidates.csv"',"Cache-Control":"no-store"}});
  }catch(err){console.error("Ricardo export failed",err);return NextResponse.json({error:"Catalogue export unavailable"},{status:503})}
}
