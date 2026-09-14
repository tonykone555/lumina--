import { NextRequest, NextResponse } from "next/server";

type QueryPair = readonly [query:string, section:string];

const AMAZON_DOMAINS: Record<string,string>={US:"amazon.com",GB:"amazon.co.uk",UK:"amazon.co.uk",FR:"amazon.fr",DE:"amazon.de",ES:"amazon.es",IT:"amazon.it",CA:"amazon.ca",AU:"amazon.com.au",BE:"amazon.com.be"};
const QUERIES: readonly QueryPair[]=[
  ["cheap useful gadgets under 25","Tech"],["phone accessories under 25","Phone Accessories"],["pet accessories under 30","Pets"],
  ["home gadgets under 35","Home"],["kitchen gadgets under 30","Kitchen"],["beauty tools under 30","Beauty & Hair"],
  ["hair styling accessories under 30","Beauty & Hair"],["fitness accessories under 30","Fitness"],["car accessories under 30","Car"],
  ["travel accessories under 30","Travel"],["desk accessories under 35","Home"],["jewelry accessories under 25","Jewelry"]
];

function priceOf(r:any){const raw=r?.price?.value??r?.price?.raw??r?.prices?.[0]?.value??null;if(typeof raw==="number")return raw;if(typeof raw==="string"){const n=Number.parseFloat(raw.replace(/[^0-9,.-]/g,"").replace(",","."));return Number.isFinite(n)?n:null}return null}
function imageOf(r:any){return r?.image||r?.main_image?.link||r?.images?.[0]?.link||r?.thumbnail||""}
function ratingOf(r:any){return typeof r?.rating==="number"?r.rating:null}
function reviewCountOf(r:any){return Number(r?.ratings_total??r?.reviews_total??r?.rating_count??0)||0}
function score(price:number|null,rating:number|null,reviews:number){let s=52;if(price!=null){if(price<=20)s+=24;else if(price<=35)s+=18;else if(price<=60)s+=10;}if(rating!=null){if(rating>=4.6)s+=12;else if(rating>=4.3)s+=8;}if(reviews>=5000)s+=10;else if(reviews>=1000)s+=7;else if(reviews>=200)s+=4;return Math.min(99,s)}

async function searchAmazon(q:string,section:string,domain:string,page=0){
 const apiKey=process.env.RAINFOREST_API_KEY;if(!apiKey)return [];
 const params=new URLSearchParams({api_key:apiKey,type:"search",amazon_domain:domain,search_term:q,number_of_results:"16",exclude_sponsored:"true"});
 if(page>0)params.set("page",String(page+1));
 const r=await fetch(`https://api.rainforestapi.com/request?${params}`,{headers:{Accept:"application/json"},next:{revalidate:900}});if(!r.ok)return [];
 const raw:any=await r.json();return (Array.isArray(raw?.search_results)?raw.search_results:[]).map((x:any)=>{const price=priceOf(x),rating=ratingOf(x),reviews=reviewCountOf(x);return{id:`amazon-${x.asin}`,title:x.title||"Amazon product",brand:x.brand||x.manufacturer||"Amazon",price,currency:domain==="amazon.co.uk"?"GBP":domain==="amazon.com"?"USD":domain==="amazon.ca"?"CAD":domain==="amazon.com.au"?"AUD":"EUR",image:imageOf(x),url:x.link||x.url||(x.asin?`https://${domain}/dp/${x.asin}`:"#"),section,sections:[section,"Best Value","Amazon",...(q.includes("accessories")?["Accessories"]:[]),...(price!=null&&price<=25?["Under €25"]:[])],badge:price!=null&&price<=25?"Under €25":"Amazon value",score:score(price,rating,reviews),rating,reviews,source:"amazon-rainforest"}}).filter((x:any)=>x.price!=null&&x.image&&x.url!=="#");
}

export async function GET(req:NextRequest){const country=(req.nextUrl.searchParams.get("country")||"FR").toUpperCase(),page=Math.max(0,Number.parseInt(req.nextUrl.searchParams.get("page")||"0",10)||0),requestedSection=(req.nextUrl.searchParams.get("section")||"Best Value").slice(0,60);const domain=AMAZON_DOMAINS[country]||"amazon.fr";const broadSection=requestedSection==="Best Value"||requestedSection==="Under €25"||requestedSection==="Amazon"||requestedSection==="Accessories";const selectedQueries:readonly QueryPair[]=broadSection?QUERIES:QUERIES.filter(([,section])=>section===requestedSection);const settled=await Promise.allSettled(selectedQueries.map(([q,s])=>searchAmazon(q,s,domain,page)));const all=settled.flatMap(x=>x.status==="fulfilled"?x.value:[]);const seen=new Set<string>();const items=all.filter((x:any)=>{if(seen.has(x.id))return false;seen.add(x.id);if(requestedSection==="Under €25")return x.price<=25;if(requestedSection==="Accessories")return x.sections.includes("Accessories");return true}).sort((a:any,b:any)=>b.score-a.score).slice(0,100);return NextResponse.json({items,source:"amazon-rainforest",country,section:requestedSection,pagination:{page,has_more:Boolean(items.length)&&page<62,max_items_per_section:1000}},{headers:{"Cache-Control":"s-maxage=900, stale-while-revalidate=3600"}})}
