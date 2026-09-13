import { NextRequest, NextResponse } from "next/server";

export const runtime="nodejs";

const FASHION = [
  {id:"demo-1",title:"Satin Slip Dress",brand:"Atelier Noire",price:129,currency:"EUR",image:"https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Satin","Elegant","Black"]},
  {id:"demo-2",title:"Draped Midi Dress",brand:"Maison Vale",price:118,currency:"EUR",image:"https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Draped","Midi","Minimal"]},
  {id:"demo-3",title:"Bias Cut Maxi",brand:"Noma Studio",price:142,currency:"EUR",image:"https://images.unsplash.com/photo-1572804013309-59a8-5ddf8a6e9d64?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Maxi","Evening","Black"]},
  {id:"demo-4",title:"Minimal Column Dress",brand:"Eloise",price:99,currency:"EUR",image:"https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Minimal","Column","Elegant"]}
];

const NICHE_FALLBACK: Record<string, typeof FASHION> = {
  fitness: [
    {id:"fit-1",title:'Vital 5” Training Shorts',brand:"Form Athletics",price:49,currency:"EUR",image:"https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Breathable","Strength","Under €80"]},
    {id:"fit-2",title:"Flex Knit Trainer",brand:"Apex",price:59,currency:"EUR",image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Stable","Lightweight","Training"]},
    {id:"fit-3",title:"Recovery Roller",brand:"Grounded",price:35,currency:"EUR",image:"https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Recovery","Mobility","Top rated"]},
    {id:"fit-4",title:"Performance Training Tee",brand:"Form Athletics",price:45,currency:"EUR",image:"https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Quick dry","Relaxed fit","Workout gear"]},
  ],
  hair: [
    {id:"hair-1",title:"Multi-Peptide Density Serum",brand:"Nourish Lab",price:19.9,currency:"EUR",image:"https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Hair density","Daily use","Lightweight"]},
    {id:"hair-2",title:"Botanical Scalp Oil",brand:"Aera",price:34,currency:"EUR",image:"https://images.unsplash.com/photo-1601049676869-702ea24cfd58?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Scalp care","Natural","Pre-wash"]},
    {id:"hair-3",title:"Repair Ritual Mask",brand:"Mizu",price:38,currency:"EUR",image:"https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Repair","Weekly treatment","Women"]},
    {id:"hair-4",title:"Root Volume Mist",brand:"Onda",price:29,currency:"EUR",image:"https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Fuller-looking","Non-greasy","Under €30"]},
  ],
  skin: [
    {id:"skin-1",title:"Mela B3 Even Tone Serum",brand:"Common Ground",price:39.9,currency:"EUR",image:"https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Uneven tone","Sensitive skin","Niacinamide"]},
    {id:"skin-2",title:"Barrier Cloud Cream",brand:"Oath",price:36,currency:"EUR",image:"https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Barrier repair","Ceramides","Gentle"]},
    {id:"skin-3",title:"Calm Milk Cleanser",brand:"Mizu",price:24,currency:"EUR",image:"https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Cleanser","Fragrance-free","Daily"]},
    {id:"skin-4",title:"Mineral SPF 40",brand:"Aera",price:34,currency:"EUR",image:"https://images.unsplash.com/photo-1575410229391-19b4da01cc94?auto=format&fit=crop&w=800&q=80",url:"#",tags:["SPF","Sensitive skin","Visible results"]},
  ],
  smile: [
    {id:"smile-1",title:"Professional Whitening Strips",brand:"Pearl",price:44.9,currency:"EUR",image:"https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Whitening","14 treatments","Enamel care"]},
    {id:"smile-2",title:"Precision Whitening Pen",brand:"Onda",price:29,currency:"EUR",image:"https://images.unsplash.com/photo-1559591937-e0c4e4ea8f28?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Pen","At home","Daily care"]},
    {id:"smile-3",title:"Gentle Bright Paste",brand:"Calm",price:16,currency:"EUR",image:"https://images.unsplash.com/photo-1628359355624-855775b5c9c4?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Sensitive teeth","Everyday care","Under €30"]},
    {id:"smile-4",title:"Sonic Care Brush",brand:"Forma",price:59,currency:"EUR",image:"https://images.unsplash.com/photo-1559591935-c6c92c6f3f4a?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Electric brush","Top rated","Smile care"]},
  ]
};

const AMAZON_DOMAINS: Record<string, string> = {
  US:"amazon.com", GB:"amazon.co.uk", UK:"amazon.co.uk", FR:"amazon.fr", DE:"amazon.de",
  ES:"amazon.es", IT:"amazon.it", CA:"amazon.ca", AU:"amazon.com.au", NL:"amazon.nl",
  SE:"amazon.se", PL:"amazon.pl", BE:"amazon.com.be"
};

const EBAY_MARKETPLACES:Record<string,string>={US:"EBAY_US",GB:"EBAY_GB",UK:"EBAY_GB",FR:"EBAY_FR",DE:"EBAY_DE",ES:"EBAY_ES",IT:"EBAY_IT",CA:"EBAY_CA",AU:"EBAY_AU",NL:"EBAY_NL",PL:"EBAY_PL",BE:"EBAY_BE"};
let ebayTokenCache:{token:string;expiresAt:number}|null=null;

function fallbackFor(query:string){
  const q=query.toLowerCase();
  if(/gym|fitness|shorts|running|training|recovery/.test(q)) return NICHE_FALLBACK.fitness;
  if(/hair|scalp|density|shampoo/.test(q)) return NICHE_FALLBACK.hair;
  if(/skin|acne|blemish|tone|serum/.test(q)) return NICHE_FALLBACK.skin;
  if(/smile|teeth|tooth|whiten|oral/.test(q)) return NICHE_FALLBACK.smile;
  return FASHION;
}

function amazonPrice(r:any){
  const raw=r?.price?.value ?? r?.price?.raw ?? r?.prices?.[0]?.value ?? null;
  if(typeof raw==="number") return raw;
  if(typeof raw==="string"){
    const parsed=Number.parseFloat(raw.replace(/[^0-9,.-]/g,"").replace(",","."));
    return Number.isFinite(parsed)?parsed:null;
  }
  return null;
}
function amazonCurrency(r:any,domain:string){return r?.price?.currency || r?.currency || (domain==="amazon.co.uk"?"GBP":domain==="amazon.com"?"USD":domain==="amazon.ca"?"CAD":domain==="amazon.com.au"?"AUD":"EUR")}
function amazonImage(r:any){return r?.image || r?.main_image?.link || r?.images?.[0]?.link || r?.thumbnail || ""}
function productKey(p:any){return `${String(p.title||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}|${String(p.brand||"").toLowerCase()}`}

function mergeProducts(shopify:any[],amazon:any[]){
  const seen=new Set<string>();
  const merged:any[]=[];
  const max=Math.max(shopify.length,amazon.length);
  for(let i=0;i<max;i++){
    for(const p of [shopify[i],amazon[i]]){
      if(!p) continue;
      const key=productKey(p);
      if(!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(p);
      if(merged.length>=32) return merged;
    }
  }
  return merged;
}

async function fetchAmazon(query:string,country:string){
  const apiKey=process.env.RAINFOREST_API_KEY;
  if(!apiKey) return [];
  const domain=AMAZON_DOMAINS[country] || "amazon.com";
  const params=new URLSearchParams({api_key:apiKey,type:"search",amazon_domain:domain,search_term:query,number_of_results:"12",exclude_sponsored:"true"});
  const response=await fetch(`https://api.rainforestapi.com/request?${params.toString()}`,{headers:{Accept:"application/json"},next:{revalidate:60}});
  if(!response.ok) throw new Error(`Rainforest ${response.status}`);
  const raw:any=await response.json();
  return (Array.isArray(raw?.search_results)?raw.search_results:[])
    .map((r:any)=>({id:`amazon-${r.asin}`,title:r.title||"Amazon product",brand:r.brand||r?.manufacturer||"Amazon",price:amazonPrice(r),currency:amazonCurrency(r,domain),image:amazonImage(r),url:r?.link||r?.url||(r?.asin?`https://${domain}/dp/${r.asin}`:"#"),tags:["Amazon",...(r?.is_prime?["Prime"]:[]),...(typeof r?.rating==="number"?[`${r.rating}★`]:[])].slice(0,6),source:"amazon-rainforest",asin:r.asin}))
    .filter((p:any)=>p.id&&p.image);
}

async function fetchShopify(query:string,country:string,cursor?:string){
  const payload={jsonrpc:"2.0",method:"tools/call",id:1,params:{name:"search_catalog",arguments:{meta:{"ucp-agent":{profile:"https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json"}},catalog:{query,filters:{available:true,ships_to:{country}},context:{address_country:country,intent:query},pagination:{limit:20,...(cursor?{cursor}:{})}}}}};
  const response=await fetch("https://catalog.shopify.com/api/ucp/mcp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const raw:any=await response.json();
  const content=raw?.result?.structuredContent;
  if(!response.ok || !content?.products) throw new Error("Catalog unavailable");
  const products=content.products.map((p:any)=>{
    const price=p?.price_range?.min||p?.variants?.[0]?.price;
    return {id:p.id,title:p.title,brand:p?.variants?.[0]?.seller?.name||p?.seller?.name||"Shopify merchant",price:price?Number(price.amount)/100:null,currency:price?.currency||"USD",image:p?.media?.find((m:any)=>m.type==="image")?.url||p?.media?.[0]?.url||"",url:p.url||p?.variants?.[0]?.seller?.url||"#",tags:[...new Set((p?.variants||[]).flatMap((v:any)=>v?.tags||[]))].slice(0,6),source:"shopify-global-catalog"};
  }).filter((p:any)=>p.image);
  return {products,pagination:content.pagination||{}};
}

async function getEbayApplicationToken(){
  if(ebayTokenCache&&Date.now()<ebayTokenCache.expiresAt) return ebayTokenCache.token;
  const clientId=process.env.EBAY_CLIENT_ID;
  const clientSecret=process.env.EBAY_CLIENT_SECRET;
  if(!clientId||!clientSecret) throw new Error("eBay credentials missing");
  const auth=Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body=new URLSearchParams({grant_type:"client_credentials",scope:"https://api.ebay.com/oauth/api_scope"});
  const response=await fetch("https://api.ebay.com/identity/v1/oauth2/token",{method:"POST",headers:{Authorization:`Basic ${auth}`,"Content-Type":"application/x-www-form-urlencoded"},body:body.toString(),cache:"no-store"});
  if(!response.ok) throw new Error(`eBay OAuth ${response.status}`);
  const data:any=await response.json();
  const token=String(data?.access_token||"");
  const expiresIn=Number(data?.expires_in||7200);
  if(!token) throw new Error("eBay OAuth token missing");
  ebayTokenCache={token,expiresAt:Date.now()+Math.max(60,expiresIn-120)*1000};
  return token;
}

function ebayQuality(item:any){
  const feedback=Number(item?.seller?.feedbackPercentage);
  const score=Number(item?.seller?.feedbackScore);
  if(Number.isFinite(feedback)&&feedback<95) return false;
  if(!item?.image?.imageUrl || !item?.itemWebUrl || !item?.price?.value) return false;
  if(Number.isFinite(score)&&score<0) return false;
  return true;
}

async function fetchEbay(query:string,country:string){
  const token=await getEbayApplicationToken();
  const marketplace=EBAY_MARKETPLACES[country]||"EBAY_FR";
  const params=new URLSearchParams({q:query,limit:"32",fieldgroups:"EXTENDED"});
  const response=await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params.toString()}`,{headers:{Authorization:`Bearer ${token}`,"X-EBAY-C-MARKETPLACE-ID":marketplace,Accept:"application/json"},next:{revalidate:45}});
  if(!response.ok) throw new Error(`eBay Browse ${response.status}`);
  const raw:any=await response.json();
  return (Array.isArray(raw?.itemSummaries)?raw.itemSummaries:[])
    .filter(ebayQuality)
    .map((item:any)=>{
      const feedback=Number(item?.seller?.feedbackPercentage);
      const score=Number(item?.seller?.feedbackScore);
      const condition=String(item?.condition||"").trim();
      const trusted=Number.isFinite(feedback)&&feedback>=98.5&&Number.isFinite(score)&&score>=100;
      return {
        id:`ebay-${item.itemId}`,
        title:item.title||"eBay item",
        brand:item?.seller?.username||"eBay seller",
        price:Number(item?.price?.value)||null,
        currency:item?.price?.currency||"EUR",
        image:item?.image?.imageUrl||item?.thumbnailImages?.[0]?.imageUrl||"",
        url:item?.itemWebUrl||"#",
        tags:["eBay",...(condition?[condition]:[]),...(trusted?["Verified seller"]:[]),...(item?.buyingOptions?.includes("AUCTION")?["Auction"]:["Buy now"])].slice(0,6),
        source:"ebay-marketplace",
        marketplace,
        sellerFeedback:Number.isFinite(feedback)?feedback:null
      };
    });
}

export async function GET(req:NextRequest){
  const search=req.nextUrl.searchParams;
  const base=(search.get("q")||"black dress for a wedding under 150").slice(0,300);
  const direction=(search.get("direction")||"").slice(0,100);
  const cursor=search.get("cursor")||undefined;
  const country=(search.get("country")||"FR").toUpperCase().slice(0,2);
  const market=search.get("market")==="ebay"?"ebay":"lumina";
  const query=direction?`${base}, ${direction}`:base;

  if(market==="ebay"){
    try{
      const products=await fetchEbay(query,country);
      return NextResponse.json({source:"ebay-marketplace",sources:["ebay-marketplace"],market:"ebay",query,products,pagination:{has_next_page:false}},{headers:{"Cache-Control":"s-maxage=45, stale-while-revalidate=180"}});
    }catch(error){
      console.error("eBay catalog error",error);
      return NextResponse.json({source:"ebay-marketplace",sources:["ebay-marketplace"],market:"ebay",query,products:[],pagination:{has_next_page:false},error:"eBay marketplace is temporarily unavailable"},{status:200});
    }
  }

  const [shopifyResult,amazonResult]=await Promise.allSettled([fetchShopify(query,country,cursor),cursor?Promise.resolve([]):fetchAmazon(query,country)]);
  const shopify=shopifyResult.status==="fulfilled"?shopifyResult.value:{products:[],pagination:{}};
  const amazon=amazonResult.status==="fulfilled"?amazonResult.value:[];
  const products=mergeProducts(shopify.products,amazon);

  if(products.length){
    const sources=[...(shopify.products.length?["shopify-global-catalog"]:[]),...(amazon.length?["amazon-rainforest"]:[])];
    return NextResponse.json({source:shopify.products.length?"shopify-global-catalog":"amazon-rainforest",sources,market:"lumina",query,products,pagination:shopify.pagination||{}},{headers:{"Cache-Control":"s-maxage=45, stale-while-revalidate=300"}});
  }
  return NextResponse.json({source:"fallback",sources:["fallback"],market:"lumina",query,products:fallbackFor(query),pagination:{has_next_page:false}});
}
