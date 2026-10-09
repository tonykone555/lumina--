import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function authorized(request:NextRequest){
 const bearer=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 const mcp=process.env.YNOT_MCP_TOKEN||"";
 const dashboardPin=process.env.YNOT_EBAY_DASHBOARD_PIN||"";
 return Boolean(bearer&&((mcp&&bearer===mcp)||(dashboardPin&&bearer===dashboardPin)));
}
function appUrl(){
 return (process.env.NEXT_PUBLIC_APP_URL||process.env.APP_URL||"https://ynotworld.app").replace(/\/$/,"");
}
const EUROPE=new Set(["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","NO","CH","IS","LI","GB"]);
const SPECIALIST_QUERIES=[
 "industrial PLC module","variable frequency drive","industrial sensor","industrial replacement part",
 "professional camera","camera lens","medium format camera","cinema camera",
 "electric bike","mountain e-bike","cargo e-bike",
 "guitar amplifier","electric guitar","acoustic guitar","synthesizer","audio interface","DJ equipment",
 "espresso machine","commercial coffee grinder","prosumer coffee machine",
 "server hardware","enterprise networking","oscilloscope","test equipment",
 "Hilti parts","Siemens module","Schneider Electric drive","Allen-Bradley module","Tektronix","Leica"
];
const DESIGN_LIGHTING_QUERIES=[
 "designer pendant light","sculptural pendant light","modern pendant light","oval pendant light",
 "acrylic pendant light","dining room pendant light","statement pendant light","designer ceiling light",
 "modern chandelier","sculptural chandelier","contemporary chandelier","LED pendant light",
 "minimalist pendant light","Japanese inspired pendant light","luxury pendant lighting","cluster pendant light"
];

function parseIntent(q:string,body:any){
 const lower=q.toLowerCase();
 const countMatch=lower.match(/\b(?:find|show|get|give me)?\s*(\d{1,5})\b/);
 const profitMatch=lower.match(/(?:at least|minimum|min\.?|over|above)\s*€?\s*(\d+(?:[.,]\d+)?).*?profit|profit.*?(?:at least|minimum|min\.?|over|above)?\s*€?\s*(\d+(?:[.,]\d+)?)/i);
 const priceMatch=lower.match(/(?:expensive|high[- ]value)/i);
 const count=Math.max(1,Number(countMatch?.[1]||body?.requestedCount||30));
 const minProfit=Math.max(0,Number(String(profitMatch?.[1]||profitMatch?.[2]||0).replace(",","."))||0);
 const europe=/\beurope|european|eu\b/i.test(lower);
 const specialist=/\bspecialist|industrial|professional|hard[- ]?to[- ]?find|replacement part|spare part\b/i.test(lower);
 const ebayFrance=/ebay\s*france|ebay\.fr|resell.*france|sell.*france/i.test(lower);
 const designLighting=/\blamp|lamps|lighting|light fixture|pendant|chandelier|ceiling light|suspension\b/i.test(lower);
 return{count,minProfit,europe,specialist,ebayFrance,designLighting,highValue:Boolean(priceMatch)};
}
function targetMargin(cost:number){
 if(cost<=50)return .30;if(cost<=75)return .27;if(cost<=100)return .25;if(cost<=150)return .23;
 if(cost<=200)return .22;if(cost<=300)return .20;if(cost<=500)return .18;if(cost<=750)return .17;
 if(cost<=1000)return .16;return .15;
}
function estimate(price:number){
 if(!Number.isFinite(price)||price<=0)return{estimatedResale:null,estimatedProfit:null,marginPct:null};
 const margin=targetMargin(price);
 const resale=Math.round((price/(1-margin))*100)/100;
 return{estimatedResale:resale,estimatedProfit:Math.round((resale-price)*100)/100,marginPct:Math.round(margin*1000)/10};
}
function normalizeProduct(p:any,source:any,queryUsed:string){
 const price=Number(p?.price??p?.supplierPrice??p?.ynotPrice??0);
 const currency=String(p?.currency||p?.sourceCurrency||"EUR").toUpperCase();
 const country=String(p?.origin_country||p?.originCountry||p?.country||p?.shippingCountry||"").toUpperCase();
 const est=estimate(price);
 return{
  id:p?.id||p?.ynotId||null,
  title:p?.title||"",
  brand:p?.brand||p?.sourceBrand||"",
  category:p?.category||"",
  price:Number.isFinite(price)?price:null,
  currency,
  image:p?.image||p?.images?.[0]||null,
  images:Array.isArray(p?.images)?p.images:[],
  url:p?.url||p?.merchant_url||p?.source_url||null,
  source:p?.source||source||"YNOT",
  originCountry:country||null,
  queryUsed,
  estimatedResale:est.estimatedResale,
  estimatedProfit:est.estimatedProfit,
  marginPct:est.marginPct
 };
}
async function catalogSearch(q:string){
 const url=new URL("/api/catalog",appUrl());
 url.searchParams.set("q",q);
 url.searchParams.set("country","FR");
 url.searchParams.set("source","all");
 const r=await fetch(url,{cache:"no-store"});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(j?.error||`CATALOG_${r.status}`);
 return{source:j?.source||null,products:Array.isArray(j?.products)?j.products:[]};
}

export async function POST(request:NextRequest){
 if(!authorized(request))return NextResponse.json({error:"unauthorized"},{status:401});
 try{
  const body=await request.json().catch(()=>({}));
  const query=String(body?.query||"").trim();
  if(!query)return NextResponse.json({error:"QUERY_REQUIRED"},{status:400});

  const intent=parseIntent(query,body);
  const looksNatural=/\bfind me|could i resell|potential profit|at least|in europe|specialist products|on ebay/i.test(query);
  const searches=looksNatural
    ? [...(intent.specialist||intent.highValue?SPECIALIST_QUERIES:[]),...(intent.designLighting?DESIGN_LIGHTING_QUERIES:[]),query]
    : intent.designLighting?[...DESIGN_LIGHTING_QUERIES,query]:[query];

  const seen=new Set<string>();
  const products:any[]=[];
  const searchStats:any[]=[];
  for(const term of searches){
   try{
    const result=await catalogSearch(term);
    let added=0;
    for(const raw of result.products){
      const p=normalizeProduct(raw,result.source,term);
      const key=String(p.id||p.url||`${p.title}|${p.price}`);
      if(!key||seen.has(key))continue;
      seen.add(key);
      if(intent.europe&&p.originCountry&&!EUROPE.has(p.originCountry))continue;
      if(intent.highValue&&Number(p.price||0)<250)continue;
      if(intent.minProfit&&Number(p.estimatedProfit||0)<intent.minProfit)continue;
      products.push(p);added++;
    }
    searchStats.push({query:term,returned:result.products.length,added});
   }catch(error){
    searchStats.push({query:term,returned:0,added:0,error:error instanceof Error?error.message:"SEARCH_FAILED"});
   }
  }
  products.sort((a,b)=>(Number(b.estimatedProfit||0)-Number(a.estimatedProfit||0))||(Number(b.price||0)-Number(a.price||0)));
  const offset=Math.max(0,Number(body?.offset||0));
  const pageSize=Math.max(1,Math.min(60,Number(body?.pageSize||30)));
  const page=products.slice(offset,offset+pageSize);
  return NextResponse.json({
    query,
    interpreted:{
      requestedCount:intent.count,
      minPotentialProfit:intent.minProfit||null,
      europeOnly:intent.europe,
      specialist:intent.specialist,
      targetMarketplace:intent.ebayFrance?"EBAY_FR":"EBAY_FR",
      note:intent.minProfit?"Potential profit is a YNOT margin estimate until live eBay comparable pricing is checked.":null
    },
    searchedQueries:searchStats,
    products:page,
    totalCandidates:products.length,
    offset,
    pageSize,
    nextOffset:offset+page.length,
    hasMore:offset+page.length<products.length
  });
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:"SEARCH_FAILED"},{status:500});
 }
}
