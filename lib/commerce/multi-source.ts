export type CanonicalProduct={
 id:string;title:string;brand:string;price:number|null;currency?:string;image:string;images?:string[];
 url?:string;tags?:string[];source?:string;description?:string;variants?:unknown[];
 supplierPrice?:number;reliabilityScore?:number;shipping?:number|null;[key:string]:unknown
};
export type SupplierOffer={
 source:string;sourceProductId:string;merchantName:string;merchantDomain:string;sourceUrl:string;
 price:number;currency:string;shipping:number|null;reliability:number;product:CanonicalProduct
};

function norm(s:unknown){return String(s||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim()}
function host(url?:string){try{return new URL(String(url)).hostname.replace(/^www\./,"").toLowerCase()}catch{return""}}
function modelTokens(title:string){return norm(title).split(" ").filter(x=>/[a-z]/.test(x)&&/\d/.test(x))}
export function canonicalKey(p:CanonicalProduct){
 const model=modelTokens(p.title)[0]||"";
 const title=norm(p.title).split(" ").filter(w=>w.length>2).slice(0,10).join(" ");
 return `${norm(p.brand)||host(p.url)}|${model||title}`;
}
export function offerFor(p:CanonicalProduct):SupplierOffer|null{
 const price=Number(p.supplierPrice??p.price);
 if(!Number.isFinite(price)||price<=0||!p.url)return null;
 return{source:String(p.source||"unknown"),sourceProductId:String(p.id),merchantName:String(p.brand||host(p.url)||"Merchant"),merchantDomain:host(p.url),sourceUrl:p.url,price,currency:String(p.currency||"EUR"),shipping:Number.isFinite(Number(p.shipping))?Number(p.shipping):null,reliability:Number.isFinite(Number(p.reliabilityScore))?Number(p.reliabilityScore):.7,product:p};
}
export function offerScore(o:SupplierOffer){
 const landed=o.price+(o.shipping??Math.max(4,o.price*.035));
 const reliability=Math.max(0,Math.min(1,o.reliability));
 return reliability*100-Math.log10(Math.max(1,landed))*8-(o.shipping==null?4:0);
}
export function groupSupplierOffers(products:CanonicalProduct[]){
 const groups=new Map<string,SupplierOffer[]>();
 for(const p of products){const o=offerFor(p);if(!o)continue;const k=canonicalKey(p);groups.set(k,[...(groups.get(k)||[]),o])}
 return [...groups.entries()].map(([key,offers])=>{
   offers.sort((a,b)=>offerScore(b)-offerScore(a));
   const best=offers[0];
   return{key,best,offers,supplierOfferCount:offers.length};
 });
}
export function selectCanonicalProducts(products:CanonicalProduct[]){
 return groupSupplierOffers(products).map(g=>({
   ...g.best.product,
   supplierPrice:g.best.price,
   supplierOffers:g.offers.map(o=>({source:o.source,sourceProductId:o.sourceProductId,merchantName:o.merchantName,merchantDomain:o.merchantDomain,sourceUrl:o.sourceUrl,sourcePrice:o.price,sourceCurrency:o.currency,shipping:o.shipping,reliability:o.reliability,routingScore:offerScore(o)})),
   supplierOfferCount:g.supplierOfferCount,
   canonicalKey:g.key
 }));
}
