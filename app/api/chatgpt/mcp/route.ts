import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = "https://ynotworld.app";
type Product = {id?:string;title?:string;brand?:string;price?:number|null;currency?:string;image?:string;images?:string[];url?:string;description?:string;tags?:string[];source?:string;[key:string]:unknown};

function result(value:unknown){return{content:[{type:"text" as const,text:JSON.stringify(value,null,2)}]}}
function country(value:string){const code=String(value||"FR").toUpperCase();return /^[A-Z]{2}$/.test(code)?code:"FR"}
function clean(p:Product){return{id:String(p.id||""),title:String(p.title||"Product"),brand:String(p.brand||""),description:String(p.description||"").slice(0,1200),price:typeof p.price==="number"?p.price:null,currency:String(p.currency||"EUR"),image:String(p.image||p.images?.[0]||""),images:Array.isArray(p.images)?p.images.slice(0,8):[],tags:Array.isArray(p.tags)?p.tags.slice(0,12):[],source:String(p.source||"ynot"),merchant_url:String(p.url||""),ynot_url:p.id?`${SITE}/p/${encodeURIComponent(String(p.id))}`:SITE}}
async function search(query:string,deliveryCountry:string,limit:number){const params=new URLSearchParams({q:query.slice(0,300),country:country(deliveryCountry),source:"all",category_load:limit>20?"1":"0"});const response=await fetch(`${SITE}/api/catalog?${params}`,{cache:"no-store",headers:{Accept:"application/json"}});if(!response.ok)throw new Error(`CATALOG_${response.status}`);const data=await response.json();return{query:data?.query||query,sources:data?.sources||[],products:(Array.isArray(data?.products)?data.products:[]).slice(0,limit).map(clean),error:data?.error||null}}

const handler=createMcpHandler((server)=>{
 server.tool("search_products","Search YNOT's live multi-source shopping catalogue using natural language. Use this for product discovery, budgets, styles, categories and shopping requests.",{query:z.string().min(2).max(300),country:z.string().length(2).default("FR"),limit:z.number().int().min(1).max(40).default(18)},async({query,country,limit})=>result(await search(query,country,limit)));
 server.tool("get_product","Find one specific YNOT product from a bounded live catalogue search.",{product_id:z.string().min(1),query:z.string().min(2).max(300),country:z.string().length(2).default("FR")},async({product_id,query,country})=>{const data=await search(query,country,40);return result(data.products.find((p:any)=>p.id===product_id)||{error:"PRODUCT_NOT_FOUND",product_id})});
 server.tool("find_similar_products","Find YNOT alternatives to a product, optionally applying a preference such as cheaper, another colour, or a price ceiling.",{product:z.string().min(2).max(300),preference:z.string().max(200).default("similar alternatives"),country:z.string().length(2).default("FR"),limit:z.number().int().min(1).max(30).default(12)},async({product,preference,country,limit})=>result(await search(`${product}, ${preference}`,country,limit)));
 server.tool("get_product_images","Return product images and links for a YNOT catalogue item.",{product_id:z.string().min(1),query:z.string().min(2).max(300),country:z.string().length(2).default("FR")},async({product_id,query,country})=>{const data=await search(query,country,40);const p:any=data.products.find((x:any)=>x.id===product_id);return result(p?{id:p.id,title:p.title,images:[...new Set([p.image,...(p.images||[])].filter(Boolean))],ynot_url:p.ynot_url,merchant_url:p.merchant_url}:{error:"PRODUCT_NOT_FOUND",product_id})});
 server.tool("open_in_ynot","Return a user-openable YNOT URL for a product or shopping search.",{product_id:z.string().max(240).optional(),query:z.string().max(300).optional()},async({product_id,query})=>result({url:product_id?`${SITE}/p/${encodeURIComponent(product_id)}`:query?`${SITE}/?q=${encodeURIComponent(query)}`:SITE}));
},{instructions:"YNOT is a visual multi-source shopping service. Search live products with search_products, inspect selected products with get_product, use find_similar_products for alternatives, and open_in_ynot when the shopper wants to continue on YNOT. Never invent product details, prices, availability, shipping, or merchants. Prefer YNOT URLs for continuing the shopping journey."});

export {handler as GET,handler as POST};
