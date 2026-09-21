const KEY=()=>String(process.env.FETCHLAYER_API_KEY||"").trim();

async function post<T>(base:string,path:string,body:Record<string,unknown>):Promise<T>{
 const key=KEY();if(!key)throw new Error("FETCHLAYER_NOT_CONFIGURED");
 const r=await fetch(`https://api.fetchlayer.dev/${base}/${path}`,{
  method:"POST",
  headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
  body:JSON.stringify(body),
  cache:"no-store",
  signal:AbortSignal.timeout(120000)
 });
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(`FETCHLAYER_${base.toUpperCase()}_${r.status}: ${String((data as any)?.error||(data as any)?.message||"unknown").slice(0,260)}`);
 return data as T;
}

export type AdSignal={
 network:"meta"|"tiktok";
 id:string;
 advertiser:string;
 advertiserId?:string;
 title?:string;
 body?:string;
 cta?:string;
 linkUrl?:string;
 startDate?:string;
 isActive?:boolean;
 mediaType?:string;
 raw?:unknown;
};

export async function searchMetaAds(query:string,country="ALL",limit=30){
 const data=await post<any>("facebook-ad-library","search-ads",{
  query:query.slice(0,160),
  searchType:"keyword_unordered",
  country,
  activeStatus:"active",
  limit:Math.max(1,Math.min(100,limit))
 });
 const ads:Array<any>=Array.isArray(data?.ads)?data.ads:[];
 return {
  ads:ads.map(a=>({
   network:"meta" as const,
   id:String(a.adArchiveId||a.id||""),
   advertiser:String(a?.advertiser?.pageName||a?.pageName||""),
   advertiserId:String(a?.advertiser?.pageId||"")||undefined,
   title:String(a?.creative?.title||"")||undefined,
   body:String(a?.creative?.body||a?.creative?.caption||"")||undefined,
   cta:String(a?.creative?.ctaText||"")||undefined,
   linkUrl:String(a?.creative?.linkUrl||"")||undefined,
   startDate:String(a?.startDate||"")||undefined,
   isActive:a?.isActive!==false,
   mediaType:String(a?.creative?.displayFormat||a?.mediaType||"")||undefined,
   raw:a
  } satisfies AdSignal)),
  adCount:Number(data?.adCount||ads.length),
  hasNextPage:Boolean(data?.hasNextPage),
  notes:Array.isArray(data?.notes)?data.notes:[]
 };
}

export async function searchTikTokAds(query:string,country="FR",limit=30){
 const data=await post<any>("tiktok-ad-library","search-ads",{
  query:query.slice(0,160),
  queryMode:"keyword",
  country,
  adStatus:"active",
  limit:Math.max(1,Math.min(100,limit))
 });
 const ads:Array<any>=Array.isArray(data?.ads)?data.ads:[];
 return {
  ads:ads.map(a=>({
   network:"tiktok" as const,
   id:String(a.adId||a.id||""),
   advertiser:String(a?.advertiser?.name||a?.advertiserName||a?.businessName||""),
   advertiserId:String(a?.advertiser?.id||a?.advertiserId||"")||undefined,
   title:String(a?.title||a?.creative?.title||"")||undefined,
   body:String(a?.caption||a?.creative?.caption||a?.creative?.text||"")||undefined,
   cta:String(a?.ctaText||a?.creative?.ctaText||"")||undefined,
   linkUrl:String(a?.landingPageUrl||a?.creative?.linkUrl||"")||undefined,
   startDate:String(a?.shownFrom||a?.startDate||"")||undefined,
   isActive:a?.isActive!==false,
   mediaType:"video",
   raw:a
  } satisfies AdSignal)),
  adCount:Number(data?.adCount||ads.length),
  hasNextPage:Boolean(data?.hasNextPage),
  notes:Array.isArray(data?.notes)?data.notes:[]
 };
}
