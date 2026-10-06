const ORIGIN_COUNTRIES=["FR","DE","ES","IT","BE","NL","GB","US","CA","AU","AT","CH","PL","PT","CZ","SE","DK","FI","IE","CN"] as const;

async function searchOrigin(productId:string,productTitle:string,country:string,destinationCountry="FR"){
 const payload={
  jsonrpc:"2.0",method:"tools/call",id:1,
  params:{name:"search_catalog",arguments:{
   meta:{"ucp-agent":{profile:"https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json"}},
   catalog:{
    query:String(productTitle||"product").slice(0,300),
    filters:{available:true,ships_from:[{country}],ships_to:{country:destinationCountry}},
    context:{address_country:destinationCountry,intent:String(productTitle||"product")},
    pagination:{limit:20}
   }
  }}
 };
 const response=await fetch("https://catalog.shopify.com/api/ucp/mcp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});
 const raw:any=await response.json().catch(()=>null);
 const products=raw?.result?.structuredContent?.products;
 return response.ok&&Array.isArray(products)&&products.some((p:any)=>String(p?.id||"")===productId);
}

export async function detectShopifyOrigin(productId:string,destinationCountry="FR",productTitle=""){
 if(!String(productId).startsWith("gid://shopify/"))return{country:null,verified:false,method:"not-shopify"};
 for(const country of ORIGIN_COUNTRIES){
  try{
   if(await searchOrigin(productId,productTitle,country,destinationCountry))return{country,verified:true,method:"shopify-search-ships-from"};
  }catch{}
 }
 return{country:null,verified:false,method:"shopify-search-ships-from"};
}
