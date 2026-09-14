import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";

type Variant={id?:string;label?:string;url?:string;available?:boolean};
type Product={id?:string;variantId?:string;title?:string;brand?:string;url?:string;source?:string;variants?:Variant[]};
function specific(url?:string){if(!url)return false;try{const u=new URL(url);const p=u.pathname.replace(/\/+$/,'');return u.protocol==='https:'&&p.length>1&&p!=='/collections'&&p!=='/products'}catch{return false}}
function normalize(url?:string){if(!url)return'';try{const u=new URL(url);u.hash='';return u.toString()}catch{return''}}
function bestLocal(product:Product){const variants=product.variants||[];const chosen=product.variantId?variants.find(v=>String(v.id||'')===String(product.variantId)):undefined;const candidates=[chosen?.url,...variants.filter(v=>v.available!==false).map(v=>v.url),product.url].map(normalize).filter(Boolean);return candidates.find(specific)||''}
function clean(s:string){return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}

export async function POST(req:NextRequest){
 try{
  const product=await req.json() as Product;
  const local=bestLocal(product);if(local)return NextResponse.json({url:local,exact:true,source:'catalog'});
  if(!product.title)return NextResponse.json({error:'PRODUCT_TITLE_REQUIRED'},{status:400});
  const payload={jsonrpc:'2.0',method:'tools/call',id:1,params:{name:'search_catalog',arguments:{meta:{'ucp-agent':{profile:'https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json'}},catalog:{query:product.title,filters:{available:true},pagination:{limit:12}}}}};
  const response=await fetch('https://catalog.shopify.com/api/ucp/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store',signal:AbortSignal.timeout(8000)});
  const raw:any=await response.json();const products:any[]=raw?.result?.structuredContent?.products||[];
  const wantedId=String(product.id||'');const wantedTitle=clean(product.title||'');const match=products.find(p=>String(p?.id||'')===wantedId)||products.find(p=>clean(p?.title||'')===wantedTitle)||products.find(p=>clean(p?.title||'').includes(wantedTitle)||wantedTitle.includes(clean(p?.title||'')));
  if(!match)return NextResponse.json({error:'EXACT_PRODUCT_NOT_FOUND'},{status:404});
  const variants:any[]=match?.variants||[];const chosen=product.variantId?variants.find(v=>String(v?.id||v?.variant_id||'')===String(product.variantId)):undefined;
  const candidates=[chosen?.url,...variants.filter(v=>v?.available!==false&&v?.availability!=='out_of_stock').map(v=>v?.url),match?.url,match?.online_store_url,match?.product_url].map(normalize).filter(Boolean);
  const url=candidates.find(specific);if(!url)return NextResponse.json({error:'EXACT_PRODUCT_URL_UNAVAILABLE'},{status:404});
  return NextResponse.json({url,exact:true,source:'shopify-catalog',productId:String(match?.id||product.id||''),variantId:String(chosen?.id||chosen?.variant_id||product.variantId||'')});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'PRODUCT_LINK_FAILED'},{status:400})}
}
