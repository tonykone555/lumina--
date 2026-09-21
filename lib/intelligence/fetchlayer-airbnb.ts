const BASE="https://api.fetchlayer.dev/airbnb";

function key(){
 const value=String(process.env.FETCHLAYER_API_KEY||"").trim();
 if(!value)throw new Error("FETCHLAYER_NOT_CONFIGURED");
 return value;
}
async function call<T>(path:string,body:Record<string,unknown>):Promise<T>{
 const r=await fetch(`${BASE}/${path}`,{
  method:"POST",
  headers:{Authorization:`Bearer ${key()}`,"Content-Type":"application/json"},
  body:JSON.stringify(body),
  cache:"no-store",
  signal:AbortSignal.timeout(120000)
 });
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(`FETCHLAYER_AIRBNB_${r.status}: ${String((data as any)?.error||(data as any)?.message||"unknown").slice(0,300)}`);
 return data as T;
}

export async function searchAirbnbListings(input:{location:string;pages?:number;currency?:string}){
 return call<any>("search-listings",{
  location:input.location.slice(0,180),
  pages:Math.max(1,Math.min(15,input.pages||1)),
  ...(input.currency?{currency:input.currency.toUpperCase()}: {})
 });
}
export async function getAirbnbListing(listing:string){
 return call<any>("listing-detail",{listing});
}
export async function getAirbnbReviews(listing:string,limit=20){
 return call<any>("listing-reviews",{listing,limit:Math.max(1,Math.min(100,limit))});
}
