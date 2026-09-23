import {NextRequest,NextResponse} from "next/server";
import {requireYnotAdmin,adminErrorStatus} from "@/lib/ynot/admin-server";
import {googleAutocomplete,searchGoogleAdLibrary,searchGoogleIntent,searchLinkedInAdLibrary,searchMetaAdLibrary,searchTikTokAdLibrary} from "@/lib/intelligence/fetchlayer-social";

export const runtime="nodejs";

type Mode="meta_ads"|"tiktok_ads"|"google_ads"|"linkedin_ads"|"google_demand";

function arr(v:any,...keys:string[]){for(const k of keys){if(Array.isArray(v?.[k]))return v[k]}return []}
function cleanText(v:any){return String(v??"").replace(/\s+/g," ").trim()}
function normalizeAd(a:any,platform:string){
 const creative=a?.creative||a?.ad||a||{};
 const advertiser=a?.advertiser?.name||a?.advertiserName||a?.businessName||a?.payerName||a?.advertiser||a?.companyName||"Unknown advertiser";
 const headline=creative?.headline||creative?.title||a?.headline||a?.title||creative?.body||a?.body||"Ad creative";
 return{
  id:String(a?.adArchiveId||a?.adId||a?.id||a?.creativeId||Math.random()),platform,
  advertiser:cleanText(advertiser),headline:cleanText(headline),
  body:cleanText(creative?.body||creative?.text||creative?.caption||a?.body||a?.text||a?.caption),
  cta:cleanText(creative?.ctaText||creative?.callToAction||a?.ctaText||a?.callToAction),
  landingPage:cleanText(creative?.linkUrl||creative?.destinationUrl||a?.landingPageUrl||a?.linkUrl||a?.destinationUrl),
  format:cleanText(a?.mediaType||creative?.format||a?.format),
  started:a?.startDate||a?.shownFrom||a?.firstShownAt||null,
  ended:a?.endDate||a?.shownTo||a?.lastShownAt||null,
  impressions:a?.impressions||a?.estimatedAudience||a?.impressionsRange||null,
 };
}

export async function POST(req:NextRequest){
 try{
  await requireYnotAdmin(req);
  const b=await req.json();
  const mode=String(b.mode||"") as Mode;
  const query=cleanText(b.query).slice(0,300);
  const country=cleanText(b.country||"FR").toUpperCase().slice(0,2)||"FR";
  const language=cleanText(b.language||"en").slice(0,12)||"en";
  const limit=Math.max(5,Math.min(50,Number(b.limit)||30));
  if(!query)return NextResponse.json({error:"QUERY_REQUIRED"},{status:400});

  if(mode==="google_demand"){
   const [serp,auto]=await Promise.all([searchGoogleIntent(query,country,language),googleAutocomplete(query,country,language)]);
   const related=arr(serp,"relatedSearches","related_searches").map((x:any)=>cleanText(x?.query||x?.text||x)).filter(Boolean);
   const questions=arr(serp,"peopleAlsoAsk","people_also_ask").map((x:any)=>cleanText(x?.question||x?.text||x)).filter(Boolean);
   const suggestions=arr(auto,"suggestions","completions","results").map((x:any)=>cleanText(x?.query||x?.text||x?.value||x)).filter(Boolean);
   const discussions=arr(serp,"discussions","discussionResults").slice(0,12).map((x:any)=>({title:cleanText(x?.title),url:cleanText(x?.url),snippet:cleanText(x?.snippet)}));
   return NextResponse.json({mode,query,country,language,signals:{suggestions:[...new Set(suggestions)].slice(0,20),questions:[...new Set(questions)].slice(0,20),related:[...new Set(related)].slice(0,20),discussions},notes:Array.isArray(serp?.notes)?serp.notes:[]});
  }

  let raw:any,platform="";
  if(mode==="meta_ads"){raw=await searchMetaAdLibrary(query,country,limit);platform="Meta"}
  else if(mode==="tiktok_ads"){raw=await searchTikTokAdLibrary(query,country,limit);platform="TikTok"}
  else if(mode==="google_ads"){raw=await searchGoogleAdLibrary(query,country,limit);platform="Google"}
  else if(mode==="linkedin_ads"){raw=await searchLinkedInAdLibrary(query,country,limit);platform="LinkedIn"}
  else return NextResponse.json({error:"MODE_NOT_SUPPORTED"},{status:400});

  const ads=arr(raw,"ads","results","adResults").map((x:any)=>normalizeAd(x,platform));
  const matchedAdvertisers=arr(raw,"matchedAdvertisers","advertisers").map((x:any)=>cleanText(x?.name||x?.advertiserName||x)).filter(Boolean);
  const groups=new Map<string,{advertiser:string,count:number,samples:any[]}>();
  for(const ad of ads){const key=ad.advertiser.toLowerCase();const g=groups.get(key)||{advertiser:ad.advertiser,count:0,samples:[]};g.count++;if(g.samples.length<3)g.samples.push(ad);groups.set(key,g)}
  const advertisers=[...groups.values()].sort((a,b)=>b.count-a.count).slice(0,20);
  return NextResponse.json({mode,query,country,platform,ads,advertisers,matchedAdvertisers,notes:Array.isArray(raw?.notes)?raw.notes:[]});
 }catch(e){
  const m=e instanceof Error?e.message:"GROWTH_INTELLIGENCE_FAILED";
  return NextResponse.json({error:m},{status:/FETCHLAYER_NOT_CONFIGURED/.test(m)?503:adminErrorStatus(e)});
 }
}
