import { buildQuote } from "./engine";

export type FeedCountry = "FR"|"DE"|"ES"|"IT"|"NL"|"BE"|"GB"|"US"|"CA"|"AU";
export type FeedCategory = "home"|"fashion"|"beauty"|"tech"|"fitness"|"kitchen"|"pets";

export type CatalogFeedProduct = {
  ynotId:string;
  sourceProductId:string;
  sourceVariantId?:string|null;
  title:string;
  brand:string;
  category:FeedCategory;
  country:FeedCountry;
  source:"shopify-global-catalog";
  merchantDomain:string;
  sourceUrl:string;
  image:string;
  images:string[];
  sourcePrice:number;
  sourceCurrency:string;
  shippingReserve:number;
  ynotPrice:number;
  grossContribution:number;
  marginPct:number;
  reliabilityScore:number;
  routingScore:number;
  adEligible:boolean;
  intentTags:string[];
  fingerprint:string;
};

const COUNTRY_CURRENCY:Record<FeedCountry,string>={
  FR:"EUR",DE:"EUR",ES:"EUR",IT:"EUR",NL:"EUR",BE:"EUR",GB:"GBP",US:"USD",CA:"CAD",AU:"AUD"
};

const DEFAULT_SHIPPING:Record<FeedCountry,number>={
  FR:6.9,DE:7.9,ES:8.9,IT:8.9,NL:7.9,BE:7.9,GB:7.9,US:8.9,CA:9.9,AU:10.9
};

const CATEGORY_QUERIES:Record<FeedCategory,string[]>={
  home:["table lamp","desk lamp","storage organizer","side table","wall mirror","throw blanket","home decor","small shelf"],
  fashion:["crossbody bag","shoulder bag","backpack","sunglasses","belt","jewelry","wallet","cap"],
  beauty:["hair tool","facial device","skincare tool","makeup organizer","hair brush","beauty device","face roller","cosmetic bag"],
  tech:["wireless earbuds","headphones","power bank","phone stand","USB-C charger","desk charger","keyboard","smart light"],
  fitness:["gym bag","resistance bands","recovery tool","lifting straps","shaker bottle","yoga mat","foam roller","training accessory"],
  kitchen:["coffee accessory","air fryer accessory","kitchen organizer","food storage","water bottle","kitchen gadget","utensil set","coffee grinder accessory"],
  pets:["dog toy","cat toy","pet bed","pet grooming tool","pet travel bowl","dog leash","pet organizer","pet accessory"]
};

function cleanText(value:unknown){
  return String(value||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
}
function domainOf(raw:string){
  try{return new URL(raw).hostname.toLowerCase().replace(/^www\./,"")}catch{return""}
}
function rounded(n:number){return Math.round(n*100)/100}
function normalizeTitle(title:string){
  return title.toLowerCase()
    .replace(/\b(pack|set)\s+of\s+\d+\b/g," ")
    .replace(/\b\d+(?:\.\d+)?\s*(?:ml|l|cm|mm|inch|inches|oz|kg|g)\b/g," ")
    .replace(/[^a-z0-9]+/g," ")
    .replace(/\s+/g," ")
    .trim();
}
function fingerprint(title:string,category:string){
  const stop=new Set(["with","and","for","the","new","premium","portable","wireless","smart","pro","mini"]);
  const words=normalizeTitle(title).split(" ").filter(w=>w.length>2&&!stop.has(w)).slice(0,8);
  return category+":"+words.join("-");
}
function intentTags(title:string,category:FeedCategory){
  const text=title.toLowerCase();
  const candidates=[
    ...CATEGORY_QUERIES[category],
    "under 50","under 100","gift","everyday","portable","compact","premium","budget","best value"
  ];
  return [...new Set(candidates.filter(tag=>{
    const parts=tag.toLowerCase().split(/\s+/);
    return parts.some(p=>p.length>3&&text.includes(p)) || tag===CATEGORY_QUERIES[category][0];
  }))].slice(0,10);
}

function shippingReserve(country:FeedCountry,merchantDomain:string){
  const raw=process.env.YNOT_CATALOG_SHIPPING_JSON;
  if(raw){
    try{
      const parsed=JSON.parse(raw);
      const domainRule=parsed?.[merchantDomain];
      const countryRule=parsed?.[country];
      const value=domainRule?.[country]??domainRule?.default??countryRule??parsed?.default;
      if(Number.isFinite(Number(value)))return Number(value);
    }catch{}
  }
  return DEFAULT_SHIPPING[country];
}

async function shopifySearch(query:string,country:FeedCountry){
  const payload={
    jsonrpc:"2.0",
    method:"tools/call",
    id:1,
    params:{
      name:"search_catalog",
      arguments:{
        meta:{"ucp-agent":{profile:"https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json"}},
        catalog:{
          query,
          filters:{available:true,ships_to:{country}},
          context:{address_country:country,intent:query},
          pagination:{limit:50}
        }
      }
    }
  };

  const response=await fetch("https://catalog.shopify.com/api/ucp/mcp",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload),
    cache:"no-store"
  });
  const raw:any=await response.json();
  const content=raw?.result?.structuredContent;
  if(!response.ok||!Array.isArray(content?.products))return[];

  return content.products;
}

function mapProduct(raw:any,category:FeedCategory,country:FeedCountry):CatalogFeedProduct|null{
  const variant=Array.isArray(raw?.variants)?raw.variants.find((v:any)=>v?.available!==false)||raw.variants[0]:null;
  const price=raw?.price_range?.min||variant?.price;
  const amount=Number(price?.amount)/100;
  if(!Number.isFinite(amount)||amount<=0)return null;

  const title=cleanText(raw?.title);
  const sourceUrl=String(raw?.url||variant?.url||variant?.seller?.url||"");
  const merchantDomain=domainOf(sourceUrl);
  const image=String(raw?.media?.[0]?.url||variant?.image?.url||variant?.media?.[0]?.url||"");
  if(!title||!sourceUrl.startsWith("https://")||!image)return null;

  const brand=cleanText(variant?.seller?.name||raw?.seller?.name||merchantDomain||"Shopify merchant");
  const shipping=shippingReserve(country,merchantDomain);
  const quote=buildQuote({
    sourceId:"shopify-global-catalog",
    merchantId:merchantDomain||brand,
    productId:String(raw?.id||variant?.id||sourceUrl),
    title,
    category,
    price:amount,
    currency:String(price?.currency||COUNTRY_CURRENCY[country]),
    shipping,
    stockConfidence:.78,
    returnPolicyScore:.72,
    regionMatch:.82,
    paymentFeePct:.029
  });

  const fp=fingerprint(title,category);
  const ynotId="ynot-"+Buffer.from(country+"|"+fp).toString("base64url").slice(0,28);
  const images=[...new Set(
    (Array.isArray(raw?.media)?raw.media:[])
      .map((m:any)=>String(m?.url||m?.image?.url||""))
      .filter(Boolean)
  )].slice(0,8);

  const adEligible=
    quote.state==="buy-with-lumina" &&
    quote.grossContribution>=8 &&
    quote.marginPct>=12 &&
    quote.reliabilityScore>=60;

  return{
    ynotId,
    sourceProductId:String(raw?.id||sourceUrl),
    sourceVariantId:variant?.id?String(variant.id):null,
    title,
    brand,
    category,
    country,
    source:"shopify-global-catalog",
    merchantDomain,
    sourceUrl,
    image,
    images:images.length?images:[image],
    sourcePrice:rounded(amount),
    sourceCurrency:String(price?.currency||COUNTRY_CURRENCY[country]),
    shippingReserve:rounded(shipping),
    ynotPrice:rounded(quote.luminaPrice),
    grossContribution:rounded(quote.grossContribution),
    marginPct:rounded(quote.marginPct),
    reliabilityScore:rounded(quote.reliabilityScore),
    routingScore:rounded(quote.routingScore),
    adEligible,
    intentTags:intentTags(title,category),
    fingerprint:fp
  };
}

export async function buildCatalogFeed(opts:{
  countries?:FeedCountry[];
  categories?:FeedCategory[];
  perCategory?:number;
  adEligibleOnly?:boolean;
}={}){
  const countries=opts.countries?.length?opts.countries:["FR","DE","ES","IT","NL","BE","GB","US","CA"];
  const categories=opts.categories?.length?opts.categories:["home","fashion","beauty","tech","fitness","kitchen","pets"];
  const perCategory=Math.max(20,Math.min(300,opts.perCategory||120));
  const rows:CatalogFeedProduct[]=[];

  for(const country of countries){
    for(const category of categories){
      const queries=CATEGORY_QUERIES[category];
      const settled=await Promise.allSettled(queries.map(q=>shopifySearch(q,country)));
      const mapped=settled.flatMap(result=>
        result.status==="fulfilled"
          ? result.value.map(raw=>mapProduct(raw,category,country)).filter(Boolean) as CatalogFeedProduct[]
          : []
      );

      const byFingerprint=new Map<string,CatalogFeedProduct>();
      for(const product of mapped){
        const current=byFingerprint.get(product.fingerprint);
        if(!current){
          byFingerprint.set(product.fingerprint,product);
          continue;
        }
        const better=
          product.grossContribution>current.grossContribution+2 ||
          (Math.abs(product.grossContribution-current.grossContribution)<=2 && product.routingScore>current.routingScore);
        if(better)byFingerprint.set(product.fingerprint,product);
      }

      const categoryRows=[...byFingerprint.values()]
        .filter(p=>!opts.adEligibleOnly||p.adEligible)
        .sort((a,b)=>
          (Number(b.adEligible)-Number(a.adEligible)) ||
          (b.routingScore-a.routingScore) ||
          (b.grossContribution-a.grossContribution)
        )
        .slice(0,perCategory);

      rows.push(...categoryRows);
    }
  }

  return rows;
}
