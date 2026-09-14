import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";

type Variant={id?:string;label?:string;url?:string;available?:boolean;price?:number|null;currency?:string;image?:string};
type Product={id?:string;variantId?:string;title?:string;brand?:string;url?:string;source?:string;variants?:Variant[];images?:string[];image?:string;currency?:string};
function exactEnough(url?:string){if(!url)return false;try{const u=new URL(url);const p=u.pathname.replace(/\/+$/,'');if(u.protocol!=="https:"||p.length<=1)return false;return /\/products?\//i.test(p)||u.searchParams.has("variant")||/\/product\//i.test(p)}catch{return false}}
function normalize(url?:string){if(!url)return'';try{const u=new URL(url);u.hash='';return u.toString()}catch{return''}}
function bestLocal(product:Product){const variants=product.variants||[];const chosen=product.variantId?variants.find(v=>String(v.id||'')===String(product.variantId)):undefined;const candidates=[chosen?.url,...variants.filter(v=>v.available!==false).map(v=>v.url),product.url].map(normalize).filter(Boolean);return candidates.find(exactEnough)||''}
function clean(s:string){return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function priceOf(v:any,fallback:any){const raw=v?.price||fallback;if(raw==null)return null;if(typeof raw==='number')return raw;if(typeof raw?.amount==='number')return Number(raw.amount)/100;if(typeof raw?.amount==='string'){const n=Number(raw.amount);return Number.isFinite(n)?n/100:null}const n=Number(raw);return Number.isFinite(n)?n:null}

export async function POST(req:NextRequest){
 try{
  const product=await req.json() as Product;
  if(!product.title&&!product.id)return NextResponse.json({error:'PRODUCT_IDENTITY_REQUIRED'},{status:400});
  const payload={jsonrpc:'2.0',method:'tools/call',id:1,params:{name:'search_catalog',arguments:{meta:{'ucp-agent':{profile:'https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json'}},catalog:{query:product.title||String(product.id||''),filters:{available:true},pagination:{limit:16}}}}};
  const response=await fetch('https://catalog.shopify.com/api/ucp/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store',signal:AbortSignal.timeout(8000)});
  const raw:any=await response.json();const products:any[]=raw?.result?.structuredContent?.products||[];
  const wantedId=String(product.id||''),wantedTitle=clean(product.title||'');
  const match=products.find(p=>String(p?.id||'')===wantedId)||products.find(p=>clean(p?.title||'')===wantedTitle)||products.find(p=>wantedTitle&&(clean(p?.title||'').includes(wantedTitle)||wantedTitle.includes(clean(p?.title||''))));
  if(!match){const local=bestLocal(product);return local?NextResponse.json({url:local,exact:true,source:'catalog',product:{...product,url:local}}):NextResponse.json({error:'EXACT_PRODUCT_NOT_FOUND'},{status:404})}
  const media=[...new Set<string>((match?.media||[]).filter((m:any)=>m?.type==='image'||m?.url).map((m:any)=>m?.url).filter(Boolean))];
  const fallbackPrice=match?.price_range?.min||match?.variants?.[0]?.price;
  const variants=(match?.variants||[]).map((v:any)=>({id:String(v?.id||v?.variant_id||''),label:String(v?.title||v?.name||(v?.selected_options||[]).map((o:any)=>o?.value).filter(Boolean).join(' · ')||'Option'),price:priceOf(v,fallbackPrice),currency:String(v?.price?.currency||fallbackPrice?.currency||product.currency||'EUR'),image:v?.image?.url||v?.media?.[0]?.url||media[0]||product.image||'',url:normalize(v?.url||''),available:v?.available!==false&&v?.availability!=='out_of_stock'})).filter((v:any)=>v.id);
  const chosen=product.variantId?variants.find((v:any)=>String(v.id)===String(product.variantId)):undefined;
  const candidates=[chosen?.url,...variants.filter((v:any)=>v.available!==false).map((v:any)=>v.url),match?.url,match?.online_store_url,match?.product_url].map(normalize).filter(Boolean);
  const exact=candidates.find(exactEnough)||candidates.find(u=>{try{return new URL(u).pathname.replace(/\/+$/,'').length>1}catch{return false}});
  if(!exact)return NextResponse.json({error:'EXACT_PRODUCT_URL_UNAVAILABLE'},{status:404});
  const gallery=[...new Set<string>([...media,...variants.map((v:any)=>v.image).filter(Boolean),product.image].filter(Boolean) as string[])].slice(0,12);
  return NextResponse.json({url:exact,exact:true,source:'shopify-catalog',productId:String(match?.id||product.id||''),variantId:String(chosen?.id||product.variantId||''),product:{...product,id:String(match?.id||product.id||''),title:String(match?.title||product.title||''),url:exact,image:gallery[0]||product.image,images:gallery,variants}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'PRODUCT_LINK_FAILED'},{status:400})}
}
