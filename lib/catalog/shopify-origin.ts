const ORIGIN_COUNTRIES=["FR","DE","ES","IT","BE","NL","GB","US","CA","AU","AT","CH","PL","PT","CZ","SE","DK","FI","IE","CN"] as const;

function clean(v:any){return typeof v==="string"?v.trim():""}

function originFields(p:any,country:string){
 const seller=p?.seller||p?.merchant||{};
 const address=seller?.address||{};
 return{
  country,
  postalCode:clean(p?.ship_from_postal_code||p?.shipping_origin_postal_code||seller?.postal_code||seller?.postalCode||address?.postal_code||address?.postalCode),
  city:clean(p?.ship_from_city||p?.shipping_origin_city||seller?.city||address?.city),
  state:clean(p?.ship_from_state||p?.shipping_origin_state||seller?.state||seller?.province||address?.state||address?.province)
 };
}

async function searchOrigin(productId:string,productTitle:string,country:string,destinationCountry="FR"){
 const payload={
  jsonrpc:"2.0",method:"tools/call",id:1,
  params:{name:"search_catalog",arguments:{
   meta:{"ucp-agent":{profile:"https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json"}},
   catalog:{
    query:String(productTitle||"product").slice(0,300),
    filters:{available:true,ships_from:[{country}],ships_to:{country:destinationCountry}},
    context:{address_country:destinationCountry,intent:String(productTitle||"product")},
    pagination:{limit:30}
   }
  }}
 };
 const response=await fetch("https://catalog.shopify.com/api/ucp/mcp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});
 const raw:any=await response.json().catch(()=>null);
 const products=raw?.result?.structuredContent?.products;
 if(!response.ok||!Array.isArray(products))return null;
 const matched=products.find((p:any)=>String(p?.id||"")===productId);
 return matched?originFields(matched,country):null;
}

export async function detectShopifyOrigin(productId:string,destinationCountry="FR",productTitle=""){
 if(!String(productId).startsWith("gid://shopify/"))return{country:null,postalCode:null,city:null,state:null,verified:false,method:"not-shopify"};
 for(const country of ORIGIN_COUNTRIES){
  try{
   const found=await searchOrigin(productId,productTitle,country,destinationCountry);
   if(found)return{...found,verified:true,method:"shopify-search-ships-from"};
  }catch{}
 }
 return{country:null,postalCode:null,city:null,state:null,verified:false,method:"shopify-search-ships-from"};
}
