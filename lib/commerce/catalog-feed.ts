import { createHash } from "crypto";
import { buildQuote } from "./engine";
import { fxRate } from "./currency";
import { clusterByIdentity, productFingerprint, shopperTitle } from "./product-identity";

export type FeedCountry = "FR"|"DE"|"ES"|"IT"|"NL"|"BE"|"GB"|"US"|"CA"|"AU";
export type FeedCategory =
  "home"|"fashion"|"beauty"|"health"|"tech"|"fitness"|"kitchen"|"pets"|
  "office"|"travel"|"outdoors"|"gifts"|"general";

export type SupplierOffer={
  merchantDomain:string;
  merchantName:string;
  sourceUrl:string;
  sourceProductId:string;
  sourceVariantId?:string|null;
  sourcePrice:number;
  sourceCurrency:string;
  shippingReserve:number;
  ynotPrice:number;
  grossContribution:number;
  marginPct:number;
  reliabilityScore:number;
  routingScore:number;
};

export type CatalogFeedProduct = {
  ynotId:string;
  sourceProductId:string;
  sourceVariantId?:string|null;
  title:string;
  originalTitle:string;
  brand:string;
  sourceBrand?:string|null;
  sellerName:"YNOT";
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
  supplierOfferCount:number;
  supplierOffers:SupplierOffer[];
  pricePosition?:"budget"|"value"|"premium"|"alternative";
};

const COUNTRY_CURRENCY:Record<FeedCountry,string>={
  FR:"EUR",DE:"EUR",ES:"EUR",IT:"EUR",NL:"EUR",BE:"EUR",GB:"GBP",US:"USD",CA:"CAD",AU:"AUD"
};

const DEFAULT_SHIPPING:Record<FeedCountry,number>={
  FR:6.9,DE:7.9,ES:8.9,IT:8.9,NL:7.9,BE:7.9,GB:7.9,US:8.9,CA:9.9,AU:10.9
};


export const CATEGORY_BRANDS:Record<Exclude<FeedCategory,"general">,string[]>={
  fashion:[
    "Nike","Adidas","New Balance","Levi's","Calvin Klein","Tommy Hilfiger","Ralph Lauren","The North Face",
    "Patagonia","Gymshark","Alo Yoga","Lululemon","Under Armour","Puma","Reebok","ASICS","On Running",
    "Hoka","Dr. Martens","Birkenstock","Steve Madden","Coach","Michael Kors","Kate Spade","Diesel",
    "True Religion","Carhartt","Dickies","G-Star RAW","AllSaints","Represent","Fear of God ESSENTIALS",
    "Good American","SKIMS","Spanx","House of CB","Oh Polly","Meshki","Reformation","Abercrombie & Fitch"
  ],
  beauty:[
    "The Ordinary","CeraVe","La Roche-Posay","COSRX","Beauty of Joseon","Laneige","Kiehl's","Clinique",
    "Estée Lauder","Lancôme","MAC","NARS","Charlotte Tilbury","Rare Beauty","Fenty Beauty","Huda Beauty",
    "e.l.f. Cosmetics","NYX","Maybelline","L'Oréal Paris","Olaplex","Kérastase","Moroccanoil","Sol de Janeiro",
    "Paula's Choice","Drunk Elephant","Tatcha","Sunday Riley","Glow Recipe","K18","ghd","Dyson Beauty"
  ],
  health:[
    "Optimum Nutrition","Myprotein","Bulk","Applied Nutrition","Dymatize","Rule One","Ghost","Legion Athletics",
    "Transparent Labs","Thorne","NOW Foods","Solgar","Garden of Life","Nordic Naturals","Vital Proteins",
    "LMNT","Liquid I.V.","Nuun","AG1","Bloom Nutrition","OLLY","Ritual","Huel","Vega","Orgain"
  ],
  fitness:[
    "Gymshark","Nike","Adidas","Under Armour","Lululemon","Alo Yoga","Puma","Reebok","ASICS","New Balance",
    "On Running","Hoka","Rogue Fitness","Bowflex","NordicTrack","Peloton","Concept2","TRX","Hyperice",
    "Therabody","REP Fitness","Eleiko","Technogym","Life Fitness","ProForm"
  ],
  tech:[
    "Apple","Samsung","Google","Sony","Bose","JBL","Beats","Sennheiser","Anker","Belkin","Logitech","Razer",
    "ASUS","Acer","Lenovo","Dell","HP","LG","BenQ","Nothing","Garmin","Fitbit","DJI","GoPro","Sonos",
    "Marshall","Roborock","iRobot","Ecovacs","Dyson","Philips Hue"
  ],
  home:[
    "IKEA","West Elm","CB2","Article","Burrow","Floyd","Castlery","Rove Concepts","Ashley Furniture",
    "La-Z-Boy","Herman Miller","Steelcase","Tempur-Pedic","Casper","Purple","Saatva","Emma","Simba",
    "Ruggable","Loloi","Safavieh","Jonathan Adler","Kartell","Muuto","HAY"
  ],
  kitchen:[
    "Ninja","KitchenAid","Breville","Smeg","Le Creuset","Staub","Zwilling","Wüsthof","Vitamix","Nespresso",
    "De'Longhi","Fellow","Ooni","Instant Pot","Our Place","Caraway","HexClad","Lodge","OXO","Hydro Flask"
  ],
  pets:[
    "KONG","Ruffwear","Wild One","Fable","Furbo","PetSafe","Whistle","Fi","Kurgo","Earth Rated",
    "Catit","Litter-Robot","Tuft + Paw","Orijen","Acana","Royal Canin"
  ],
  office:[
    "Herman Miller","Steelcase","Humanscale","Branch","Autonomous","FlexiSpot","Secretlab","Logitech",
    "Keychron","BenQ","Dell","LG","Ergotron","Grovemade","Twelve South"
  ],
  travel:[
    "Samsonite","Rimowa","TUMI","Away","Monos","July","Delsey","Travelpro","Briggs & Riley","Horizn Studios",
    "Bellroy","Peak Design","Patagonia","The North Face","Osprey","Herschel","Calpak","Béis"
  ],
  outdoors:[
    "Patagonia","The North Face","Arc'teryx","Columbia","Salomon","Merrell","Osprey","YETI","Coleman",
    "Black Diamond","MSR","Sea to Summit","Hydro Flask","Garmin","Goal Zero","Jackery","EcoFlow"
  ],
  gifts:[
    "LEGO","Pandora","Swarovski","Coach","Kate Spade","Jo Malone","Diptyque","Le Creuset","YETI",
    "Apple","Bose","Lego","Rituals","Fortnum & Mason","Hotel Chocolat"
  ]
};

export const BRAND_CATEGORY_QUERIES:Record<Exclude<FeedCategory,"general">,string[]>=Object.fromEntries(
  Object.entries(CATEGORY_BRANDS).map(([category,brands])=>[
    category,
    brands.map(brand=>brand)
  ])
) as Record<Exclude<FeedCategory,"general">,string[]>;

export const CATEGORY_QUERIES:Record<Exclude<FeedCategory,"general">,string[]>={
  home:[
    "sofa","sectional sofa","accent chair","dining table","coffee table","bed frame","mattress","floor lamp",
    "table lamp","area rug","wall mirror","bookshelf","storage cabinet","nightstand","office chair","home decor"
  ],
  fashion:[
    "women dress","midi dress","maxi dress","mini dress","women jeans","women leggings","activewear leggings",
    "sports bra","women blazer","women jacket","women coat","women top","women bodysuit","women swimwear",
    "women bikini","women sneakers","women boots","men hoodie","men t-shirt","men jeans","men sneakers",
    "handbag","crossbody bag","shoulder bag","backpack","sunglasses","jewelry"
  ],
  beauty:[
    "face serum","vitamin c serum","hyaluronic acid serum","moisturizer","face cleanser","sunscreen","retinol serum",
    "eye cream","lip balm","foundation makeup","concealer","mascara","lipstick","blush","bronzer","eyeshadow palette",
    "shampoo","conditioner","hair mask","hair oil","hair dryer","hair straightener","curling iron","skincare set",
    "body lotion","fragrance perfume"
  ],
  health:[
    "protein powder","whey protein","plant protein","creatine monohydrate","electrolyte powder","hydration powder",
    "multivitamin","vitamin d","vitamin c","magnesium supplement","zinc supplement","omega 3","collagen powder",
    "fiber supplement","probiotic","greens powder","meal replacement shake","sports nutrition"
  ],
  tech:[
    "smartphone","tablet","laptop","smartwatch","wireless earbuds","noise cancelling headphones","bluetooth speaker",
    "gaming keyboard","gaming mouse","monitor","webcam","portable projector","power bank","USB-C charger",
    "smart home camera","smart light","robot vacuum","air purifier"
  ],
  fitness:[
    "women gym leggings","sports bra","gym shorts","gym top","men gym shorts","men gym shirt","running shoes",
    "dumbbells","adjustable dumbbells","kettlebell","weight bench","pull up bar","treadmill","exercise bike",
    "rowing machine","resistance bands","yoga mat","lifting belt","lifting straps","foam roller","massage gun",
    "protein shaker","gym bag"
  ],
  kitchen:[
    "air fryer","espresso machine","coffee machine","blender","stand mixer","rice cooker","toaster oven",
    "cookware set","frying pan","chef knife","knife set","food processor","water filter","vacuum sealer",
    "food storage set","water bottle","coffee grinder"
  ],
  pets:[
    "dog food","cat food","dog bed","cat bed","automatic pet feeder","pet water fountain","dog harness","dog leash",
    "cat tree","dog toy","cat toy","pet grooming kit","pet carrier","pet stroller","dog crate"
  ],
  office:[
    "ergonomic office chair","standing desk","office desk","monitor","desk lamp","laptop stand","monitor arm",
    "mechanical keyboard","wireless mouse","webcam","desk organizer","filing cabinet","printer","office storage"
  ],
  travel:[
    "carry on luggage","checked luggage","hard shell suitcase","weekender bag","travel backpack","duffel bag",
    "packing cubes","toiletry bag","travel pillow","passport holder","luggage set","travel organizer"
  ],
  outdoors:[
    "camping tent","sleeping bag","camping chair","hiking boots","hiking backpack","portable power station",
    "camping stove","cooler","outdoor grill","headlamp","water filter","dry bag","picnic blanket"
  ],
  gifts:[
    "luxury gift set","beauty gift set","skincare gift set","perfume gift set","jewelry gift","watch gift",
    "home gift set","coffee gift set","tech gift","fitness gift","birthday gift","anniversary gift"
  ]
};

function cleanText(value:unknown){
  return String(value||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
}
function domainOf(raw:string){
  try{return new URL(raw).hostname.toLowerCase().replace(/^www\./,"")}catch{return""}
}
function rounded(n:number){return Math.round(n*100)/100}
function stableYnotId(country:FeedCountry,fingerprint:string){
  const hash=createHash("sha256").update(country+"|"+fingerprint).digest("hex").slice(0,24);
  return "ynot-"+country.toLowerCase()+"-"+hash;
}

const FX_CACHE=new Map<string,Promise<number>>();
function cachedFx(from:string,to:string){
  const source=String(from||"EUR").toUpperCase(),target=String(to||"EUR").toUpperCase();
  if(source===target)return Promise.resolve(1);
  const key=source+"->"+target;
  let pending=FX_CACHE.get(key);
  if(!pending){
    pending=fxRate(source,target).catch(error=>{FX_CACHE.delete(key);throw error});
    FX_CACHE.set(key,pending);
  }
  return pending;
}

async function marketizeProducts(products:CatalogFeedProduct[],country:FeedCountry){
  const target=COUNTRY_CURRENCY[country];
  const currencies=[...new Set(products.map(p=>String(p.sourceCurrency||target).toUpperCase()))];
  const rates=new Map<string,number>();
  await Promise.all(currencies.map(async currency=>{
    try{rates.set(currency,await cachedFx(currency,target))}
    catch{if(currency===target)rates.set(currency,1)}
  }));

  return products.flatMap(product=>{
    const sourceCurrency=String(product.sourceCurrency||target).toUpperCase();
    const rate=rates.get(sourceCurrency);
    if(!rate)return[];
    const sourcePrice=rounded(product.sourcePrice*rate);
    const quote=buildQuote({
      sourceId:product.source,
      merchantId:product.merchantDomain||product.brand,
      productId:product.sourceProductId,
      title:product.originalTitle,
      category:product.category,
      price:sourcePrice,
      currency:target,
      shipping:product.shippingReserve,
      stockConfidence:.78,
      returnPolicyScore:.72,
      regionMatch:.82,
      paymentFeePct:.029
    });
    const offerBase=product.supplierOffers[0];
    const offer:SupplierOffer={
      ...offerBase,
      sourcePrice,
      sourceCurrency:target,
      shippingReserve:product.shippingReserve,
      ynotPrice:rounded(quote.luminaPrice),
      grossContribution:rounded(quote.grossContribution),
      marginPct:rounded(quote.marginPct),
      reliabilityScore:rounded(quote.reliabilityScore),
      routingScore:rounded(quote.routingScore)
    };
    const adEligible=
      quote.state==="buy-with-lumina" &&
      quote.grossContribution>=8 &&
      quote.marginPct>=12 &&
      quote.reliabilityScore>=60;
    return [{
      ...product,
      sourcePrice,
      sourceCurrency:target,
      ynotPrice:offer.ynotPrice,
      grossContribution:offer.grossContribution,
      marginPct:offer.marginPct,
      reliabilityScore:offer.reliabilityScore,
      routingScore:offer.routingScore,
      adEligible,
      supplierOffers:[offer]
    }];
  });
}

function inferCategory(query:string):FeedCategory{
  const q=query.toLowerCase();
  if(/sofa|chair|lamp|rug|furniture|decor|mirror|shelf|bedding|home/.test(q))return"home";
  if(/bag|dress|shirt|tee|t-shirt|sweatshirt|hoodie|jacket|coat|trouser|pant|jean|skirt|shoe|sneaker|belt|wallet|sunglass|jewel|fashion|clothing|apparel/.test(q))return"fashion";
  if(/beauty|skin|hair|makeup|facial|cosmetic|serum|cream|brush/.test(q))return"beauty";
  if(/protein|creatine|electrolyte|vitamin|magnesium|zinc|omega|collagen|probiotic|supplement|nutrition|hydration|greens powder/.test(q))return"health";
  if(/headphone|earbud|charger|phone|keyboard|mouse|speaker|smart|tech|electronic/.test(q))return"tech";
  if(/fitness|gym|workout|training|yoga|lifting|recovery|sport/.test(q))return"fitness";
  if(/coffee|kitchen|air fryer|cook|bottle|food storage|utensil/.test(q))return"kitchen";
  if(/dog|cat|pet|puppy|kitten/.test(q))return"pets";
  if(/office|desk|monitor|ergonomic|work from home|laptop stand/.test(q))return"office";
  if(/travel|luggage|carry on|packing|passport|weekender/.test(q))return"travel";
  if(/camp|hiking|outdoor|picnic|trail/.test(q))return"outdoors";
  if(/gift|present|birthday|housewarming|anniversary/.test(q))return"gifts";
  return"general";
}

function intentTags(title:string,category:FeedCategory,query?:string){
  const text=(title+" "+(query||"")).toLowerCase();
  const categorySeeds=category==="general"?[]:CATEGORY_QUERIES[category];
  const candidates=[
    ...categorySeeds,
    "under 50","under 100","gift","everyday","portable","compact","premium","budget","best value"
  ];
  return [...new Set(candidates.filter(tag=>{
    const parts=tag.toLowerCase().split(/\s+/);
    return parts.some(p=>p.length>3&&text.includes(p));
  }))].slice(0,12);
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
    cache:"no-store",
    signal:AbortSignal.timeout(10000)
  });
  const raw:any=await response.json();
  const content=raw?.result?.structuredContent;
  if(!response.ok||!Array.isArray(content?.products))return[];
  return content.products;
}

function mapProduct(raw:any,category:FeedCategory,country:FeedCountry,query?:string):CatalogFeedProduct|null{
  const variant=Array.isArray(raw?.variants)?raw.variants.find((v:any)=>v?.available!==false)||raw.variants[0]:null;
  const price=raw?.price_range?.min||variant?.price;
  const amount=Number(price?.amount)/100;
  if(!Number.isFinite(amount)||amount<=0)return null;

  const originalTitle=cleanText(raw?.title);
  const titleCategory=inferCategory(originalTitle);
  const resolvedCategory=titleCategory==="general"?category:titleCategory;
  const sourceUrl=String(raw?.url||variant?.url||variant?.seller?.url||"");
  const merchantDomain=domainOf(sourceUrl);
  const image=String(raw?.media?.[0]?.url||variant?.image?.url||variant?.media?.[0]?.url||"");
  if(!originalTitle||!sourceUrl.startsWith("https://")||!image)return null;

  const merchantName=cleanText(variant?.seller?.name||raw?.seller?.name||merchantDomain||"Shopify merchant");
  const sourceBrand=cleanText(raw?.brand||raw?.vendor||raw?.manufacturer||merchantName)||merchantName;
  const shipping=shippingReserve(country,merchantDomain);
  const quote=buildQuote({
    sourceId:"shopify-global-catalog",
    merchantId:merchantDomain||merchantName,
    productId:String(raw?.id||variant?.id||sourceUrl),
    title:originalTitle,
    category,
    price:amount,
    currency:String(price?.currency||COUNTRY_CURRENCY[country]),
    shipping,
    stockConfidence:.78,
    returnPolicyScore:.72,
    regionMatch:.82,
    paymentFeePct:.029
  });

  const fp=productFingerprint({title:originalTitle,brand:sourceBrand,category:resolvedCategory,sourcePrice:amount,merchantDomain,image});
  const ynotId=stableYnotId(country,fp);
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

  const offer:SupplierOffer={
    merchantDomain,
    merchantName,
    sourceUrl,
    sourceProductId:String(raw?.id||sourceUrl),
    sourceVariantId:variant?.id?String(variant.id):null,
    sourcePrice:rounded(amount),
    sourceCurrency:String(price?.currency||COUNTRY_CURRENCY[country]),
    shippingReserve:rounded(shipping),
    ynotPrice:rounded(quote.luminaPrice),
    grossContribution:rounded(quote.grossContribution),
    marginPct:rounded(quote.marginPct),
    reliabilityScore:rounded(quote.reliabilityScore),
    routingScore:rounded(quote.routingScore)
  };

  return{
    ynotId,
    sourceProductId:offer.sourceProductId,
    sourceVariantId:offer.sourceVariantId,
    title:shopperTitle(originalTitle),
    originalTitle,
    brand:sourceBrand||"YNOT",
    sourceBrand:sourceBrand||null,
    sellerName:"YNOT",
    category:resolvedCategory,
    country,
    source:"shopify-global-catalog",
    merchantDomain,
    sourceUrl,
    image,
    images:images.length?images:[image],
    sourcePrice:offer.sourcePrice,
    sourceCurrency:offer.sourceCurrency,
    shippingReserve:offer.shippingReserve,
    ynotPrice:offer.ynotPrice,
    grossContribution:offer.grossContribution,
    marginPct:offer.marginPct,
    reliabilityScore:offer.reliabilityScore,
    routingScore:offer.routingScore,
    adEligible,
    intentTags:intentTags(originalTitle,resolvedCategory,query),
    fingerprint:fp,
    supplierOfferCount:1,
    supplierOffers:[offer]
  };
}

function bestOffer(offers:CatalogFeedProduct[]){
  return [...offers].sort((a,b)=>
    (Number(b.adEligible)-Number(a.adEligible)) ||
    (b.routingScore-a.routingScore) ||
    (b.grossContribution-a.grossContribution) ||
    (a.ynotPrice-b.ynotPrice)
  )[0];
}

function collapseSupplierOffers(products:CatalogFeedProduct[]){
  const clusters=clusterByIdentity(products);
  return clusters.map(cluster=>{
    const best=bestOffer(cluster);
    const supplierOffers=cluster
      .map(p=>p.supplierOffers[0])
      .sort((a,b)=>(b.routingScore-a.routingScore)||(b.grossContribution-a.grossContribution));
    return{
      ...best,
      ynotId:stableYnotId(best.country,best.fingerprint),
      supplierOfferCount:supplierOffers.length,
      supplierOffers:supplierOffers.slice(0,12)
    };
  });
}

function applyPriceLadder(products:CatalogFeedProduct[],limit:number){
  const sorted=[...products].sort((a,b)=>a.ynotPrice-b.ynotPrice);
  if(!sorted.length)return[];
  if(sorted.length<=4){
    return sorted.map((p,i)=>({...p,pricePosition:(["budget","value","premium","alternative"][i]||"alternative") as CatalogFeedProduct["pricePosition"]}));
  }
  const candidates=[
    {...sorted[0],pricePosition:"budget" as const},
    {...sorted[Math.floor((sorted.length-1)*.38)],pricePosition:"value" as const},
    {...sorted[Math.floor((sorted.length-1)*.72)],pricePosition:"premium" as const}
  ];
  const selected=new Set(candidates.map(x=>x.ynotId));
  const rest=products
    .filter(p=>!selected.has(p.ynotId))
    .sort((a,b)=>b.routingScore-a.routingScore)
    .map(p=>({...p,pricePosition:"alternative" as const}));
  return [...candidates,...rest].slice(0,limit);
}

async function mapLimit<T,R>(items:T[],limit:number,fn:(item:T,index:number)=>Promise<R>){
  const out=new Array<R>(items.length);
  let cursor=0;
  async function worker(){
    while(true){
      const index=cursor++;
      if(index>=items.length)return;
      out[index]=await fn(items[index],index);
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,items.length)},()=>worker()));
  return out;
}

const QUERY_STOP=new Set([
  "find","show","looking","look","need","want","best","good","great","cheap","cheaper","premium",
  "recommend","recommendation","please","for","with","that","this","from","under","below","over",
  "above","less","than","more","around","about","between","and","the","some","any","option","options",
  "product","products","buy","purchase","euro","euros","eur","usd","gbp","dollar","dollars"
]);
const COLOR_WORDS=new Set([
  "black","white","grey","gray","beige","cream","brown","blue","navy","green","red","pink",
  "purple","orange","yellow","gold","silver","khaki","tan","burgundy"
]);

function stemToken(token:string){
  const t=token.toLowerCase();
  return t.length>4&&t.endsWith("s")?t.slice(0,-1):t;
}
function queryAnchorTokens(query:string){
  return query.toLowerCase()
    .replace(/[^a-z0-9]+/g," ")
    .split(/\s+/)
    .map(stemToken)
    .filter(t=>t.length>2&&!QUERY_STOP.has(t)&&!COLOR_WORDS.has(t)&&!/^\d+$/.test(t));
}
function titleTokenSet(title:string){
  return new Set(title.toLowerCase().replace(/[^a-z0-9]+/g," ").split(/\s+/).filter(Boolean).map(stemToken));
}
function intentRelevance(query:string,product:CatalogFeedProduct){
  const anchors=queryAnchorTokens(query);
  if(!anchors.length)return 1;
  const title=titleTokenSet(product.originalTitle||product.title);
  const hits=anchors.filter(token=>title.has(token)).length;
  const phrase=query.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const normalizedTitle=(product.originalTitle||product.title).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const phraseBonus=phrase.length>3&&(normalizedTitle.includes(phrase)||phrase.includes(normalizedTitle)) ? .35 : 0;
  return Math.min(1,hits/anchors.length+phraseBonus);
}
function exactSupplierTitle(title:string){
  return title.toLowerCase()
    .replace(/\b(pack|set)\s+of\s+\d+\b/g," ")
    .replace(/[^a-z0-9]+/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function collapseExactTitleOffers(products:CatalogFeedProduct[]){
  const groups=new Map<string,CatalogFeedProduct[]>();
  for(const product of products){
    const key=exactSupplierTitle(product.originalTitle||product.title);
    const group=groups.get(key)||[];
    group.push(product);
    groups.set(key,group);
  }
  return [...groups.values()].map(group=>{
    const best=bestOffer(group);
    const seen=new Set<string>();
    const supplierOffers=group
      .map(p=>p.supplierOffers[0])
      .filter(offer=>{
        const key=`${offer.merchantDomain}|${offer.sourceProductId}|${offer.sourceVariantId||""}`;
        if(seen.has(key))return false;
        seen.add(key);return true;
      })
      .sort((a,b)=>(b.routingScore-a.routingScore)||(b.grossContribution-a.grossContribution));
    return{...best,supplierOfferCount:supplierOffers.length,supplierOffers:supplierOffers.slice(0,12)};
  });
}

export async function searchCatalogIntent(query:string,country:FeedCountry,limit=12){
  const category=inferCategory(query);

  // Search the shopper's exact request first. We deliberately do not fan a precise
  // request out into sibling category terms: "protein powder" must not become joggers,
  // and "crossbody bag" must not become belts or backpacks.
  const raw=await shopifySearch(query,country);
  const mappedRaw=raw
    .map(item=>mapProduct(item,category,country,query))
    .filter(Boolean) as CatalogFeedProduct[];
  const mapped=await marketizeProducts(mappedRaw,country);

  const anchors=queryAnchorTokens(query);
  const ranked=mapped
    .map(product=>({product,relevance:intentRelevance(query,product)}))
    .sort((a,b)=>(b.relevance-a.relevance)||(b.product.routingScore-a.product.routingScore));

  // Require a meaningful title anchor when the shopper supplied a concrete product noun.
  // If Shopify metadata is sparse, retain a small exact-search fallback rather than
  // widening into unrelated category products.
  const strict=anchors.length
    ? ranked.filter(x=>x.relevance>=Math.min(.5,1/anchors.length))
    : ranked;
  const initial=(strict.length>=3?strict:ranked.slice(0,Math.max(3,limit*2)))
    .map(x=>x.product)
    .filter(p=>p.adEligible);

  // For the strongest product identities, search the exact Shopify title again.
  // This is the supplier-discovery pass: Shopify frequently returns many merchants
  // using the same title, so YNOT can compare those offers without changing what
  // the shopper sees.
  const identitySeeds=collapseExactTitleOffers(initial)
    .sort((a,b)=>(b.routingScore-a.routingScore)||(b.grossContribution-a.grossContribution))
    .slice(0,Math.min(8,Math.max(4,limit)));

  const supplierSearches=await Promise.allSettled(
    identitySeeds.map(seed=>shopifySearch(seed.originalTitle,country))
  );
  const supplierMatchesRaw:CatalogFeedProduct[]=[];
  supplierSearches.forEach((result,index)=>{
    if(result.status!=="fulfilled")return;
    const seed=identitySeeds[index];
    const wanted=exactSupplierTitle(seed.originalTitle);
    for(const rawItem of result.value){
      const candidate=mapProduct(rawItem,category,country,query);
      if(!candidate||!candidate.adEligible)continue;
      if(exactSupplierTitle(candidate.originalTitle)===wanted)supplierMatchesRaw.push(candidate);
    }
  });

  const supplierMatches=await marketizeProducts(supplierMatchesRaw,country);
  const collapsed=collapseExactTitleOffers([...initial,...supplierMatches])
    .filter(p=>p.adEligible)
    .filter(p=>!anchors.length||intentRelevance(query,p)>=Math.min(.5,1/anchors.length))
    .sort((a,b)=>
      (intentRelevance(query,b)-intentRelevance(query,a)) ||
      (b.routingScore-a.routingScore) ||
      (b.grossContribution-a.grossContribution)
    );

  return{
    query,
    country,
    category,
    products:applyPriceLadder(collapsed,Math.max(3,Math.min(30,limit)))
  };
}

export async function buildCatalogFeed(opts:{
  countries?:FeedCountry[];
  categories?:Exclude<FeedCategory,"general">[];
  perCategory?:number;
  adEligibleOnly?:boolean;
  concurrency?:number;
}={}){
  const countries=opts.countries?.length?opts.countries:["FR","DE","ES","IT","NL","BE","GB","US","CA"];
  const categories=opts.categories?.length?opts.categories:[
    "home","fashion","beauty","health","tech","fitness","kitchen","pets","office","travel","outdoors","gifts"
  ];
  const perCategory=Math.max(50,Math.min(1000,opts.perCategory||400));
  const jobs=countries.flatMap(country=>categories.map(category=>({country,category})));

  const groups=await mapLimit(jobs,Math.max(1,Math.min(10,opts.concurrency||6)),async({country,category})=>{
    const genericQueries=CATEGORY_QUERIES[category];
    const brandQueries=BRAND_CATEGORY_QUERIES[category]||[];
    // Brand-first discovery: query established brands directly, then broaden with
    // category demand terms. This keeps generic accessories from dominating the feed.
    const queries=[...brandQueries,...genericQueries];
    const settled=await Promise.allSettled(queries.map(q=>shopifySearch(q,country)));
    const mappedRaw=settled.flatMap(result=>
      result.status==="fulfilled"
        ? result.value.map(raw=>mapProduct(raw,category,country)).filter(Boolean) as CatalogFeedProduct[]
        : []
    );
    const mapped=await marketizeProducts(mappedRaw,country);

    const brandNames=new Set((CATEGORY_BRANDS[category]||[]).map(x=>x.toLowerCase()));
    return collapseSupplierOffers(mapped)
      .filter(p=>!opts.adEligibleOnly||p.adEligible)
      .map(p=>{
        const sourceBrand=String(p.sourceBrand||p.brand||"").toLowerCase();
        const directBrand=[...brandNames].some(b=>sourceBrand.includes(b)||b.includes(sourceBrand));
        return {...p,__brandBoost:directBrand?1:0} as CatalogFeedProduct & {__brandBoost:number};
      })
      .sort((a,b)=>
        ((b as any).__brandBoost-(a as any).__brandBoost) ||
        (Number(b.adEligible)-Number(a.adEligible)) ||
        (b.routingScore-a.routingScore) ||
        (b.supplierOfferCount-a.supplierOfferCount) ||
        (b.grossContribution-a.grossContribution)
      )
      .slice(0,perCategory)
      .map(({__brandBoost,...p}:any)=>p);
  });

  return groups.flat();
}
