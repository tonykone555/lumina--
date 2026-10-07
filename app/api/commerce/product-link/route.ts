import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";

type Variant={id?:string;label?:string;url?:string;available?:boolean;price?:number|null;currency?:string;image?:string;images?:string[];videos?:string[]};
type Product={id?:string;catalogId?:string;shopifyCatalogId?:string;variantId?:string;title?:string;brand?:string;url?:string;source?:string;variants?:Variant[];images?:string[];image?:string;videos?:string[];tags?:string[];currency?:string;description?:string;price?:number|null;supplierPrice?:number;retailPrice?:number;pricingMode?:string};
function exactEnough(url?:string){if(!url)return false;try{const u=new URL(url);const p=u.pathname.replace(/\/+$/,'');if(u.protocol!=="https:"||p.length<=1)return false;return /\/products?\//i.test(p)||u.searchParams.has("variant")||/\/product\//i.test(p)}catch{return false}}
function normalize(url?:string){if(!url)return'';try{const u=new URL(url);u.hash='';return u.toString()}catch{return''}}
function bestLocal(product:Product){const variants=product.variants||[];const chosen=product.variantId?variants.find(v=>String(v.id||'')===String(product.variantId)):undefined;const candidates=[chosen?.url,...variants.filter(v=>v.available!==false).map(v=>v.url),product.url].map(normalize).filter(Boolean);return candidates.find(exactEnough)||''}
function clean(s:string){return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function priceOf(v:any,fallback:any){const raw=v?.price||fallback;if(raw==null)return null;if(typeof raw==='number')return raw;if(typeof raw?.amount==='number')return Number(raw.amount)/100;if(typeof raw?.amount==='string'){const n=Number(raw.amount);return Number.isFinite(n)?n/100:null}const n=Number(raw);return Number.isFinite(n)?n:null}
function structuredText(value:any,depth=0):string{
 if(value==null||depth>5)return'';
 if(typeof value==='string'||typeof value==='number')return String(value);
 if(Array.isArray(value))return value.map(v=>structuredText(v,depth+1)).filter(Boolean).join(' ');
 if(typeof value==='object'){
  for(const key of ['html','plain','text','value','description','body','content']){
   const out=structuredText(value?.[key],depth+1);if(out)return out;
  }
  return Object.values(value).map(v=>structuredText(v,depth+1)).filter(Boolean).join(' ');
 }
 return'';
}
function stripHtml(value:any):string{return structuredText(value).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g,' ').trim()}

function mediaUrl(m:any){return normalize(typeof m==='string'?m:(m?.url||m?.image?.url||m?.previewImage?.url||m?.preview_image?.url||m?.src||m?.originalSource?.url||m?.sources?.[0]?.url||''))}
function mediaKind(m:any){return String(m?.media_type||m?.type||m?.content_type||m?.mime_type||m?.kind||'').toLowerCase()}
function mediaIdentity(url:string){try{const u=new URL(url);return (u.hostname+u.pathname).toLowerCase().replace(/\/(?:width|height|w|h)[_-]?\d+/g,"")}catch{return url.toLowerCase()}}
const uniqMedia=(...values:any[])=>{
 const out:string[]=[];const seen=new Set<string>();
 for(const url of values.flat(Infinity).map(mediaUrl).filter(Boolean)){
  const key=mediaIdentity(url);if(seen.has(key))continue;seen.add(key);out.push(url);
 }
 return out;
};
function videoMedia(values:any[]){return uniqMedia(values.filter((m:any)=>/video|external_video/.test(mediaKind(m))||/\\.(mp4|webm|mov)(?:\\?|$)/i.test(mediaUrl(m))))}
function imageMedia(values:any[]){return uniqMedia(values.filter((m:any)=>!/video|external_video/.test(mediaKind(m))&&!/\\.(mp4|webm|mov)(?:\\?|$)/i.test(mediaUrl(m))))}
function absoluteUrl(value:string,base:string){try{return new URL(value,base).toString()}catch{return''}}
function flattenJsonLd(value:any):any[]{
 if(Array.isArray(value))return value.flatMap(flattenJsonLd);
 if(!value||typeof value!=='object')return[];
 const graph=Array.isArray(value['@graph'])?value['@graph'].flatMap(flattenJsonLd):[];
 return [value,...graph];
}
async function merchantPageProductData(url:string,title:string){
 try{
  const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (compatible; YNOTCommerce/1.0)','Accept':'text/html,application/xhtml+xml'},cache:'no-store',redirect:'follow',signal:AbortSignal.timeout(9000)});
  if(!response.ok)return{images:[] as string[],description:''};
  const html=(await response.text()).slice(0,2500000);
  const records:any[]=[];
  const re=/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match:RegExpExecArray|null;
  while((match=re.exec(html))){
   try{records.push(...flattenJsonLd(JSON.parse(match[1]))) }catch{}
  }
  const norm=(s:any)=>clean(String(s||''));
  const wanted=norm(title);
  const products=records.filter(x=>{
   const type=x?.['@type'];return Array.isArray(type)?type.some((t:any)=>String(t).toLowerCase()==='product'):String(type||'').toLowerCase()==='product';
  });
  const chosen=products.find(x=>norm(x?.name)===wanted)||products.find(x=>wanted&&(norm(x?.name).includes(wanted)||wanted.includes(norm(x?.name))))||products[0]||null;
  const imageValues=chosen?.image;
  const jsonImages=uniqMedia(Array.isArray(imageValues)?imageValues:[imageValues]);
  const metaImages=[...html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]+content=["']([^"']+)["'][^>]*>/gi)].map(m=>absoluteUrl(m[1],url));
  const reversed=[...html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*>/gi)].map(m=>absoluteUrl(m[1],url));
  const images=uniqMedia(jsonImages,metaImages,reversed).slice(0,20);
  const description=stripHtml(chosen?.description)||stripHtml([...html.matchAll(/<meta[^>]+(?:property|name)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["'][^>]*>/gi)][0]?.[1]);
  const brand=stripHtml(typeof chosen?.brand==="string"?chosen.brand:(chosen?.brand?.name||chosen?.manufacturer?.name||chosen?.manufacturer||""));
  const mpn=stripHtml(chosen?.mpn||chosen?.sku||chosen?.model||chosen?.productID||"");
  return{images,description,brand,mpn};
 }catch{return{images:[] as string[],description:'',brand:'',mpn:''}}
}
const profile='https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json';
async function callCatalog(name:string,catalog:Record<string,unknown>){const payload={jsonrpc:'2.0',method:'tools/call',id:1,params:{name,arguments:{meta:{'ucp-agent':{profile}},catalog}}};const response=await fetch('https://catalog.shopify.com/api/ucp/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store',signal:AbortSignal.timeout(8000)});const raw:any=await response.json();if(!response.ok||raw?.error)throw new Error(raw?.error?.message||`SHOPIFY_${name.toUpperCase()}_FAILED`);return raw?.result?.structuredContent||{}}

export async function POST(req:NextRequest){
 try{
  const product=await req.json() as Product;
  if(!product.title&&!product.id)return NextResponse.json({error:'PRODUCT_IDENTITY_REQUIRED'},{status:400});
  let detail:any=null;
  const catalogIdentity=String(product.shopifyCatalogId||product.catalogId||(/^gid:\/\/shopify\/p\//i.test(String(product.id||''))?product.id:'')||product.variantId||'');
  if(catalogIdentity){try{const content=await callCatalog('get_product',{id:catalogIdentity});detail=content?.product||null}catch{}}
  let products:any[]=[];
  if(!detail&&catalogIdentity){try{const content=await callCatalog('lookup_catalog',{ids:[catalogIdentity]});products=content?.products||[];detail=products[0]||null}catch{}}
  if(!detail){const content=await callCatalog('search_catalog',{query:product.title||String(product.id||''),filters:{available:true},pagination:{limit:16}});products=content?.products||[]}
  const wantedId=String(product.id||''),wantedTitle=clean(product.title||'');
  const match=detail||products.find(p=>String(p?.id||'')===wantedId)||products.find(p=>clean(p?.title||'')===wantedTitle)||products.find(p=>wantedTitle&&(clean(p?.title||'').includes(wantedTitle)||wantedTitle.includes(clean(p?.title||''))));
  if(!match){const local=bestLocal(product);return local?NextResponse.json({url:local,exact:true,source:'catalog',product:{...product,url:local,description:product.description||''}}):NextResponse.json({error:'EXACT_PRODUCT_NOT_FOUND'},{status:404})}
  // UCP exposes the visual gallery on product.media. Variant records primarily
  // describe purchasable option combinations; selecting an option can change
  // product.media. Query visual option values and merge those returned galleries.
  const selectedProducts:any[]=[];
  const visualOption=(match?.options||[]).find((o:any)=>/color|colour|style|finish|pattern|material/i.test(String(o?.name||'')))||(match?.options||[])[0];
  const optionValues=(visualOption?.values||[]).filter((v:any)=>v?.exists!==false).slice(0,12);
  if(match?.id&&visualOption?.name&&optionValues.length>1){
   const settled=await Promise.allSettled(optionValues.map(async(v:any)=>{
    const content=await callCatalog('get_product',{id:String(match.id),selected:[{name:String(visualOption.name),label:String(v?.label||v?.value||'')}]});
    return content?.product||null;
   }));
   for(const result of settled)if(result.status==='fulfilled'&&result.value)selectedProducts.push(result.value);
  }
  const options=(match?.options||[]).map((o:any)=>({name:String(o?.name||''),values:(o?.values||[]).filter((v:any)=>v?.exists!==false).map((v:any)=>({label:String(v?.label||v?.value||''),value:String(v?.value||v?.label||''),available:v?.available!==false&&v?.exists!==false})).filter((v:any)=>v.label)})).filter((o:any)=>o.name&&o.values.length);
  const rawMedia:any[]=[...(match?.media||[]),...(match?.images||[]),...(match?.image_urls||[]),match?.image,match?.featured_image,match?.featuredImage,...(match?.variants||[]).flatMap((v:any)=>[...(v?.media||[]),...(v?.images||[]),...(v?.image_urls||[]),v?.image,v?.featured_image,v?.featuredImage]),...selectedProducts.flatMap((p:any)=>[...(p?.media||[]),...(p?.images||[]),...(p?.image_urls||[]),p?.image,p?.featured_image,p?.featuredImage,...(p?.variants||[]).flatMap((v:any)=>[...(v?.media||[]),...(v?.images||[]),...(v?.image_urls||[]),v?.image,v?.featured_image,v?.featuredImage])])].filter(Boolean);
  const media=imageMedia(rawMedia);
  const videos=videoMedia(rawMedia);
  const fallbackPrice=match?.price_range?.min||match?.variants?.[0]?.price;
  const variants=(match?.variants||[]).map((v:any)=>{
   const vm:any[]=[...(v?.media||[]),...(v?.images||[]),...(v?.image_urls||[]),v?.image,v?.featured_image,v?.featuredImage].filter(Boolean);
   const vi=imageMedia(vm),vv=videoMedia(vm);
   return {id:String(v?.id||v?.variant_id||''),label:String(v?.title||v?.name||(v?.selected_options||[]).map((o:any)=>o?.value).filter(Boolean).join(' · ')||'Option'),price:priceOf(v,fallbackPrice),currency:String(v?.price?.currency||fallbackPrice?.currency||product.currency||'EUR'),image:vi[0]||media[0]||product.image||'',images:vi,videos:vv,url:normalize(v?.url||''),available:v?.available!==false&&v?.availability!=='out_of_stock',selectedOptions:(v?.selected_options||v?.selectedOptions||[]).map((o:any)=>({name:String(o?.name||''),value:String(o?.value||o?.label||'')})).filter((o:any)=>o.name&&o.value)}
  }).filter((v:any)=>v.id);
  // Variant prices from Shopify are merchant prices. Keep them only as supplier metadata;
  // every displayed variant inherits the immutable YNOT retail price.
  const ynotRetail=product.retailPrice??product.price;
  const ynotCurrency=product.currency||'EUR';
  for(const v of variants){(v as any).supplierPrice=v.price;(v as any).price=ynotRetail??v.price;(v as any).currency=ynotCurrency;}
  const chosen=product.variantId?variants.find((v:any)=>String(v.id)===String(product.variantId)):undefined;
  const candidates=[chosen?.url,...variants.filter((v:any)=>v.available!==false).map((v:any)=>v.url),match?.url,match?.online_store_url,match?.product_url].map(normalize).filter(Boolean);
  const exact=candidates.find(exactEnough)||candidates.find(u=>{try{return new URL(u).pathname.replace(/\/+$/,'').length>1}catch{return false}});
  if(!exact)return NextResponse.json({error:'EXACT_PRODUCT_URL_UNAVAILABLE'},{status:404});
  const merchantPage=await merchantPageProductData(exact,String(match?.title||product.title||''));
  const selectedImages=selectedProducts.flatMap((p:any)=>imageMedia([...(p?.media||[]),...(p?.images||[]),...(p?.image_urls||[]),p?.image,p?.featured_image,p?.featuredImage,...(p?.variants||[]).flatMap((v:any)=>[...(v?.media||[]),...(v?.images||[]),...(v?.image_urls||[]),v?.image,v?.featured_image,v?.featuredImage])].filter(Boolean)));
  // Keep the seller's own merchant-page gallery first, then merge every
  // image exposed by the exact matched product and its variants. Do not merge
  // the incoming broad-search product.images here because those may have come
  // from another seller/result.
  const gallery=uniqMedia(
    merchantPage.images,
    media,
    selectedImages,
    variants.map((v:any)=>v.images),
    variants.map((v:any)=>v.image),
    product.image
  ).slice(0,20);
  const allVideos=uniqMedia(videos,match?.videos,match?.video_urls,match?.media_urls,selectedProducts.map((p:any)=>[p?.videos,p?.video_urls,p?.media_urls,videoMedia([...(p?.media||[])])]),variants.map((v:any)=>v.videos),product.videos);
  const tags=[...new Set<string>([...(Array.isArray(product.tags)?product.tags:[]),...(Array.isArray(match?.tags)?match.tags:[]),...(Array.isArray(match?.product_tags)?match.product_tags:[]),...(Array.isArray(match?.intent_tags)?match.intent_tags:[]),...(Array.isArray(match?.attributes)?match.attributes.map((x:any)=>typeof x==='string'?x:(x?.value||x?.name||'')):[])].map(String).map(x=>x.trim()).filter(Boolean))];
  const rating=Number(match?.rating??match?.average_rating??match?.review_rating??match?.aggregateRating?.ratingValue??(product as any).rating)||null;
  const reviewCount=Number(match?.review_count??match?.reviews_count??match?.rating_count??match?.aggregateRating?.reviewCount??match?.aggregateRating?.ratingCount??(product as any).reviewCount)||0;
  const title=String(match?.title||product.title||'');
  const descriptionCandidates=[
   merchantPage.description,
   match?.description,match?.descriptionHtml,match?.description_html,match?.body_html,
   match?.seo?.description,match?.metafields?.description,match?.product_description,
   ...selectedProducts.flatMap((p:any)=>[p?.description,p?.descriptionHtml,p?.description_html,p?.body_html,p?.seo?.description]),
   product.description
  ].map(stripHtml).filter(Boolean);
  // Shopify can expose a short catalogue blurb alongside a much richer merchant description.
  // Keep the richest useful copy instead of accepting the first non-empty field.
  const description=descriptionCandidates.sort((a,b)=>b.length-a.length)[0]||`${title} from ${product.brand||'the original Shopify merchant'}. Full merchant details are available on the original product page.`;
  return NextResponse.json({url:exact,exact:true,source:'shopify-catalog',productId:String(match?.id||product.id||''),variantId:String(chosen?.id||product.variantId||''),product:{...product,id:String(match?.id||product.id||''),title,url:exact,image:gallery[0]||product.image,images:gallery,videos:allVideos,tags,options,variants,description,descriptionHydrated:true,brand:merchantPage.brand||product.brand,mpn:merchantPage.mpn||(product as any).mpn,supplierPrice:product.supplierPrice??product.price,retailPrice:product.retailPrice,pricingMode:product.pricingMode||'ynot-retail',rating,reviewCount}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'PRODUCT_LINK_FAILED'},{status:400})}
}
