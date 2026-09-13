import crypto from "node:crypto";
import { buildQuote, type SourceQuote } from "./engine";

export type CheckoutProduct={id:string;title:string;brand?:string;price:number;currency:string;image?:string;url:string;source?:string;category?:string};

const domains=()=>String(process.env.YNOT_APPROVED_SUPPLIER_DOMAINS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
function ownedInventory():Record<string,CheckoutProduct>{try{return JSON.parse(process.env.YNOT_OWNED_INVENTORY_JSON||"{}")}catch{return{}}}
export function approvedSupplier(url:string){try{const h=new URL(url).hostname.toLowerCase();return domains().some(d=>h===d||h.endsWith(`.${d}`))}catch{return false}}
export function checkoutMode(p:{id?:string;url?:string;source?:string}){
  if(p.source==="ynot-inventory"&&p.id&&ownedInventory()[p.id])return{mode:"ynot" as const,reason:"YNOT inventory"};
  if(p.source?.includes("shopify")&&p.url&&approvedSupplier(p.url))return{mode:"ynot" as const,reason:"Approved supplier"};
  return{mode:"merchant" as const,reason:"Marketplace checkout"};
}
function flatten(v:any):any[]{return Array.isArray(v)?v.flatMap(flatten):v&&typeof v==="object"?[v,...Object.values(v).flatMap(flatten)]:[]}
export async function revalidateProduct(input:CheckoutProduct):Promise<CheckoutProduct>{
  if(checkoutMode(input).mode!=="ynot")throw new Error("MERCHANT_CHECKOUT_ONLY");
  if(input.source==="ynot-inventory"){const owned=ownedInventory()[input.id];if(!owned)throw new Error("UNKNOWN_INVENTORY_ITEM");return owned}
  const url=new URL(input.url); if(url.protocol!=="https:")throw new Error("INVALID_SUPPLIER_URL");
  const response=await fetch(url,{cache:"no-store",redirect:"follow",signal:AbortSignal.timeout(8000),headers:{"User-Agent":"YNOT-Checkout/1.0"}});
  if(!response.ok||!approvedSupplier(response.url))throw new Error("SUPPLIER_UNAVAILABLE");
  const html=await response.text(); const blocks=[...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for(const block of blocks){try{const nodes=flatten(JSON.parse(block[1]));const product=nodes.find((x:any)=>String(x?.["@type"]||"").toLowerCase()==="product");if(!product)continue;const offer=Array.isArray(product.offers)?product.offers[0]:product.offers;const price=Number(offer?.price??offer?.lowPrice);const currency=String(offer?.priceCurrency||input.currency).toUpperCase();const availability=String(offer?.availability||"").toLowerCase();if(!Number.isFinite(price)||price<=0)continue;if(availability.includes("outofstock")||availability.includes("soldout"))throw new Error("OUT_OF_STOCK");return{...input,title:String(product.name||input.title),image:Array.isArray(product.image)?product.image[0]:product.image||input.image,price,currency,url:response.url}}catch(e){if(e instanceof Error&&e.message==="OUT_OF_STOCK")throw e}}
  throw new Error("PRICE_NOT_VERIFIABLE");
}
export function pricedCheckout(p:CheckoutProduct){
  const source:SourceQuote={sourceId:p.source||"approved-supplier",productId:p.id,title:p.title,category:p.category,price:p.price,currency:p.currency,shipping:Number(process.env.YNOT_DEFAULT_SUPPLIER_SHIPPING||0),stockConfidence:1,returnPolicyScore:.8,regionMatch:.9,preferredSupplier:true};
  return buildQuote(source);
}
export function signQuote(data:object){const secret=process.env.YNOT_CHECKOUT_SIGNING_SECRET;if(!secret)throw new Error("CHECKOUT_NOT_CONFIGURED");const payload=Buffer.from(JSON.stringify(data)).toString("base64url");return `${payload}.${crypto.createHmac("sha256",secret).update(payload).digest("base64url")}`}
export function verifyQuote(token:string){const secret=process.env.YNOT_CHECKOUT_SIGNING_SECRET;if(!secret)throw new Error("CHECKOUT_NOT_CONFIGURED");const [payload,sig]=token.split(".");const expected=crypto.createHmac("sha256",secret).update(payload||"").digest("base64url");const receivedBytes=Uint8Array.from(Buffer.from(sig||"")),expectedBytes=Uint8Array.from(Buffer.from(expected));if(!sig||receivedBytes.length!==expectedBytes.length||!crypto.timingSafeEqual(receivedBytes,expectedBytes))throw new Error("INVALID_QUOTE");const data=JSON.parse(Buffer.from(payload,"base64url").toString());if(Number(data.expiresAt)<Date.now())throw new Error("QUOTE_EXPIRED");return data}
