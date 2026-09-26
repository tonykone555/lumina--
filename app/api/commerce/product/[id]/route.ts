import {NextRequest,NextResponse} from "next/server";
import {getCatalogProduct} from "@/lib/commerce/catalog-store";
import {dynamicLuminaPrice} from "@/lib/commerce/engine";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const SHOPIFY_CATALOG="https://catalog.shopify.com/api/ucp/mcp";
const AGENT_PROFILE="https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json";

type LiveProduct={id:string;title:string;brand:string;price:number|null;currency:string;image:string;images:string[];url:string;tags:string[];source:string;category?:string;description:string;variants?:unknown[]};

function text(value:unknown){
  if(typeof value==="string")return value.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
  if(value&&typeof value==="object"){const record=value as Record<string,unknown>;return text(record.plain??record.text??record.value??record.html)}
  return"";
}
function inferCategory(title:string,description:string){
  const value=`${title} ${description}`.toLowerCase();
  if(/sofa|sectional|couch|armchair|ottoman|chair|bed|table|cabinet|dresser|wardrobe|bookshelf|sideboard|console|rug|lamp|mirror|furniture|decor/.test(value))return"home";
  if(/shirt|dress|jacket|jeans|trouser|hoodie|fashion|apparel|clothing|bag/.test(value))return"fashion";
  if(/gym|fitness|training|activewear|sportswear/.test(value))return"fitness";
  if(/skin|serum|cream|cleanser|beauty/.test(value))return"skin";
  if(/hair|shampoo|conditioner|scalp/.test(value))return"hair";
  if(/phone|audio|headphone|charger|electronic|tech/.test(value))return"tech";
  return"default";
}
function centsPrice(value:any){
  if(!value)return null;
  const amount=Number(value.amount);
  return Number.isFinite(amount)&&amount>0?amount/100:null;
}
function ynotRetailPrice(input:{id:string;title:string;category:string;price:number|null;currency:string}){
  if(!input.price||!Number.isFinite(input.price)||input.price<=0)return null;
  return dynamicLuminaPrice({sourceId:"shopify-global-catalog",productId:input.id,title:input.title,category:input.category,price:input.price,currency:input.currency,shipping:0,stockConfidence:.75,returnPolicyScore:.7,regionMatch:.75});
}
async function getLiveShopifyProduct(id:string,country="FR"):Promise<LiveProduct|null>{
  if(!id.startsWith("gid://shopify/"))return null;
  const payload={jsonrpc:"2.0",method:"tools/call",id:1,params:{name:"get_product",arguments:{meta:{"ucp-agent":{profile:AGENT_PROFILE}},catalog:{id,context:{address_country:country}}}}};
  const response=await fetch(SHOPIFY_CATALOG,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store",signal:AbortSignal.timeout(15_000)});
  const raw:any=await response.json().catch(()=>null);
  const product=raw?.result?.structuredContent?.product;
  if(!response.ok||!product||String(product.id||"")!==id)return null;

  const description=text(product.description)||`${String(product.title||"This product")} from the original Shopify merchant.`;
  const title=String(product.title||"Shopify product").trim();
  const category=inferCategory(title,description);
  const variants=(Array.isArray(product.variants)?product.variants:[]).map((variant:any)=>{
    const sourcePrice=variant?.price||product?.price_range?.min;
    const sourceAmount=centsPrice(sourcePrice);
    const currency=String(sourcePrice?.currency||product?.price_range?.min?.currency||"USD");
    const media=[variant?.image?.url,...(variant?.media||[]).map((entry:any)=>entry?.url||entry?.image?.url)].filter(Boolean);
    const variantId=String(variant.id||variant.variant_id||"");
    const label=String(variant.title||variant.name||(variant?.selected_options||[]).map((option:any)=>option?.label||option?.value).filter(Boolean).join(" · ")||"Option");
    return{
      id:variantId,label,
      price:ynotRetailPrice({id:variantId||id,title:`${title} ${label}`,category,price:sourceAmount,currency}),currency,image:String(media[0]||""),
      url:String(variant.checkout_url||variant.url||variant?.seller?.url||product.url||"#"),available:variant.available!==false&&variant.availability!=="out_of_stock",
      selectedOptions:Array.isArray(variant.selected_options)?variant.selected_options:[],
    };
  }).filter((variant:any)=>variant.id);

  const media=(Array.isArray(product.media)?product.media:[]).filter((entry:any)=>!entry?.type||String(entry.type).toLowerCase()==="image").map((entry:any)=>String(entry?.url||entry?.image?.url||"")).filter(Boolean);
  const variantImages=variants.map((variant:any)=>variant.image).filter(Boolean);
  const images=[...new Set<string>([...media,...variantImages])].slice(0,10);
  const basePrice=product?.price_range?.min||product?.variants?.[0]?.price;
  const sourceAmount=centsPrice(basePrice);
  const currency=String(basePrice?.currency||"USD");
  return{
    id,title,brand:String(product?.seller?.name||product?.variants?.[0]?.seller?.name||"Shopify merchant"),
    price:ynotRetailPrice({id,title,category,price:sourceAmount,currency}),currency,
    image:images[0]||"",images,url:String(product.url||product?.variants?.[0]?.seller?.url||"#"),tags:Array.isArray(product.tags)?product.tags.map(String).slice(0,12):[],
    source:"shopify-global-catalog",category,description,variants,
  };
}

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id:rawId}=await params;
  const id=decodeURIComponent(String(rawId||"")).trim();
  if(!id)return NextResponse.json({error:"Product id required"},{status:400});

  const stored=await getCatalogProduct(id).catch(()=>null);
  if(stored&&stored.active!==false&&stored.ad_eligible!==false){
    const images=Array.isArray(stored.image_urls)?stored.image_urls.filter(Boolean):stored.image_url?[stored.image_url]:[];
    return NextResponse.json({product:{id:stored.ynot_id,title:stored.title,brand:stored.brand||stored.source_brand||"YNOT",price:Number(stored.ynot_price),currency:String(stored.currency||"USD"),image:stored.image_url,images,url:stored.best_source_url||`/p/${encodeURIComponent(stored.ynot_id)}`,tags:Array.isArray(stored.intent_tags)?stored.intent_tags:[],source:"shopify",category:stored.category,description:`${stored.title} available through YNOT.`}},{headers:{"Cache-Control":"public, s-maxage=300, stale-while-revalidate=3600"}});
  }

  const country=String(req.nextUrl.searchParams.get("country")||"FR").toUpperCase().slice(0,2);
  try{
    const live=await getLiveShopifyProduct(id,country);
    if(live)return NextResponse.json({product:live},{headers:{"Cache-Control":"public, s-maxage=120, stale-while-revalidate=600"}});
  }catch(error){console.error("[ynot-commerce] live Shopify product lookup failed",{id,error:error instanceof Error?error.message:"unknown"})}
  return NextResponse.json({error:"Product not found"},{status:404,headers:{"Cache-Control":"no-store"}});
}
