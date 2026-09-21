import {searchMetaAds,searchTikTokAds,type AdSignal} from "./fetchlayer-ads";

export type OpportunityProduct={
 id:string;title:string;brand?:string;description?:string;category?:string;price?:number|null;currency?:string;
 supplierPrice?:number|null;image?:string;url?:string;
};
export type OpportunitySignal={
 niche:string;metaAds:number;tiktokAds:number;advertisers:number;activeAds:number;repeatedAdvertisers:number;
 recencyScore:number;adDensityScore:number;adSignalScore:number;evidence:string[];
 topAdvertisers:{name:string;count:number;networks:string[]}[];
};
export type ProductOpportunity={
 product:OpportunityProduct;signal:OpportunitySignal;catalogueFit:number;economicsFit:number;
 creatorFit:number;opportunityScore:number;reasons:string[];
};

const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
const round=(n:number)=>Math.round(n);
function words(v:string){return [...new Set(String(v||"").toLowerCase().replace(/[^a-z0-9]+/g," ").split(/\s+/).filter(x=>x.length>2))]}
function textSimilarity(a:string,b:string){const A=words(a),B=new Set(words(b));return A.length?A.filter(x=>B.has(x)).length/A.length:0}
function adText(ad:AdSignal){return [ad.title,ad.body,ad.advertiser].filter(Boolean).join(" ")}
function recency(start?:string){
 if(!start)return .45;const t=Date.parse(start);if(!Number.isFinite(t))return .45;
 const days=Math.max(0,(Date.now()-t)/86400000);
 if(days<=14)return 1;if(days<=30)return .85;if(days<=90)return .65;if(days<=180)return .45;return .25;
}
function groupAdvertisers(ads:AdSignal[]){
 const map=new Map<string,{name:string;count:number;networks:Set<string>}>();
 for(const ad of ads){
  const name=String(ad.advertiser||"").trim();if(!name)continue;
  const key=name.toLowerCase(),row=map.get(key)||{name,count:0,networks:new Set<string>()};
  row.count++;row.networks.add(ad.network);map.set(key,row);
 }
 return [...map.values()].sort((a,b)=>b.count-a.count).map(x=>({name:x.name,count:x.count,networks:[...x.networks]}));
}

export async function researchNicheOpportunity(niche:string,country="FR"){
 const q=niche.trim().slice(0,160);if(q.length<2)throw new Error("NICHE_REQUIRED");
 const [meta,tiktok]=await Promise.allSettled([searchMetaAds(q,country,40),searchTikTokAds(q,country,40)]);
 const metaAds=meta.status==="fulfilled"?meta.value.ads:[];
 const tiktokAds=tiktok.status==="fulfilled"?tiktok.value.ads:[];
 const ads=[...metaAds,...tiktokAds],advertisers=groupAdvertisers(ads);
 const repeated=advertisers.filter(x=>x.count>=2).length;
 const recencyAvg=ads.length?ads.reduce((s,a)=>s+recency(a.startDate),0)/ads.length:0;
 const density=clamp(Math.log2(ads.length+1)/Math.log2(81)*100);
 const repeatScore=clamp(repeated*8),crossNetwork=advertisers.filter(x=>x.networks.length>1).length,crossScore=clamp(crossNetwork*12);
 const signalScore=round(clamp(density*.45+recencyAvg*100*.25+repeatScore*.18+crossScore*.12));
 const evidence=[
  ads.length?`${ads.length} active ads found across Meta/TikTok`:"No active ads found in this pass",
  repeated?`${repeated} advertisers running multiple matching ads`:"No repeated advertiser pattern yet",
  crossNetwork?`${crossNetwork} advertisers visible across both networks`:"No cross-network overlap yet"
 ];
 return {niche:q,metaAds:metaAds.length,tiktokAds:tiktokAds.length,advertisers:advertisers.length,activeAds:ads.length,
  repeatedAdvertisers:repeated,recencyScore:round(recencyAvg*100),adDensityScore:round(density),adSignalScore:signalScore,
  evidence,topAdvertisers:advertisers.slice(0,8),ads};
}

export function scoreCatalogueProduct(product:OpportunityProduct,signal:OpportunitySignal & {ads?:AdSignal[]}){
 const productText=[product.title,product.brand,product.description,product.category].filter(Boolean).join(" ");
 const ads=signal.ads||[],similarities=ads.map(a=>textSimilarity(productText,adText(a))).sort((a,b)=>b-a);
 const bestSimilarity=similarities[0]||0,averageTop=similarities.slice(0,5).reduce((s,x)=>s+x,0)/Math.max(1,Math.min(5,similarities.length));
 const catalogueFit=round(clamp((bestSimilarity*.65+averageTop*.35)*100));
 const retail=Number(product.price||0),supplier=Number(product.supplierPrice||0);
 const marginPct=retail>0&&supplier>0&&supplier<retail?(retail-supplier)/retail:0,economicsFit=round(clamp(marginPct*180));
 const creatorFit=round(clamp(signal.adSignalScore*.6+catalogueFit*.4));
 const opportunityScore=round(clamp(signal.adSignalScore*.38+catalogueFit*.30+economicsFit*.20+creatorFit*.12));
 const reasons:string[]=[];
 if(signal.adSignalScore>=60)reasons.push("Strong active ad signal");
 if(catalogueFit>=55)reasons.push("Good catalogue-to-ad match");
 if(economicsFit>=55)reasons.push("Healthy existing Shopify margin");
 if(signal.repeatedAdvertisers>=2)reasons.push("Multiple advertisers are testing the niche");
 if(!reasons.length)reasons.push("Early signal — validate before scaling");
 return {product,signal,catalogueFit,economicsFit,creatorFit,opportunityScore,reasons} satisfies ProductOpportunity;
}
