const ORIGIN_COUNTRIES=["FR","DE","ES","IT","BE","NL","GB","US","CA","AU","AT","CH","PL","PT","CZ","SE","DK","FI","IE"] as const;

async function lookup(productId:string,country:string,destinationCountry?:string){
 const payload={
  jsonrpc:"2.0",method:"tools/call",id:1,
  params:{name:"lookup_catalog",arguments:{
   meta:{"ucp-agent":{profile:"https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json"}},
   catalog:{
    ids:[productId],
    filters:{
     available:true,
     ships_from:[{country}],
     ...(destinationCountry?{ships_to:{country:destinationCountry}}:{})
    },
    context:{...(destinationCountry?{address_country:destinationCountry}:{}),intent:"Verify merchant shipping origin for resale listing"}
   }
  }}
 };
 const response=await fetch("https://catalog.shopify.com/api/ucp/mcp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});
 const raw:any=await response.json().catch(()=>null);
 const products=raw?.result?.structuredContent?.products;
 return response.ok&&Array.isArray(products)&&products.some((p:any)=>String(p?.id||"")===productId);
}

export async function detectShopifyOrigin(productId:string,destinationCountry?:string){
 if(!String(productId).startsWith("gid://shopify/"))return{country:null,verified:false,method:"not-shopify"};
 for(const country of ORIGIN_COUNTRIES){
  try{
   if(await lookup(productId,country,destinationCountry))return{country,verified:true,method:"shopify-ships-from"};
  }catch{}
 }
 return{country:null,verified:false,method:"shopify-ships-from"};
}
