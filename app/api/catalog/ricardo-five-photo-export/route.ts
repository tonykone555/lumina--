import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
const queries=["robot vacuum cleaner","cordless garden tools","electric pressure washer","espresso machine","coffee grinder","blender food processor","air fryer","electric kettle","automatic pet feeder","cat furniture","ceiling pendant light","outdoor solar lights","steam cleaner","kitchen mixer","cordless leaf blower"];
const esc=(v:any)=>{const s=String(v??"").replace(/^[=+@-]/,"'$&");return '"'+s.replace(/"/g,'""')+'"'};
export async function GET(req:NextRequest){
 const origin=req.nextUrl.origin;
 const take=Math.max(1,Math.min(100,Number(req.nextUrl.searchParams.get("limit")||100)));
 const result=await Promise.allSettled(queries.map(async(query)=>{
  const u=new URL("/api/catalog/shopify-five-photo",origin);
  u.searchParams.set("q",query);u.searchParams.set("scan","28");u.searchParams.set("limit","14");
  const r=await fetch(u.toString(),{cache:"no-store",signal:AbortSignal.timeout(48000)});if(!r.ok)throw Error(query+" "+r.status);
  const j=await r.json();return{query,products:j.products||[],checked:j.checked||0};
 }));
 const rows:any[]=[];const seen=new Set<string>();const status:any[]=[];
 for(let i=0;i<result.length;i++){const r=result[i];if(r.status==="rejected"){status.push({query:queries[i],error:String(r.reason)});continue}
  status.push({query:queries[i],returned:r.value.products.length,checked:r.value.checked});
  for(const p of r.value.products){if(seen.has(p.id)||p.image_count<5)continue;seen.add(p.id);rows.push({...p,category_query:r.value.query});}
 }
 const chosen=rows.slice(0,take);
 const headers=["id","category_search","title","description","supplier","supplier_price","currency","supplier_product_url","photo_count",...Array.from({length:10},(_,i)=>"photo_"+(i+1)),"photo_rights_verified","swiss_shipping_verified","variant_match_verified","ricardo_publish_approved"];
 const entries=chosen.map(p=>[p.id,p.category_query,p.title,p.description,p.seller,p.price,p.currency,p.product_url,p.image_count,...Array.from({length:10},(_,i)=>p.images[i]||""),"NO","CHECK","CHECK","NO"]);
 const csv="\uFEFF"+[headers,...entries].map(row=>row.map(esc).join(",")).join("\r\n");
 if(req.nextUrl.searchParams.get("format")==="json")return NextResponse.json({count:chosen.length,total_qualified:rows.length,minimum_photos:5,categories:status,products:chosen},{headers:{"Cache-Control":"no-store"}});
 return new NextResponse(csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="YNOT_Ricardo_100_with_5_plus_images.csv"',"Cache-Control":"no-store","X-Qualified-Count":String(chosen.length)}});
}