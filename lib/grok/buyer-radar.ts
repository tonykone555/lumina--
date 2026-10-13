// Free public lead signals for YNOT Grok. No personal-data enrichment or paid scraping.
export type BuyerSignal={source:string;title:string;url:string;published_at:string|null;query:string;intent:"wanted"|"moving"|"apartment"|"rental";contact_method:"public_reply_or_approved_platform_message"|"business_partnership";verified_contact:false};
const patterns={
 wanted:['"looking for" "sofa"','"need furniture" "new apartment"','"where can I buy" "dining table"','"furnishing my first home"'],
 moving:['"just bought a house" "furniture"','"moving soon" "furniture"','"new home" "furnishing"'],
 apartment:['"new apartment development" "leasing"','"now leasing" "apartment homes"'],
 rental:['"airbnb" "furnish"','"short term rental" "furniture"']
} as const;
function decode(s:string){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/<[^>]*>/g," ").trim()}
function tag(item:string,name:string){return decode(item.match(new RegExp("<"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+name+">","i"))?.[1]||"")}
export async function discoverBuyerSignals(input:{country:"UK"|"US";intent:keyof typeof patterns;limit:number}){
 const {country,intent}=input;const limit=Math.max(1,Math.min(30,input.limit));const q=patterns[intent];
 const sources=await Promise.all(q.map(async query=>{
  // Public Google News RSS is free and provides attributable source links; it is not a buyer-contact database.
  const search=encodeURIComponent(query+" "+(country==="UK"?"United Kingdom":"United States")+" when:30d");
  const url="https://news.google.com/rss/search?q="+search+"&hl=en-"+(country==="UK"?"GB":"US")+"&gl="+(country==="UK"?"GB":"US")+"&ceid="+(country==="UK"?"GB:en":"US:en");
  try{
   const response=await fetch(url,{headers:{"User-Agent":"YNOTBuyerRadar/1.0 (+https://ynotworld.app)","Accept":"application/rss+xml, application/xml"},cache:"no-store",signal:AbortSignal.timeout(9000)});
   if(!response.ok)return {query,error:"HTTP_"+response.status,items:[] as BuyerSignal[]};
   const xml=await response.text();const articles=xml.match(/<item>[\s\S]*?<\/item>/g)||[];
   return {query,error:null,items:articles.slice(0,limit).map(raw=>({
    source:"Google News RSS",title:tag(raw,"title"),url:tag(raw,"link"),published_at:tag(raw,"pubDate")||null,query,
    intent,contact_method:(intent==="apartment"?"business_partnership":"public_reply_or_approved_platform_message") as BuyerSignal["contact_method"],verified_contact:false as const
   })).filter(x=>x.url.startsWith("https://"))};
  }catch(e){return {query,error:String(e).slice(0,160),items:[] as BuyerSignal[]}}
 }));
 const unique=new Map<string,BuyerSignal>();for(const source of sources)for(const item of source.items){if(!unique.has(item.url))unique.set(item.url,item)}
 const items=[...unique.values()].slice(0,limit);
 return {country,intent,items,queries:q,source_status:sources.map(s=>({query:s.query,error:s.error,returned:s.items.length})),
  limitations:["News and published posts are research signals, not verified buyer enquiries.","No buyer emails or phones are provided.","Search results may contain promotional articles and must be reviewed.","Respect each source's publishing and messaging rules.","No paid Apify actors were called."]};
}
