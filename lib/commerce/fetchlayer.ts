const BASE="https://api.fetchlayer.dev/aliexpress";

export type FetchLayerMarket={shipTo:string;currency:string;language?:"en_US"|"de_DE"|"pt_BR"};
export type FetchLayerSearchProduct={
 productId:string;title:string;url:string;imageUrl?:string|null;imageUrls?:string[];
 price?:{amount:number;currency:string;formatted?:string}|null;
 originalPrice?:{amount:number;currency:string;formatted?:string}|null;
 rating?:number|null;soldCount?:number|null;soldText?:string|null;
 shipFrom?:string|null;categoryId?:string|null;choice?:boolean;sponsored?:boolean;
};
export type FetchLayerDetails={
 product?:{
  productId:string;title:string;url:string;available?:boolean;categoryId?:string;
  price?:{amount:number;currency:string}|null;
  originalPrice?:{amount:number;currency:string}|null;
  rating?:number|null;reviewCount?:number|null;soldCount?:number|null;
  images?:string[];specifications?:unknown[];variants?:unknown[];
  store?:{name?:string;country?:string;positiveFeedbackPercent?:number;topRated?:boolean};
  shipping?:{
   fee?:{amount?:number;currency?:string}|number|null;
   carrier?:string;shipFrom?:string;
   deliveryDate?:string;deliveryMinDate?:string;deliveryMaxDate?:string;
   [key:string]:unknown;
  };
 };
 market?:FetchLayerMarket;notes?:string[];
};

function key(){
 const value=String(process.env.FETCHLAYER_API_KEY||"").trim();
 if(!value)throw new Error("FETCHLAYER_NOT_CONFIGURED");
 return value;
}
async function call<T>(endpoint:string,body:Record<string,unknown>,attempt=0):Promise<T>{
 const r=await fetch(`${BASE}/${endpoint}`,{
  method:"POST",
  headers:{Authorization:`Bearer ${key()}`,"Content-Type":"application/json"},
  body:JSON.stringify(body),
  cache:"no-store",
  signal:AbortSignal.timeout(120000)
 });
 if((r.status===502||r.status===503)&&attempt<2){
  await new Promise(resolve=>setTimeout(resolve,800*(attempt+1)));
  return call<T>(endpoint,body,attempt+1);
 }
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(`FETCHLAYER_${r.status}: ${String((data as any)?.error||(data as any)?.message||"unknown").slice(0,300)}`);
 return data as T;
}

export async function searchAliExpress(query:string,market:FetchLayerMarket,limit=60){
 const data=await call<{products?:FetchLayerSearchProduct[];notes?:string[];market?:FetchLayerMarket}>("search-products",{
  query:query.slice(0,200),
  sort:"best_match",
  fourStarsAndUp:true,
  limit:Math.max(1,Math.min(1200,limit)),
  pages:1,
  shipTo:market.shipTo,
  currency:market.currency,
  language:market.language||"en_US"
 });
 return{products:Array.isArray(data.products)?data.products:[],notes:data.notes||[],market:data.market||market};
}

export async function getAliExpressDetails(product:string,market:FetchLayerMarket){
 return call<FetchLayerDetails>("product-details",{
  product,
  shipTo:market.shipTo,
  currency:market.currency,
  language:market.language||"en_US"
 });
}
