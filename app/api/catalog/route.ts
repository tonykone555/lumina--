import {NextRequest,NextResponse} from "next/server";
import {checkoutMode} from "@/lib/commerce/checkout";
import {dynamicLuminaPrice} from "@/lib/commerce/engine";
import {searchChannel3} from "@/lib/catalog/channel3";
export const runtime="nodejs";
type P={id:string;title:string;brand:string;price:number|null;currency?:string;image:string;images?:string[];videos?:string[];url?:string;tags?:string[];source?:string;description?:string;variants?:unknown[];[k:string]:unknown};
type Intent={min?:number;max?:number;currency:string;explicitCurrency:boolean};
const CURRENCY:Record<string,string>={US:"USD",GB:"GBP",FR:"EUR",DE:"EUR",ES:"EUR",IT:"EUR",BE:"EUR",CA:"CAD",AU:"AUD"};
function structuredText(value:any,depth=0):string{
 if(value==null||depth>5)return"";
 if(typeof value==="string"||typeof value==="number")return String(value);
 if(Array.isArray(value))return value.map(v=>structuredText(v,depth+1)).filter(Boolean).join(" ");
 if(typeof value==="object"){
  for(const key of ["html","plain","text","value","description","body","content"]){
   const out=structuredText(value?.[key],depth+1);if(out)return out;
  }
  return Object.values(value).map(v=>structuredText(v,depth+1)).filter(Boolean).join(" ");
 }
 return"";
}
function clean(s:any){return structuredText(s).replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g," ").trim()}
function mediaValues(value:any,depth=0):any[]{
 if(value==null||depth>5)return[];
 if(Array.isArray(value))return value.flatMap(v=>mediaValues(v,depth+1));
 if(typeof value==="string")return[value];
 if(typeof value!=="object")return[];
 const direct=(value.url||value.src||value.image?.url||value.previewImage?.url||value.preview_image?.url||value.originalSource?.url||value.sources?.[0]?.url)?[value]:[];
 return[
  ...direct,
  ...mediaValues(value.nodes,depth+1),
  ...mediaValues(value.edges?.map?.((e:any)=>e?.node),depth+1),
  ...mediaValues(value.items,depth+1),
  ...mediaValues(value.media,depth+1),
  ...mediaValues(value.images,depth+1)
 ];
}
function stripPrice(s:string){return s.replace(/(?:under|below|less than|up to|max|over|above|more than|at least|min)\s*(?:€|eur|£|gbp|\$|usd)?\s*\d+(?:[.,]\d+)?/ig," ").replace(/\s+/g," ").trim()||s}
function intent(q:string,country:string):Intent{const l=q.toLowerCase(),upper=l.match(/(?:under|below|less than|up to|max)\s*(?:€|eur|£|gbp|\$|usd)?\s*(\d+(?:[.,]\d+)?)/),lower=l.match(/(?:over|above|more than|at least|min)\s*(?:€|eur|£|gbp|\$|usd)?\s*(\d+(?:[.,]\d+)?)/),currency=/£|gbp/.test(l)?"GBP":/\$|usd/.test(l)?"USD":/€|eur/.test(l)?"EUR":CURRENCY[country]||"EUR";return{min:lower?Number(lower[1].replace(",",".")):undefined,max:upper?Number(upper[1].replace(",",".")):undefined,currency,explicitCurrency:/€|eur|£|gbp|\$|usd/.test(l)}}
function mediaUrl(m:any){if(typeof m==="string")return m;return m?.url||m?.src||m?.image?.url||m?.previewImage?.url||m?.preview_image?.url||m?.originalSource?.url||m?.sources?.[0]?.url||""}
function mediaKind(m:any){return String(m?.media_type||m?.type||m?.content_type||m?.mime_type||m?.kind||"").toLowerCase()}
const uniq=(xs:any[])=>[...new Set<string>(xs.flat(Infinity).map(mediaUrl).filter((x):x is string=>typeof x==="string"&&/^https?:\/\//i.test(x)))];
function videoMedia(values:any[]){return uniq(values.filter((m:any)=>/video|external_video/.test(mediaKind(m))||/\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(mediaUrl(m))))}
function imageMedia(values:any[]){return uniq(values.filter((m:any)=>!/video|external_video/.test(mediaKind(m))&&!/\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(mediaUrl(m))))}
function category(p:P){const s=`${p.title} ${(p.tags||[]).join(" ")}`.toLowerCase();if(/dress|shirt|shoe|bag|jewel|apparel|clothing|hoodie|jeans/.test(s))return"fashion";if(/fitness|gym|training|running|sport|protein|creatine/.test(s))return"fitness";if(/skin|beauty|serum|cream|spf/.test(s))return"skin";if(/hair|scalp|shampoo/.test(s))return"hair";if(/home|decor|furniture|sofa|chair|table|lamp|rug|bed/.test(s))return"home";if(/tech|phone|audio|headphone|charger|gaming|smart|laptop|monitor|camera/.test(s))return"tech";return"default"}
function retail(p:P){const cost=Number(p.price);if(!Number.isFinite(cost)||cost<=0)return p;const cat=category(p);const price=dynamicLuminaPrice({sourceId:p.source||"discovery",productId:p.id,title:p.title,category:cat,price:cost,currency:p.currency||"EUR",shipping:0,stockConfidence:.75,returnPolicyScore:.7,regionMatch:.75});const variants=Array.isArray(p.variants)?p.variants.map((v:any)=>{const variantCost=Number(v?.price);if(!Number.isFinite(variantCost)||variantCost<=0)return v;const variantPrice=dynamicLuminaPrice({sourceId:p.source||"discovery",productId:String(v?.id||p.id),title:`${p.title} ${clean(v?.label||v?.title||"")}`,category:cat,price:variantCost,currency:v?.currency||p.currency||"EUR",shipping:0,stockConfidence:.75,returnPolicyScore:.7,regionMatch:.75});return{...v,supplierPrice:variantCost,retailPrice:variantPrice,price:variantPrice,pricingMode:"ynot-retail"}}):p.variants;return{...p,variants,supplierPrice:cost,retailPrice:price,price,pricingMode:"ynot-retail",checkout:checkoutMode(p)}}
function safe(list:P[],i:Intent){return list.filter(p=>p.id&&p.title&&p.image&&p.url&&p.url!=="#"&&p.price!=null).map(retail).filter(p=>(i.min==null||Number(p.price)>=i.min)&&(i.max==null||Number(p.price)<=i.max)&&(!i.explicitCurrency||!p.currency||p.currency===i.currency))}
function words(q:string){const stop=new Set(["find","show","the","and","for","with","some","something","product","products","please","want","need"]);return stripPrice(q).toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>2&&!stop.has(w))}
function key(p:P){return clean(p.title).toLowerCase().replace(/[^a-z0-9]+/g," ").trim()+"|"+clean(p.brand).toLowerCase()}
function relevance(p:P,q:string){const ws=words(q),text=`${p.title} ${p.brand} ${p.description||""} ${(p.tags||[]).join(" ")}`.toLowerCase();let n=0;for(const w of ws)if(text.includes(w))n+=10;const title=clean(p.title).toLowerCase();if(ws.length&&ws.every(w=>title.includes(w)))n+=30;return n}
function mix(shopify:P[],channel3:P[],q:string,limit=180){const seen=new Set<string>(),all=[...shopify,...channel3].filter(p=>{const k=key(p);if(!k||seen.has(k))return false;seen.add(k);return true});return all.sort((a,b)=>relevance(b,q)-relevance(a,q)).slice(0,limit)}
async function shopify(q:string,country:string,cursor?:string,limit=80){const payload={jsonrpc:"2.0",method:"tools/call",id:1,params:{name:"search_catalog",arguments:{meta:{"ucp-agent":{profile:"https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json"}},catalog:{query:stripPrice(q),filters:{available:true,ships_to:{country}},context:{address_country:country,intent:q},pagination:{limit:Math.max(12,Math.min(80,limit)),...(cursor?{cursor}:{})}}}}};let r:Response|null=null,raw:any=null,c:any=null;
 for(let attempt=0;attempt<2;attempt++){
  try{
   r=await fetch("https://catalog.shopify.com/api/ucp/mcp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store",signal:AbortSignal.timeout(12000)});
   raw=await r.json().catch(()=>null);c=raw?.result?.structuredContent;
   if(r.ok&&Array.isArray(c?.products))break;
  }catch{}
  if(attempt===0)await new Promise(resolve=>setTimeout(resolve,180));
 }
 if(!r?.ok||!Array.isArray(c?.products))throw new Error("SHOPIFY_UNAVAILABLE");const products:P[]=c.products.map((x:any)=>{const pr=x?.price_range?.min||x?.variants?.[0]?.price,rawMedia=mediaValues([x?.media,x?.images,x?.image_urls,x?.image,x?.featured_image,x?.featuredImage]),images=imageMedia(rawMedia),videos=videoMedia(rawMedia),variants=(x?.variants||[]).map((v:any)=>{const vm=mediaValues([v?.media,v?.images,v?.image_urls,v?.image,v?.featured_image,v?.featuredImage]),vi=imageMedia(vm),vv=videoMedia(vm);return{id:String(v.id||""),label:clean(v.title||v.name||"Option"),price:v?.price?Number(v.price.amount)/100:null,currency:v?.price?.currency||pr?.currency,url:v.url||v?.seller?.url||x.url,available:v.available!==false,image:vi[0]||images[0]||"",images:vi,videos:vv}});const allImages=uniq([images,variants.map((v:any)=>v.images||[]),variants.map((v:any)=>v.image||"")]);const rating=Number(x?.rating??x?.average_rating??x?.review_rating??x?.aggregateRating?.ratingValue)||null,reviewCount=Number(x?.review_count??x?.reviews_count??x?.rating_count??x?.aggregateRating?.reviewCount??x?.aggregateRating?.ratingCount)||0;return{id:String(x.id),title:clean(x.title),brand:clean(x?.seller?.name||x?.variants?.[0]?.seller?.name||"Shopify merchant"),price:pr?Number(pr.amount)/100:null,currency:pr?.currency||"USD",image:allImages[0]||images[0]||"",images:allImages.slice(0,12),videos:uniq([videos,variants.map((v:any)=>v.videos)]).slice(0,8),url:x.url||x?.variants?.[0]?.seller?.url||"#",description:clean(x.description)||clean(x.descriptionHtml),variants,tags:[],source:"shopify-global-catalog",rating,reviewCount,shipFromCountry:clean(x?.ship_from_country||x?.shipping_origin_country||x?.origin_country||x?.seller?.country||x?.merchant?.country),shipFromPostalCode:clean(x?.ship_from_postal_code||x?.shipping_origin_postal_code||x?.seller?.postal_code||x?.seller?.postalCode||x?.merchant?.postal_code||x?.merchant?.postalCode||x?.seller?.address?.postal_code||x?.seller?.address?.postalCode||x?.merchant?.address?.postal_code||x?.merchant?.address?.postalCode),shipFromCity:clean(x?.ship_from_city||x?.shipping_origin_city||x?.seller?.city||x?.merchant?.city||x?.seller?.address?.city||x?.merchant?.address?.city),shipFromState:clean(x?.ship_from_state||x?.shipping_origin_state||x?.seller?.state||x?.seller?.province||x?.merchant?.state||x?.merchant?.province||x?.seller?.address?.state||x?.seller?.address?.province||x?.merchant?.address?.state||x?.merchant?.address?.province),shippingCost:Number(x?.shipping_cost?.amount??x?.shipping?.cost?.amount??x?.shipping_price?.amount??NaN),deliveryDaysMin:Number(x?.delivery_estimate?.min_days??x?.shipping?.min_delivery_days??x?.delivery?.min_days??NaN),deliveryDaysMax:Number(x?.delivery_estimate?.max_days??x?.shipping?.max_delivery_days??x?.delivery?.max_days??NaN)}});return{products,pagination:c.pagination||{}}}
function queryVariants(q:string){
 const base=stripPrice(q).trim();
 const core=words(base).slice(0,6).join(" ");
 const variants=[
  base,
  core,
  `${core} parts`,
  `${core} accessories`,
  `${core} replacement`,
  `${core} equipment`
 ].map(x=>x.replace(/\s+/g," ").trim()).filter(Boolean);
 return [...new Set(variants)].slice(0,5);
}
async function shopifyExpanded(q:string,country:string,cursor?:string){
 const variants=cursor?[q]:queryVariants(q);
 const settled=await Promise.allSettled(variants.map((query,index)=>
  shopify(query,country,index===0?cursor:undefined)
 ));
 const successful=settled.filter((r):r is PromiseFulfilledResult<{products:P[];pagination:any}>=>r.status==="fulfilled");
 if(!successful.length)throw new Error("SHOPIFY_UNAVAILABLE");
 const products=mix(successful.flatMap(r=>r.value.products),[],q,240);
 const pagination=successful[0]?.value?.pagination||{};
 return{products,pagination};
}

async function channel3(q:string,country:string){const queries=[stripPrice(q),words(q).slice(0,5).join(" ")].filter((v,i,a)=>v&&a.indexOf(v)===i);const settled=await Promise.allSettled(queries.map(query=>searchChannel3(query,{limit:100,country})));const seen=new Set<string>();return settled.flatMap(r=>r.status==="fulfilled"?r.value:[]).filter(x=>{if(seen.has(x.id))return false;seen.add(x.id);return true}).map(x=>({...x,source:"channel3",verified:true,verifiedMerchant:true,tags:[...(x.tags||[]),"Verified"]})) as P[]}
export async function GET(req:NextRequest){const s=req.nextUrl.searchParams,base=(s.get("q")||"black dress for a wedding under 150").slice(0,300),direction=(s.get("direction")||"").slice(0,120),q=direction?`${base}, ${direction}`:base,country=(s.get("country")||"FR").toUpperCase().slice(0,2),source=s.get("source")||"all",cursor=s.get("cursor")||undefined,requestedLimit=Math.max(12,Math.min(80,Number(s.get("limit")||60))),categoryLoad=s.get("category_load")==="1",i=intent(q,country);
 if(source==="shopify"){try{const x=categoryLoad?await shopify(q,country,cursor,requestedLimit):await shopifyExpanded(q,country,cursor);return NextResponse.json({source:"shopify-global-catalog",sources:["shopify-global-catalog"],market:"lumina",luminaSource:"shopify",query:q,products:safe(x.products,i),pagination:x.pagination},{headers:{"Cache-Control":categoryLoad?"s-maxage=20, stale-while-revalidate=120":"s-maxage=10, stale-while-revalidate=60"}})}catch{return NextResponse.json({source:"shopify-global-catalog",sources:[],products:[],pagination:{has_next_page:false},error:"Shopify products are temporarily unavailable in YNOT."})}}
 if(source==="channel3"){try{const c=safe(await channel3(q,country),i);return NextResponse.json({source:"channel3",sources:c.length?["channel3"]:[],market:"lumina",luminaSource:"channel3",query:q,products:c,pagination:{has_next_page:false,channel3_count:c.length}})}catch{return NextResponse.json({source:"channel3",sources:[],products:[],pagination:{has_next_page:false},error:"Channel3 products are temporarily unavailable in YNOT."})}}
 const [sr,cr]=await Promise.allSettled([shopifyExpanded(q,country,cursor),channel3(q,country)]);const sp=safe(sr.status==="fulfilled"?sr.value.products:[],i),cp=safe(cr.status==="fulfilled"?cr.value:[],i),products=mix(sp,cp,q);return NextResponse.json({source:"ynot-multi-source",sources:[...(sp.length?["shopify-global-catalog"]:[]),...(cp.length?["channel3"]:[])],market:"lumina",luminaSource:"all",query:q,products,pagination:{...(sr.status==="fulfilled"?sr.value.pagination:{}),channel3_count:cp.length},error:products.length?undefined:"No live products found for this search yet."},{headers:{"Cache-Control":"s-maxage=20, stale-while-revalidate=90"}})}
