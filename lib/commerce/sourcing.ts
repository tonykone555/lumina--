import {getAliExpressDetails,searchAliExpress,type FetchLayerMarket,type FetchLayerSearchProduct} from "./fetchlayer";
import {landedCost as commerceLandedCost} from "./engine";

export type SourcingInput={
 title:string;
 brand?:string;
 retailPrice:number;
 mainSupplierPrice?:number;
 category?:string;
 currency:string;
 shipTo:string;
 language?:"en_US"|"de_DE"|"pt_BR";
};

function tokens(v:string){
 return [...new Set(String(v||"").toLowerCase().replace(/[^a-z0-9]+/g," ").split(/\s+/).filter(x=>x.length>2))];
}
function overlap(a:string,b:string){
 const left=tokens(a),right=new Set(tokens(b));
 return left.length?left.filter(x=>right.has(x)).length/left.length:0;
}
function brandMatch(brand:string|undefined,title:string){
 const value=String(brand||"").trim().toLowerCase();
 return Boolean(value&&value!=="ynot"&&value!=="shopify merchant"&&title.toLowerCase().includes(value));
}
function matchInfo(input:SourcingInput,p:FetchLayerSearchProduct){
 const score=overlap(input.title,p.title),brand=brandMatch(input.brand,p.title);
 if(brand&&score>=.72)return{type:"exact" as const,confidence:Math.min(.99,.72+score*.25)};
 if(score>=.52)return{type:"equivalent" as const,confidence:Math.min(.92,.48+score*.42)};
 return{type:"similar" as const,confidence:Math.min(.78,.3+score*.55)};
}
function shippingAmount(details:any){
 const fee=details?.product?.shipping?.fee;
 if(typeof fee==="number")return Math.max(0,fee);
 const amount=Number(fee?.amount);
 return Number.isFinite(amount)?Math.max(0,amount):0;
}
const money=(n:number)=>Math.round(n*100)/100;

export function creatorOfferFromMainSupplier(input:SourcingInput){
 const supplier=Number(input.mainSupplierPrice);
 if(!Number.isFinite(supplier)||supplier<=0||supplier>=input.retailPrice)return null;
 const protectedCost=commerceLandedCost({
  sourceId:"shopify-main",
  productId:"baseline",
  title:input.title,
  category:input.category,
  price:supplier,
  currency:input.currency,
  shipping:0,
  stockConfidence:.75,
  returnPolicyScore:.7,
  regionMatch:.75
 });
 const contribution=money(Math.max(0,input.retailPrice-protectedCost));
 const creatorShare=Math.max(0,Math.min(.9,Number(process.env.YNOT_CREATOR_MARGIN_SHARE||.7)));
 const minYnotMargin=Math.max(0,Number(process.env.YNOT_MIN_REALIZED_MARGIN_EUR||5));
 const creatorPayout=money(Math.max(0,Math.min(contribution*creatorShare,contribution-minYnotMargin)));
 return{
  supplier:"shopify",
  protectedCost,
  availableMargin:contribution,
  creatorPayout,
  creatorPayoutRate:money(creatorPayout/input.retailPrice),
  ynotRetainedMargin:money(Math.max(0,contribution-creatorPayout))
 };
}

export async function findAliExpressSources(input:SourcingInput){
 if(!Number.isFinite(input.retailPrice)||input.retailPrice<=0)throw new Error("INVALID_RETAIL_PRICE");
 const baseline=creatorOfferFromMainSupplier(input);
 const market:FetchLayerMarket={
  shipTo:input.shipTo.toUpperCase(),
  currency:input.currency.toUpperCase(),
  language:input.language||"en_US"
 };
 const query=[input.brand,input.title].filter(Boolean).join(" ").slice(0,200);
 const searched=await searchAliExpress(query,market,60);
 const shortlist=searched.products
  .filter(p=>Number(p.price?.amount||0)>0)
  .map(p=>({p,score:overlap(input.title,p.title)+(brandMatch(input.brand,p.title)?0.35:0)+(Number(p.rating||0)>=4.5?0.08:0)+(Number(p.soldCount||0)>100?0.05:0)}))
  .sort((a,b)=>b.score-a.score)
  .slice(0,5);

 const candidates=[];
 for(const {p} of shortlist){
  let details:any=null;
  try{details=await getAliExpressDetails(p.productId,market)}catch{}
  const unit=Number(details?.product?.price?.amount??p.price?.amount??0);
  if(!Number.isFinite(unit)||unit<=0)continue;
  const shipping=shippingAmount(details);
  const landedCost=money(unit+shipping);
  if(landedCost>=input.retailPrice)continue;
  const grossMargin=money(input.retailPrice-landedCost);
  const paymentReserve=money(input.retailPrice*.032+.30);
  const riskReserve=money(input.retailPrice*.05);
  const availableMargin=money(Math.max(0,grossMargin-paymentReserve-riskReserve));
  const creatorShare=Math.max(0,Math.min(.9,Number(process.env.YNOT_CREATOR_MARGIN_SHARE||.7)));
  const minYnotMargin=Math.max(0,Number(process.env.YNOT_MIN_REALIZED_MARGIN_EUR||5));
  const creatorPayout=money(Math.max(0,Math.min(availableMargin*creatorShare,availableMargin-minYnotMargin)));
  const ynotRetainedMargin=money(Math.max(0,availableMargin-creatorPayout));
  const match=matchInfo(input,p);
  candidates.push({
   productId:p.productId,title:p.title,url:p.url,imageUrl:p.imageUrl||null,
   price:money(unit),shipping:money(shipping),landedCost,
   retailPrice:money(input.retailPrice),availableMargin,creatorPayout,
   creatorPayoutRate:money(creatorPayout/input.retailPrice),
   ynotRetainedMargin,rating:details?.product?.rating??p.rating??null,
   soldCount:details?.product?.soldCount??p.soldCount??null,
   store:details?.product?.store||null,delivery:shippingInfo,
   matchType:match.type,matchConfidence:money(match.confidence),
   safeToRepresentAsOriginal:match.type==="exact",
   hasClearDelivery,cheaperThanMain,eligibleForBoost,
   extraCreatorPayout:eligibleForBoost?money(creatorPayout-(baseline?.creatorPayout||0)):0,
   market
  });
 }
 candidates.sort((a,b)=>(Number(b.eligibleForBoost)-Number(a.eligibleForBoost))||(b.creatorPayout-a.creatorPayout)||(b.matchConfidence-a.matchConfidence));
 const bestBoost=candidates.find(x=>x.eligibleForBoost)||null;
 return{query,market:searched.market,notes:searched.notes,baseline,candidates,best:bestBoost,boost:bestBoost};
}
