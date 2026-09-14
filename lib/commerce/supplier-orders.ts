import Stripe from "stripe";

type EndpointConfig={url:string;token?:string;mode?:"webhook"};
function configs():Record<string,EndpointConfig>{try{return JSON.parse(process.env.YNOT_SUPPLIER_ORDER_ENDPOINTS_JSON||"{}")}catch{return{}}}
function findConfig(url:string){try{const host=new URL(url).hostname.toLowerCase();return Object.entries(configs()).find(([domain])=>host===domain||host.endsWith(`.${domain}`))?.[1]}catch{return undefined}}

export async function placeSupplierOrder(session:Stripe.Checkout.Session){
 const supplierUrl=session.metadata?.supplierUrl||"";const config=findConfig(supplierUrl);if(!config)return{placed:false,reason:"NO_SUPPLIER_ORDER_ADAPTER"};
 const shipping=session.shipping_details||session.collected_information?.shipping_details;
 const payload={ynotOrderId:session.id,paymentIntent:session.payment_intent,productId:session.metadata?.productId,variantId:session.metadata?.variantId||undefined,supplierUrl,supplierPrice:Number(session.metadata?.supplierPrice||0),ynotPrice:Number(session.metadata?.ynotPrice||0),shippingAmount:Number(session.metadata?.shippingAmount||0),customer:{name:shipping?.name||session.customer_details?.name,email:session.customer_details?.email,phone:session.customer_details?.phone,address:shipping?.address||session.customer_details?.address}};
 const response=await fetch(config.url,{method:"POST",headers:{"Content-Type":"application/json",...(config.token?{Authorization:`Bearer ${config.token}`}:{})},body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error(`SUPPLIER_ORDER_FAILED_${response.status}`);
 let result:any={};try{result=await response.json()}catch{}
 return{placed:true,result};
}
