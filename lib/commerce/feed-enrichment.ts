export type EnrichmentInput={
  ynot_id:string; title:string; original_title?:string|null; brand?:string|null; source_brand?:string|null;
  category:string; country:string; image_url?:string|null; image_urls?:unknown; ynot_price:number; currency:string;
  best_source_url?:string|null; best_supplier_domain?:string|null; margin_pct?:number|null;
  reliability_score?:number|null; supplier_offer_count?:number|null; intent_tags?:string[]|null;
  active?:boolean; ad_eligible?:boolean;
};

export type EnrichmentResult={
  commerce_status:"needs_enrichment"|"needs_verification"|"commerce_ready"|"blocked";
  quality_score:number;
  cleaned_title:string;
  enriched_description:string;
  category_path:string;
  normalized_attributes:Record<string,unknown>;
  use_cases:string[];
  search_terms:string[];
  enrichment_reasons:string[];
};

const CATEGORY_PATH:Record<string,string>={
  fashion:"Apparel & Accessories",
  beauty:"Health & Beauty",
  tech:"Electronics",
  fitness:"Sporting Goods",
  home:"Home & Garden",
  kitchen:"Home & Garden > Kitchen & Dining",
  pets:"Animals & Pet Supplies",
  office:"Office Supplies",
  travel:"Luggage & Bags",
  outdoors:"Sporting Goods > Outdoor Recreation",
  gifts:"Arts & Entertainment > Party & Celebration",
  general:"General Merchandise"
};

const COLORS=["black","white","grey","gray","beige","cream","brown","blue","navy","green","red","pink","purple","orange","yellow","gold","silver","khaki","tan","burgundy"];
const MATERIALS=["cotton","linen","leather","suede","denim","polyester","nylon","silicone","stainless steel","steel","glass","wood","wool","ceramic","aluminum","aluminium"];
const BLOCK_PATTERNS=[
  /\b(?:gun|rifle|ammo|ammunition|firearm|silencer)\b/i,
  /\b(?:vape|nicotine|cigarette)\b/i,
  /\b(?:cbd|thc|cannabis|marijuana)\b/i,
  /\b(?:steroid|hormone)\b/i,
  /\b(?:casino|betting|gambling)\b/i
];

function text(v:unknown){return String(v||"").replace(/<[^>]*>/g," ").replace(/[\u0000-\u001f]+/g," ").replace(/\s+/g," ").trim()}
function titleCase(v:string){return v.toLowerCase().replace(/(^|[\s\-/])([a-z])/g,(_,a,b)=>a+b.toUpperCase())}
function uniq(xs:string[],max=20){return [...new Set(xs.map(x=>x.trim()).filter(Boolean))].slice(0,max)}
function tokens(v:string){return v.toLowerCase().replace(/[^a-z0-9]+/g," ").split(/\s+/).filter(x=>x.length>2)}

function cleanTitle(raw:string,brand?:string|null){
  let s=text(raw)
    .replace(/[|•]+/g," - ")
    .replace(/\b(?:free shipping|hot sale|best seller|new arrival)\b/ig,"")
    .replace(/\s+-\s+-+/g," - ")
    .replace(/\s{2,}/g," ")
    .trim();
  if(brand&&s.toLowerCase().startsWith(String(brand).toLowerCase()+" "))s=s.slice(String(brand).length).trim();
  if(s.length>110)s=s.slice(0,107).replace(/\s+\S*$/,"")+"…";
  return titleCase(s||raw);
}

function attributes(raw:string){
  const t=raw.toLowerCase(),attrs:Record<string,unknown>={};
  const color=COLORS.find(x=>new RegExp("\\b"+x+"\\b","i").test(t));
  if(color)attrs.color=color==="gray"?"grey":color;
  const material=MATERIALS.find(x=>t.includes(x));
  if(material)attrs.material=material;
  if(/\b(?:women|woman|female)\b/i.test(t))attrs.audience="women";
  else if(/\b(?:men|man|male)\b/i.test(t))attrs.audience="men";
  else if(/\b(?:kids|children|child)\b/i.test(t))attrs.audience="kids";
  else if(/\b(?:dog|cat|pet)\b/i.test(t))attrs.audience="pets";
  return attrs;
}

function useCases(category:string,raw:string){
  const t=raw.toLowerCase(),out:string[]=[];
  if(["fashion","beauty","tech","home","kitchen"].includes(category))out.push("everyday use");
  if(category==="travel"||/portable|compact|carry|travel/.test(t))out.push("travel");
  if(category==="fitness"||/gym|workout|training|yoga/.test(t))out.push("workouts");
  if(category==="home"&&/storage|organizer|shelf|basket/.test(t))out.push("home organization");
  if(category==="gifts"||/gift|set/.test(t))out.push("gifting");
  if(category==="outdoors"||/camp|hiking|outdoor/.test(t))out.push("outdoor use");
  if(category==="pets")out.push("pet care");
  return uniq(out,6);
}

export function enrichCatalogProduct(p:EnrichmentInput):EnrichmentResult{
  const raw=text(p.original_title||p.title);
  const cleaned=cleanTitle(raw,p.source_brand||p.brand);
  const reasons:string[]=[];
  let score=100;

  const blocked=BLOCK_PATTERNS.some(r=>r.test(raw));
  if(blocked){score=0;reasons.push("policy-blocked-category")}
  if(!p.active){score-=100;reasons.push("inactive")}
  if(!p.ad_eligible){score-=35;reasons.push("not-ad-eligible")}
  if(!p.image_url){score-=45;reasons.push("missing-primary-image")}
  const imgs=Array.isArray(p.image_urls)?p.image_urls:[];
  if(imgs.length<2){score-=8;reasons.push("limited-image-set")}
  if(!p.best_source_url||!/^https:\/\//i.test(p.best_source_url)){score-=35;reasons.push("invalid-source-url")}
  if(!p.best_supplier_domain){score-=15;reasons.push("missing-supplier-domain")}
  if(!Number.isFinite(Number(p.ynot_price))||Number(p.ynot_price)<=0){score-=60;reasons.push("invalid-price")}
  if(!p.currency||String(p.currency).length!==3){score-=20;reasons.push("invalid-currency")}
  if(Number(p.supplier_offer_count||0)<1){score-=20;reasons.push("no-supplier-offer")}
  if(Number(p.reliability_score||0)<45){score-=20;reasons.push("low-supplier-reliability")}
  if(Number(p.margin_pct||0)<12){score-=15;reasons.push("thin-margin")}
  if(raw.length<8){score-=20;reasons.push("title-too-short")}
  if(raw.length>150){score-=8;reasons.push("title-too-long")}
  if(/\b(?:sku|wholesale|dropship|aliexpress|temu)\b/i.test(raw)){score-=10;reasons.push("supplier-language-in-title")}
  if(!p.source_brand){score-=5;reasons.push("missing-source-brand")}

  score=Math.max(0,Math.min(100,Math.round(score)));
  const attrs=attributes(raw+" "+(p.intent_tags||[]).join(" "));
  const uses=useCases(p.category,raw);
  const terms=uniq([cleaned,...tokens(raw),...(p.intent_tags||[]),...uses],24);

  let status:EnrichmentResult["commerce_status"];
  if(blocked||score<40)status="blocked";
  else if(score<72)status="needs_enrichment";
  else if(score<82||reasons.some(x=>["low-supplier-reliability","invalid-source-url","missing-supplier-domain"].includes(x)))status="needs_verification";
  else status="commerce_ready";

  const detail=[attrs.color,attrs.material,attrs.audience].filter(Boolean).join(", ");
  const use=uses.length?" Suitable for "+uses.slice(0,3).join(", ")+".":"";
  const desc=(cleaned+" from "+(p.source_brand||p.brand||"a YNOT marketplace seller")+". "+p.category+" product"+(detail?" with "+detail:"")+"."+use+" Available through YNOT in "+p.country+".").replace(/\s+/g," ").trim().slice(0,1000);

  return{
    commerce_status:status,
    quality_score:score,
    cleaned_title:cleaned,
    enriched_description:desc,
    category_path:CATEGORY_PATH[p.category]||"General Merchandise",
    normalized_attributes:attrs,
    use_cases:uses,
    search_terms:terms,
    enrichment_reasons:reasons
  };
}
