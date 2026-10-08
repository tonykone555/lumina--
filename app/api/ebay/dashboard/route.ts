import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function authorized(request:NextRequest){
 const secret=process.env.YNOT_MCP_TOKEN;
 return Boolean(secret&&(request.headers.get("authorization")||"")===`Bearer ${secret}`);
}
function supabase(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||"";
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
 if(!url||!key)throw new Error("SUPABASE_SERVER_NOT_CONFIGURED");
 return{url:url.replace(/\/$/,""),key};
}
async function rows(path:string){
 const {url,key}=supabase();
 const r=await fetch(`${url}/rest/v1/${path}`,{
  headers:{apikey:key,Authorization:`Bearer ${key}`,Accept:"application/json"},
  cache:"no-store"
 });
 if(!r.ok)throw new Error(`SUPABASE_${r.status}`);
 return r.json();
}
export async function GET(request:NextRequest){
 if(!authorized(request))return NextResponse.json({error:"unauthorized"},{status:401});
 try{
  const [candidates,attempts]=await Promise.all([
   rows("ynot_ebay_web_candidates?select=id,created_at,status,source_url,merchant_name,title,brand,model,condition,supplier_price,supplier_currency,estimated_ebay_price,estimated_profit,image_urls,origin_country,origin_city,origin_postal_code,discovery_notes,prepared_product_id,last_error&order=estimated_profit.desc.nullslast,created_at.desc&limit=100"),
   rows("ynot_ebay_publish_log?select=id,created_at,query,product_id,product_title,stage,status,error_class,error_code,error_message,listing_id,sku,retryable,retry_count&order=created_at.desc&limit=100")
  ]);
  return NextResponse.json({candidates,attempts});
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:"DASHBOARD_FAILED"},{status:500});
 }
}
