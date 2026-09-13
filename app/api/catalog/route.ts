import { NextRequest, NextResponse } from "next/server";
import { checkoutMode } from "@/lib/commerce/checkout";

export const runtime="nodejs";

type Product={id:string;title:string;brand:string;price:number|null;currency?:string;image:string;images?:string[];url?:string;tags?:string[];source?:string;variants?:unknown[];[key:string]:unknown};
type PriceIntent={min?:number;max?:number;currency?:string;explicitCurrency:boolean};
type LuminaSource="all"|"shopify"|"amazon";

const FASHION:Product[]=[
 {id:"demo-1",title:"Satin Slip Dress",brand:"Atelier Noire",price:129,currency:"EUR",image:"https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Satin","Elegant","Black"]},
 {id:"demo-2",title:"Draped Midi Dress",brand:"Maison Vale",price:118,currency:"EUR",image:"https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Draped","Midi","Minimal"]},
 {id:"demo-3",title:"Bias Cut Maxi",brand:"Noma Studio",price:142,currency:"EUR",image:"https://images.unsplash.com/photo-1572804013309-59a8-5ddf8a6e9d64?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Maxi","Evening","Black"]},
 {id:"demo-4",title:"Minimal Column Dress",brand:"Eloise",price:99,currency:"EUR",image:"https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Minimal","Column","Elegant"]}
];

const NICHE_FALLBACK:Record<string,Product[]>={
 fitness:[
  {id:"fit-1",title:'Vital 5” Training Shorts',brand:"Form Athletics",price:49,currency:"EUR",image:"https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Breathable","Strength","Under €80"]},
  {id:"fit-2",title:"Flex Knit Trainer",brand:"Apex",price:59,currency:"EUR",image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Stable","Lightweight","Training"]},
  {id:"fit-3",title:"Recovery Roller",brand:"Grounded",price:35,currency:"EUR",image:"https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Recovery","Mobility","Top rated"]},
  {id:"fit-4",title:"Performance Training Tee",brand:"Form Athletics",price:45,currency:"EUR",image:"https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Quick dry","Relaxed fit","Workout gear"]}
 ],
 hair:[
  {id:"hair-1",title:"Multi-Peptide Density Serum",brand:"Nourish Lab",price:19.9,currency:"EUR",image:"https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Hair density","Daily use","Lightweight"]},
  {id:"hair-2",title:"Botanical Scalp Oil",brand:"Aera",price:34,currency:"EUR",image:"https://images.unsplash.com/photo-1601049676869-702ea24cfd58?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Scalp care","Natural","Pre-wash"]},
  {id:"hair-3",title:"Repair Ritual Mask",brand:"Mizu",price:38,currency:"EUR",image:"https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Repair","Weekly treatment","Women"]},
  {id:"hair-4",title:"Root Volume Mist",brand:"Onda",price:29,currency:"EUR",image:"https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Fuller-looking","Non-greasy","Under €30"]}
 ],
 skin:[
  {id:"skin-1",title:"Mela B3 Even Tone Serum",brand:"Common Ground",price:39.9,currency:"EUR",image:"https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Uneven tone","Sensitive skin","Niacinamide"]},
  {id:"skin-2",title:"Barrier Cloud Cream",brand:"Oath",price:36,currency:"EUR",image:"https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Barrier repair","Ceramides","Gentle"]},
  {id:"skin-3",title:"Calm Milk Cleanser",brand:"Mizu",price:24,currency:"EUR",image:"https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Cleanser","Fragrance-free","Daily"]},
  {id:"skin-4",title:"Mineral SPF 40",brand:"Aera",price:34,currency:"EUR",image:"https://images.unsplash.com/photo-1575410229391-19b4da01cc94?auto=format&fit=crop&w=800&q=80",url:"#",tags:["SPF","Sensitive skin","Visible results"]}
 ],
 smile:[
  {id:"smile-1",title:"Professional Whitening Strips",brand:"Pearl",price:44.9,currency:"EUR",image:"https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Whitening","14 treatments","Enamel care"]},
  {id:"smile-2",title:"Precision Whitening Pen",brand:"Onda",price:29,currency:"EUR",image:"https://images.unsplash.com/photo-1559591937-e0c4e4ea8f28?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Pen","At home","Daily care"]},
  {id:"smile-3",title:"Gentle Bright Paste",brand:"Calm",price:16,currency:"EUR",image:"https://images.unsplash.com/photo-1628359355624-855775b5c9c4?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Sensitive teeth","Everyday care","Under €30"]},
  {id:"smile-4",title:"Sonic Care Brush",brand:"Forma",price:59,currency:"EUR",image:"https://images.unsplash.com/photo-1559591935-c6c92c6f3f4a?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Electric brush","Top rated","Smile care"]}
 ]
};

const AMAZON_DOMAINS:Record<string,string>={US:"amazon.com",GB:"amazon.co.uk",UK:"amazon.co.uk",FR:"amazon.fr",DE:"amazon.de",ES:"amazon.es",IT:"amazon.it",CA:"amazon.ca",AU:"amazon.com.au",NL:"amazon.nl",SE:"amazon.se",PL:"amazon.pl",BE:"amazon.com.be"};
const EBAY_MARKETPLACES:Record<string,string>={US:"EBAY_US",GB:"EBAY_GB",UK:"EBAY_GB",FR:"EBAY_FR",DE:"EBAY_DE",ES:"EBAY_ES",IT:"EBAY_IT",CA:"EBAY_CA",AU:"EBAY_AU",NL:"EBAY_NL",PL:"EBAY_PL",BE:"EBAY_BE"};
const DEFAULT_CURRENCY:Record<string,string>={US:"USD",GB:"GBP",UK:"GBP",FR:"EUR",DE:"EUR",ES:"EUR",IT:"EUR",CA:"CAD",AU:"AUD",NL:"EUR",PL:"PLN",BE:"EUR"};
let ebayTokenCache:{token:string;expiresAt:number}|null=null;

function cleanTitle(text:string){return String(text||"").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,"").replace(/\s{2,}/g," ").replace(/^\s*[|·—–-]+\s*|\s*[|·—–-]+\s*$/g,"").trim()}
function fallbackFor(query:string){const q=query.toLowerCase();if(/gym|fitness|shorts|running|training|recovery/.test(q))return NICHE_FALLBACK.fitness;if(/hair|scalp|density|shampoo/.test(q))return NICHE_FALLBACK.hair;if(/skin|acne|blemish|tone|serum/.test(q))return NICHE_FALLBACK.skin;if(/smile|teeth|tooth|whiten|oral/.test(q))return NICHE_FALLBACK.smile;return FASHION}
function num(v:string){const n=Number.parseFloat(v.replace(",","."));return Number.isFinite(n)?n:undefined}
function parsePriceIntent(text:string,country:string):PriceIntent{
 const q=text.toLowerCase();let min:number|undefined,max:number|undefined;
 const between=q.match(/(?:between|from)\s*(?:€|eur|euros?|£|gbp|\$|usd)?\s*(\d+(?:[.,]\d+)?)\s*(?:and|to|[-–])\s*(?:€|eur|euros?|£|gbp|\$|usd)?\s*(\d+(?:[.,]\d+)?)/i);
 if(between){min=num(between[1]);max=num(between[2])}
 const upper=q.match(/(?:under|below|less\s+than|up\s+to|max(?:imum)?|no\s+more\s+than)\s*(?:€|eur|euros?|£|gbp|\$|usd)?\s*(\d+(?:[.,]\d+)?)/i)||q.match(/(?:€|eur|euros?|£|gbp|\$|usd)\s*(\d+(?:[.,]\d+)?)\s*(?:or\s+less|and\s+under|max)/i)||q.match(/(\d+(?:[.,]\d+)?)\s*(?:€|eur|euros?|£|gbp|\$|usd)\s*(?:or\s+less|and\s+under|max)/i);
 if(upper&&!between)max=num(upper[1]);
 const lower=q.match(/(?:over|above|more\s+than|at\s+least|min(?:imum)?)\s*(?:€|eur|euros?|£|gbp|\$|usd)?\s*(\d+(?:[.,]\d+)?)/i);
 if(lower&&!between)min=num(lower[1]);
 const explicitCurrency=/€|\beur\b|\beuros?\b|£|\bgbp\b|\busd\b|\bdollars?\b|\$/.test(q);
 const currency=/£|\bgbp\b/.test(q)?"GBP":/\$|\busd\b|\bdollars?\b/.test(q)?"USD":/€|\beur\b|\beuros?\b/.test(q)?"EUR":DEFAULT_CURRENCY[country]||"EUR";
 return {min,max,currency,explicitCurrency};
}
function stripPriceLanguage(text:string){return text.replace(/(?:between|from)\s*(?:€|eur|euros?|£|gbp|\$|usd)?\s*\d+(?:[.,]\d+)?\s*(?:and|to|[-–])\s*(?:€|eur|euros?|£|gbp|\$|usd)?\s*\d+(?:[.,]\d+)?/ig," ").replace(/(?:under|below|less\s+than|up\s+to|max(?:imum)?|no\s+more\s+than|over|above|more\s+than|at\s+least|min(?:imum)?)\s*(?:€|eur|euros?|£|gbp|\$|usd)?\s*\d+(?:[.,]\d+)?/ig," ").replace(/\s+/g," ").replace(/^[,\s]+|[,\s]+$/g,"").trim()}
function applyPriceIntent(products:Product[],intent:PriceIntent){if(intent.min==null&&intent.max==null)return products;return products.filter(p=>{if(p.price==null)return false;if(intent.explicitCurrency&&p.currency&&p.currency!==intent.currency)return false;if(intent.min!=null&&p.price<intent.min)return false;if(intent.max!=null&&p.price>intent.max)return false;return true})}
function usable(products:Product[]){return products.filter(p=>Boolean(p.id&&p.title&&p.image&&p.url&&p.url!=="#")).map(p=>({...p,checkout:checkoutMode(p)}))}
function productKey(p:Product){return `${String(p.title||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}|${String(p.brand||"").toLowerCase()}`}
function dedupeProducts(products:Product[]){const seen=new Set<string>();return products.filter(p=>{const key=productKey(p);if(!key||seen.has(key))return false;seen.add(key);return true})}
function groupedProducts(shopify:Product[],amazon:Product[]){return dedupeProducts([...shopify,...amazon])}
function nextShopifyCursor(p:any){const candidates=[p?.cursor,p?.next_cursor,p?.nextCursor,p?.end_cursor,p?.endCursor,p?.after,p?.pageInfo?.endCursor,p?.page_info?.end_cursor];const found=candidates.find(v=>typeof v==="string"&&v.length);return found||""}
function normalizeShopifyPagination(p:any){const next=nextShopifyCursor(p);const has=Boolean(p?.has_next_page??p?.hasNextPage??p?.pageInfo?.hasNextPage??p?.page_info?.has_next_page??next);return{...(p||{}),next_cursor:next||null,has_next_page:has}}
function amazonPrice(r:any){const raw=r?.price?.value??r?.price?.raw??r?.prices?.[0]?.value??null;if(typeof raw==="number")return raw;if(typeof raw==="string"){const parsed=Number.parseFloat(raw.replace(/[^0-9,.-]/g,"").replace(",","."));return Number.isFinite(parsed)?parsed:null}return null}
function amazonCurrency(r:any,domain:string){return r?.price?.currency||r?.currency||(domain==="amazon.co.uk"?"GBP":domain==="amazon.com"?"USD":domain==="amazon.ca"?"CAD":domain==="amazon.com.au"?"AUD":"EUR")}
function amazonImage(r:any){return r?.image||r?.main_image?.link||r?.images?.[0]?.link||r?.thumbnail||""}

async function fetchAmazon(query:string,country:string,page=0){
 const apiKey=process.env.RAINFOREST_API_KEY;if(!apiKey)return[];
 const domain=AMAZON_DOMAINS[country]||"amazon.fr";
 const params=new URLSearchParams({api_key:apiKey,type:"search",amazon_domain:domain,search_term:stripPriceLanguage(query)||query,number_of_results:"48",exclude_sponsored:"true"});
 if(page>0)params.set("page",String(page+1));
 const response=await fetch(`https://api.rainforestapi.com/request?${params}`,{headers:{Accept:"application/json"},next:{revalidate:60}});
 if(!response.ok)throw new Error(`Rainforest ${response.status}`);
 const raw:any=await response.json();
 return usable((Array.isArray(raw?.search_results)?raw.search_results:[]).map((r:any)=>({id:`amazon-${r.asin}`,title:cleanTitle(r.title||"Amazon product"),brand:r.brand||r?.manufacturer||"Amazon",price:amazonPrice(r),currency:amazonCurrency(r,domain),image:amazonImage(r),url:r?.link||r?.url||(r?.asin?`https://${domain}/dp/${r.asin}`:"#"),tags:["Amazon",...(r?.is_prime?["Prime"]:[]),...(typeof r?.rating==="number"?[`${r.rating}★`]:[])].slice(0,6),source:"amazon-rainforest",asin:r.asin})));
}

async function fetchShopify(query:string,country:string,cursor?:string){
 const clean=stripPriceLanguage(query)||query;
 const payload={jsonrpc:"2.0",method:"tools/call",id:1,params:{name:"search_catalog",arguments:{meta:{"ucp-agent":{profile:"https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json"}},catalog:{query:clean,filters:{available:true,ships_to:{country}},context:{address_country:country,intent:query},pagination:{limit:50,...(cursor?{cursor}:{})}}}}};
 const response=await fetch("https://catalog.shopify.com/api/ucp/mcp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
 const raw:any=await response.json();const content=raw?.result?.structuredContent;
 if(!response.ok||!content?.products)throw new Error("Catalog unavailable");
 const products:Product[]=usable(content.products.map((p:any)=>{const price=p?.price_range?.min||p?.variants?.[0]?.price,images=[...new Set<string>((p?.media||[]).filter((m:any)=>m.type==="image"||m.url).map((m:any)=>m.url).filter(Boolean))];const variants=(p?.variants||[]).map((v:any)=>{const vp=v?.price||price;return{id:String(v.id||v.variant_id||""),label:cleanTitle(v.title||v.name||(v?.selected_options||[]).map((o:any)=>o.value).join(" · ")||"Option"),price:vp?Number(vp.amount)/100:null,currency:vp?.currency||price?.currency||"USD",image:v?.image?.url||v?.media?.[0]?.url||images[0]||"",url:v.url||v?.seller?.url||p.url||"#",available:v.available!==false&&v?.availability!=="out_of_stock"}}).filter((v:any)=>v.id);const gallery=[...new Set<string>([...images,...variants.map((v:any)=>v.image).filter(Boolean)])].slice(0,10);return{id:p.id,title:cleanTitle(p.title),brand:p?.variants?.[0]?.seller?.name||p?.seller?.name||"Shopify merchant",price:price?Number(price.amount)/100:null,currency:price?.currency||"USD",image:gallery[0]||"",images:gallery,url:p.url||p?.variants?.[0]?.seller?.url||"#",variants,tags:[...new Set<string>((p?.variants||[]).flatMap((v:any)=>v?.tags||[]))].slice(0,6),source:"shopify-global-catalog"}}));
 return{products,pagination:normalizeShopifyPagination(content.pagination||{})};
}

async function getEbayApplicationToken(){
 if(ebayTokenCache&&Date.now()<ebayTokenCache.expiresAt)return ebayTokenCache.token;
 const clientId=process.env.EBAY_CLIENT_ID,clientSecret=process.env.EBAY_CLIENT_SECRET;if(!clientId||!clientSecret)throw new Error("EBAY_CREDENTIALS_MISSING");
 const auth=Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
 const body=new URLSearchParams({grant_type:"client_credentials",scope:"https://api.ebay.com/oauth/api_scope"});
 const response=await fetch("https://api.ebay.com/identity/v1/oauth2/token",{method:"POST",headers:{Authorization:`Basic ${auth}`,"Content-Type":"application/x-www-form-urlencoded"},body:body.toString(),cache:"no-store"});
 if(!response.ok){const detail=await response.text().catch(()=>"");throw new Error(`EBAY_OAUTH_${response.status}:${detail.slice(0,220)}`)}
 const data:any=await response.json();const token=String(data?.access_token||"");if(!token)throw new Error("EBAY_OAUTH_NO_TOKEN");
 const expiresIn=Number(data?.expires_in||7200);ebayTokenCache={token,expiresAt:Date.now()+Math.max(60,expiresIn-120)*1000};return token;
}

async function fetchEbay(query:string,country:string,intent:PriceIntent,page=0){
 const token=await getEbayApplicationToken();const marketplace=EBAY_MARKETPLACES[country]||"EBAY_FR";const clean=stripPriceLanguage(query)||query;const limit=50;const offset=Math.max(0,page)*limit;
 const params=new URLSearchParams({q:clean,limit:String(limit),offset:String(offset)});
 if(intent.min!=null||intent.max!=null){const range=intent.min!=null&&intent.max!=null?`${intent.min}..${intent.max}`:intent.min!=null?`${intent.min}`:`..${intent.max}`;params.set("filter",`price:[${range}],priceCurrency:${intent.currency||DEFAULT_CURRENCY[country]||"EUR"}`)}
 const response=await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,{headers:{Authorization:`Bearer ${token}`,"X-EBAY-C-MARKETPLACE-ID":marketplace,Accept:"application/json"},next:{revalidate:45}});
 if(!response.ok){const detail=await response.text().catch(()=>"");throw new Error(`EBAY_BROWSE_${response.status}:${detail.slice(0,350)}`)}
 const raw:any=await response.json();const items=Array.isArray(raw?.itemSummaries)?raw.itemSummaries:[];
 const mapped:Product[]=items.map((item:any)=>{const feedback=Number(item?.seller?.feedbackPercentage),score=Number(item?.seller?.feedbackScore),condition=String(item?.condition||"").trim(),trusted=Number.isFinite(feedback)&&feedback>=98.5&&Number.isFinite(score)&&score>=100;return{id:`ebay-${item.itemId}`,title:cleanTitle(item.title||"eBay item"),brand:item?.seller?.username||"eBay seller",price:Number(item?.price?.value)||null,currency:item?.price?.currency||intent.currency||DEFAULT_CURRENCY[country]||"EUR",image:item?.image?.imageUrl||item?.thumbnailImages?.[0]?.imageUrl||"",url:item?.itemWebUrl||item?.itemAffiliateWebUrl||"#",tags:["eBay",...(condition?[condition]:[]),...(trusted?["Highly rated seller"]:[]),...(item?.buyingOptions?.includes("AUCTION")?["Auction"]:["Buy now"])].slice(0,6),source:"ebay-marketplace",marketplace,sellerFeedback:Number.isFinite(feedback)?feedback:null}});
 const products=applyPriceIntent(usable(mapped),intent);const total=Number(raw?.total||0);
 return{products,pagination:{has_next_page:items.length===limit&&(total===0||offset+limit<total),next_cursor:String(offset+limit),offset,total}};
}

function ebayPublicError(error:unknown){const msg=error instanceof Error?error.message:String(error);if(msg.includes("EBAY_CREDENTIALS_MISSING"))return"eBay credentials are not available in this Vercel deployment.";if(msg.includes("EBAY_OAUTH_401")||msg.includes("EBAY_OAUTH_400"))return"eBay rejected the Production App ID / Cert ID. Check that both Vercel values are from the same Production keyset.";if(msg.includes("EBAY_BROWSE_403"))return"eBay Production Browse API access is not enabled for this keyset yet.";if(msg.includes("EBAY_BROWSE_401"))return"The eBay token was created but is not authorized for Browse API access.";return"eBay marketplace is temporarily unavailable."}

export async function GET(req:NextRequest){
 const search=req.nextUrl.searchParams;
 const base=(search.get("q")||"black dress for a wedding under 150").slice(0,300);
 const direction=(search.get("direction")||"").slice(0,120);
 const cursor=search.get("cursor")||undefined;
 const page=Math.max(0,Number.parseInt(search.get("page")||"0",10)||0);
 const country=(search.get("country")||"FR").toUpperCase().slice(0,2);
 const market=search.get("market")==="ebay"?"ebay":"lumina";
 const requestedSource=search.get("source");
 const luminaSource:LuminaSource=requestedSource==="all"||requestedSource==="amazon"||requestedSource==="shopify"?requestedSource:"shopify";
 const query=direction?`${base}, ${direction}`:base;
 const priceIntent=parsePriceIntent(query,country);

 if(market==="ebay"){
  try{const result=await fetchEbay(query,country,priceIntent,page);return NextResponse.json({source:"ebay-marketplace",sources:["ebay-marketplace"],market:"ebay",query,filters:{price:priceIntent},products:result.products,pagination:result.pagination},{headers:{"Cache-Control":"s-maxage=30, stale-while-revalidate=120"}})}
  catch(error){console.error("eBay catalog error",error);return NextResponse.json({source:"ebay-marketplace",sources:["ebay-marketplace"],market:"ebay",query,filters:{price:priceIntent},products:[],pagination:{has_next_page:false},error:ebayPublicError(error)},{status:200})}
 }

 if(luminaSource==="shopify"){
  try{const result=await fetchShopify(query,country,cursor);const products=applyPriceIntent(result.products,priceIntent);return NextResponse.json({source:"shopify-global-catalog",sources:["shopify-global-catalog"],market:"lumina",luminaSource,query,filters:{price:priceIntent},products,pagination:result.pagination,error:products.length?undefined:"No Shopify products found for this search yet."},{headers:{"Cache-Control":"s-maxage=25, stale-while-revalidate=120"}})}
  catch(error){console.error("Shopify catalog error",error);return NextResponse.json({source:"shopify-global-catalog",sources:["shopify-global-catalog"],market:"lumina",luminaSource,query,products:[],pagination:{has_next_page:false},error:"Shopify products are temporarily unavailable in YNOT."},{status:200})}
 }

 if(luminaSource==="amazon"){
  try{const amazon=applyPriceIntent(await fetchAmazon(query,country,page),priceIntent);return NextResponse.json({source:"amazon-rainforest",sources:["amazon-rainforest"],market:"lumina",luminaSource,query,filters:{price:priceIntent},products:amazon,pagination:{has_next_page:amazon.length>=20},error:amazon.length?undefined:"No Amazon products found for this search yet."},{headers:{"Cache-Control":"s-maxage=30, stale-while-revalidate=150"}})}
  catch(error){console.error("Amazon catalog error",error);return NextResponse.json({source:"amazon-rainforest",sources:["amazon-rainforest"],market:"lumina",luminaSource,query,products:[],pagination:{has_next_page:false},error:"Amazon products are temporarily unavailable in YNOT."},{status:200})}
 }

 const [shopifyResult,amazonResult]=await Promise.allSettled([fetchShopify(query,country,cursor),fetchAmazon(query,country,page)]);
 const shopify=shopifyResult.status==="fulfilled"?shopifyResult.value:{products:[],pagination:{has_next_page:false,next_cursor:null}};
 const amazon=amazonResult.status==="fulfilled"?amazonResult.value:[];
 const shopifyProducts=applyPriceIntent(shopify.products,priceIntent);
 const amazonProducts=applyPriceIntent(amazon,priceIntent);
 const products=groupedProducts(shopifyProducts,amazonProducts);
 if(products.length){return NextResponse.json({source:"lumina-multi-source",sources:[...(shopifyProducts.length?["shopify-global-catalog"]:[]),...(amazonProducts.length?["amazon-rainforest"]:[])],market:"lumina",luminaSource:"all",query,filters:{price:priceIntent},products,pagination:{...shopify.pagination,amazon_has_next_page:amazon.length>=20}},{headers:{"Cache-Control":"s-maxage=25, stale-while-revalidate=120"}})}

 const fallback=applyPriceIntent(fallbackFor(query).map(p=>({...p,title:cleanTitle(p.title)})),priceIntent);
 return NextResponse.json({source:"fallback",sources:["fallback"],market:"lumina",luminaSource:"all",query,filters:{price:priceIntent},products:fallback,pagination:{has_next_page:false},error:"Live YNOT sources returned no products for this search."});
}
