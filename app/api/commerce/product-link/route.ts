import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";

type Variant={id?:string;label?:string;url?:string;available?:boolean;price?:number|null;currency?:string;image?:string};
type Product={id?:string;variantId?:string;title?:string;brand?:string;url?:string;source?:string;variants?:Variant[];images?:string[];image?:string;currency?:string;description?:string;price?:number|null;supplierPrice?:number;retailPrice?:number;pricingMode?:string;sourceProductId?:string;sourceVariantId?:string;merchantUrl?:string};
function exactEnough(url?:string){if(!url)return false;try{const u=new URL(url);const p=u.pathname.replace(/\/+$/,'');if(u.protocol!=="https:"||p.length<=1)return false;return /\/products?\//i.test(p)||u.searchParams.has("variant")||/\/product\//i.test(p)}catch{return false}}
function normalize(url?:string){if(!url)return'';try{const u=new URL(url);u.hash='';return u.toString()}catch{return''}}
function bestLocal(product:Product){const variants=product.variants||[];const chosen=product.variantId?variants.find(v=>String(v.id||'')===String(product.variantId)):undefined;const candidates=[chosen?.url,...variants.filter(v=>v.available!==false).map(v=>v.url),product.url].map(normalize).filter(Boolean);return candidates.find(exactEnough)||''}
function clean(s:string){return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function priceOf(v:any,fallback:any){const raw=v?.price||fallback;if(raw==null)return null;if(typeof raw==='number')return raw;if(typeof raw?.amount==='number')return Number(raw.amount)/100;if(typeof raw?.amount==='string'){const n=Number(raw.amount);return Number.isFinite(n)?n/100:null}const n=Number(raw);return Number.isFinite(n)?n:null}
function stripHtml(value:any):string{if(value&&typeof value==='object')return stripHtml(value.html??value.plain??value.text??value.value);return String(value||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g,' ').trim()}
function mediaUrl(m:any){return normalize(m?.url||m?.image?.url||m?.previewImage?.url||m?.preview_image?.url||m?.src||m?.originalSource?.url||'')}
const profile='https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json';
async function callCatalog(name:string,catalog:Record<string,unknown>){const payload={jsonrpc:'2.0',method:'tools/call',id:1,params:{name,arguments:{meta:{'ucp-agent':{profile}},catalog}}};const response=await fetch('https://catalog.shopify.com/api/ucp/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store',signal:AbortSignal.timeout(8000)});const raw:any=await response.json();if(!response.ok||raw?.error)throw new Error(raw?.error?.message||`SHOPIFY_${name.toUpperCase()}_FAILED`);return raw?.result?.structuredContent||{}}

export async function POST(req:NextRequest){
 try{
  const product=await req.json() as Product;
  if(!product.title&&!product.id)return NextResponse.json({error:'PRODUCT_IDENTITY_REQUIRED'},{status:400});
  let detail:any=null;
  const exactCatalogId=String(product.sourceVariantId||product.sourceProductId||product.variantId||product.id||'');
  if(exactCatalogId){try{const content=await callCatalog('get_product',{id:exactCatalogId});detail=content?.product||null}catch{}}
  let products:any[]=[];
  if(!detail){try{const lookupId=String(product.sourceVariantId||product.sourceProductId||product.variantId||product.id||product.merchantUrl||product.url||'');const content=await callCatalog('lookup_catalog',{ids:[lookupId]});products=content?.products||[];detail=products[0]||null}catch{}}
  if(!detail){const content=await callCatalog('search_catalog',{query:product.title||String(product.id||''),filters:{available:true},pagination:{limit:16}});products=content?.products||[]}
  const wantedId=String(product.id||''),wantedTitle=clean(product.title||'');
  const match=detail||products.find(p=>String(p?.id||'')===wantedId)||products.find(p=>clean(p?.title||'')===wantedTitle)||products.find(p=>wantedTitle&&(clean(p?.title||'').includes(wantedTitle)||wantedTitle.includes(clean(p?.title||''))));
  if(!match){const local=bestLocal(product);return local?NextResponse.json({url:local,exact:true,source:'catalog',product:{...product,url:local,description:product.description||''}}):NextResponse.json({error:'EXACT_PRODUCT_NOT_FOUND'},{status:404})}
  const media=[...new Set<string>((match?.media||[]).map(mediaUrl).filter(Boolean))];
  const fallbackPrice=match?.price_range?.min||match?.variants?.[0]?.price;
  const variants=(match?.variants||[]).map((v:any)=>({id:String(v?.id||v?.variant_id||''),label:String(v?.title||v?.name||(v?.selected_options||[]).map((o:any)=>o?.value).filter(Boolean).join(' · ')||'Option'),price:priceOf(v,fallbackPrice),currency:String(v?.price?.currency||fallbackPrice?.currency||product.currency||'EUR'),image:mediaUrl(v?.image)||mediaUrl(v?.media?.[0])||media[0]||product.image||'',url:normalize(v?.url||''),available:v?.available!==false&&v?.availability!=='out_of_stock'})).filter((v:any)=>v.id);
  const chosen=product.variantId?variants.find((v:any)=>String(v.id)===String(product.variantId)):undefined;
  const candidates=[chosen?.url,...variants.filter((v:any)=>v.available!==false).map((v:any)=>v.url),match?.url,match?.online_store_url,match?.product_url].map(normalize).filter(Boolean);
  const exact=candidates.find(exactEnough)||candidates.find(u=>{try{return new URL(u).pathname.replace(/\/+$/,'').length>1}catch{return false}});
  if(!exact)return NextResponse.json({error:'EXACT_PRODUCT_URL_UNAVAILABLE'},{status:404});
  const gallery=[...new Set<string>([...media,...variants.map((v:any)=>v.image).filter(Boolean),...(product.images||[]),product.image].filter(Boolean) as string[])];
  const title=String(match?.title||product.title||'');
  const description=stripHtml(match?.description)||stripHtml(match?.descriptionHtml)||stripHtml(match?.description_html)||stripHtml(match?.body_html)||stripHtml(product.description)||`${title} from ${product.brand||'the original Shopify merchant'}. Full merchant details are available on the original product page.`;
  return NextResponse.json({url:exact,exact:true,source:'shopify-catalog',productId:String(match?.id||product.id||''),variantId:String(chosen?.id||product.variantId||''),product:{...product,id:String(match?.id||product.id||''),title,url:exact,image:gallery[0]||product.image,images:gallery,variants,description,descriptionHydrated:true,supplierPrice:product.supplierPrice??product.price,retailPrice:product.retailPrice,pricingMode:product.pricingMode||'ynot-retail'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'PRODUCT_LINK_FAILED'},{status:400})}
}
