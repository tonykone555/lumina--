import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
const BASE="https://catalog.shopify.com/api/ucp/mcp";
const profile="https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json";
async function call(name:string,catalog:any){const response=await fetch(BASE,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",method:"tools/call",id:1,params:{name,arguments:{meta:{"ucp-agent":{profile}},catalog}}}),signal:AbortSignal.timeout(18000),cache:"no-store"});if(!response.ok)throw new Error(name+" HTTP "+response.status);const j=await response.json();return j?.result?.structuredContent||{};}
const url=(x:any)=>typeof x==="string"?x:String(x?.url||x?.src||"");
function photos(p:any){const result:any[]=[...(p?.media||[]),...(p?.images||[]),...(p?.variants||[]).flatMap((v:any)=>[...(v.media||[]),...(v.images||[])])];return [...new Set(result.filter(x=>!x?.type||x.type==="image").map(url).filter(x=>/^https:\/\//.test(x)))];}
function esc(x:any){const s=String(x??"").replace(/^[=+@-]/,"'$&");return '"'+s.replace(/"/g,'""')+'"';}
export async function GET(req:NextRequest){
 const term=(req.nextUrl.searchParams.get("q")||"coffee machine").slice(0,100);
 const limit=Math.min(100,Math.max(1,Number(req.nextUrl.searchParams.get("limit")||20)));
 const scan=Math.min(180,Math.max(10,Number(req.nextUrl.searchParams.get("scan")||90)));
 try {
 const found=await call("search_catalog",{query:term,filters:{available:true,ships_to:{country:"CH"}},context:{address_country:"CH",language:"fr-CH",currency:"CHF",intent:term},pagination:{limit:scan}});
 const matches=(found.products||[]).map((p:any)=>({id:String(p?.id||""),image:url(p?.image)})).filter((p:any)=>p.id.startsWith("gid://shopify/"));
 let index=0;const qualified:any[]=[];let checked=0;
 const workers=Array.from({length:Math.min(12,matches.length)},async()=>{while(index<matches.length&&qualified.length<limit){const next=matches[index++];try{const data=await call("get_product",{id:next.id,context:{address_country:"CH",language:"fr-CH",currency:"CHF"}});const p=data.product||{};checked++;const imgs=photos(p);if(imgs.length<5)continue;const v=(p.variants||[]).find((v:any)=>v.availability?.available!==false)||p.variants?.[0]||{};qualified.push({id:next.id,title:p.title||"",description:String(p.description?.plain||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").slice(0,500),seller:v.seller?.name||"",price:v.price?.amount!=null?Number(v.price.amount)/100:"",currency:v.price?.currency||"CHF",product_url:v.url||"",image_count:imgs.length,images:imgs.slice(0,10),source:"Shopify Global Catalog (full get_product)",photo_rights_verified:"NO",shipping_ch_verified:"CHECK",variant_match_verified:"CHECK"});}catch{}}});
 await Promise.all(workers);qualified.sort((a,b)=>b.image_count-a.image_count);
 const format=req.nextUrl.searchParams.get("format")||"json";
 if(format==="csv"){const head=["id","title","description","seller","price","currency","product_url","image_count",...Array.from({length:10},(_,i)=>"image_"+(i+1)),"source","photo_rights_verified","shipping_ch_verified","variant_match_verified"];const lines=[head,...qualified.slice(0,limit).map(p=>[p.id,p.title,p.description,p.seller,p.price,p.currency,p.product_url,p.image_count,...Array.from({length:10},(_,i)=>p.images[i]||""),p.source,p.photo_rights_verified,p.shipping_ch_verified,p.variant_match_verified])].map(row=>row.map(esc).join(","));return new NextResponse("\uFEFF"+lines.join("\r\n"),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="YNOT-Ricardo-five-photo-'+term.replace(/[^a-z0-9]+/gi,"-")+'.csv"',"Cache-Control":"no-store"}})}
 return NextResponse.json({query:term,scanned:matches.length,checked,qualified:qualified.length,products:qualified.slice(0,limit)},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({error:String(e)},{status:502})}
}