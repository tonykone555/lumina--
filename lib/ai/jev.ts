/**
 * YNOT Jev decision layer.
 *
 * Jev is intentionally advisory: deterministic money/payment/permission rules
 * remain authoritative. Set TYPESAFE_API_KEY in Vercel to enable live decisions.
 */
export type JevDecisionKind =
  | "catalogue" | "economics" | "supplier" | "search" | "personalization"
  | "payment_presentation" | "creator_match" | "commission" | "creative_route"
  | "ad_action" | "creative_qc" | "fulfillment" | "trend_relevance" | "viral_pattern" | "product_trend_fit" | "pitch_angle" | "prompt_strategy";

export type JevChoice = {label:string; description?:string};
export type JevQuestion = {id:string; question:string; choices:JevChoice[]};
export type JevDecision = {id:string; choice:string; confidence?:number; raw?:unknown};
export type JevContext = Record<string,unknown>;

const ENDPOINT=process.env.TYPESAFE_JEV_ENDPOINT || "https://api.typesafe-ai.com/v1/jev";
const enabled=()=>Boolean(process.env.TYPESAFE_API_KEY);

function fallback(questions:JevQuestion[]):JevDecision[]{
  return questions.map(q=>({id:q.id,choice:q.choices[0]?.label||"MANUAL_REVIEW",confidence:0}));
}

export async function askJev(context:JevContext,questions:JevQuestion[]):Promise<JevDecision[]>{
  if(!enabled()) return fallback(questions);
  try{
    const res=await fetch(ENDPOINT,{
      method:"POST",
      headers:{"content-type":"application/json","authorization":`Bearer ${process.env.TYPESAFE_API_KEY}`},
      body:JSON.stringify({context,questions}),
      cache:"no-store",
    });
    if(!res.ok) return fallback(questions);
    const data=await res.json();
    const answers=Array.isArray(data?.answers)?data.answers:Array.isArray(data?.results)?data.results:[];
    return questions.map((q,i)=>{
      const a=answers.find((x:any)=>x?.id===q.id)??answers[i]??{};
      return {id:q.id,choice:String(a.choice??a.answer??q.choices[0]?.label??"MANUAL_REVIEW"),confidence:Number.isFinite(Number(a.confidence))?Number(a.confidence):undefined,raw:a};
    });
  }catch{return fallback(questions)}
}

export const YNOT_JEV_DECISIONS:Record<JevDecisionKind,JevQuestion> = {
  catalogue:{id:"catalogue",question:"Should this product be surfaced in the YNOT catalogue?",choices:[{label:"KEEP"},{label:"REVIEW"},{label:"REJECT"}]},
  economics:{id:"economics",question:"Given the already-calculated economics, how should YNOT classify this product?",choices:[{label:"DISCOVER_ONLY"},{label:"PROMOTABLE"},{label:"AD_WORTHY"},{label:"HIGH_PRIORITY"}]},
  supplier:{id:"supplier",question:"Which supplier-routing action is appropriate for this offer?",choices:[{label:"USE"},{label:"VERIFY"},{label:"REJECT"}]},
  search:{id:"search",question:"Does this product genuinely satisfy the shopper's search intent?",choices:[{label:"MATCH"},{label:"WEAK_MATCH"},{label:"NO_MATCH"}]},
  personalization:{id:"personalization",question:"Should this product be promoted into the shopper's next bubble-world results?",choices:[{label:"BOOST"},{label:"NEUTRAL"},{label:"DOWNRANK"}]},
  payment_presentation:{id:"payment_presentation",question:"Given authoritative payment eligibility supplied in context, which payment presentation should YNOT show?",choices:[{label:"STANDARD"},{label:"SHOW_BNPL"},{label:"HIDE_BNPL"}]},
  creator_match:{id:"creator_match",question:"How strong is the product-to-creator fit?",choices:[{label:"STRONG"},{label:"POSSIBLE"},{label:"POOR"}]},
  commission:{id:"commission",question:"Which pre-approved commission band best fits the supplied economics?",choices:[{label:"LOW"},{label:"STANDARD"},{label:"HIGH"}]},
  creative_route:{id:"creative_route",question:"Which creative workflow should YNOT route this product into?",choices:[{label:"VIDEO_TO_VIDEO"},{label:"IMAGE_TO_VIDEO"},{label:"UGC_AVATAR"},{label:"PRODUCT_ANIMATION"},{label:"STATIC"}]},
  ad_action:{id:"ad_action",question:"Within the supplied hard budget limits, what should happen to this ad?",choices:[{label:"KEEP_TESTING"},{label:"MAKE_VARIATION"},{label:"PAUSE"},{label:"HUMAN_REVIEW"}]},
  creative_qc:{id:"creative_qc",question:"Does this generated creative preserve the intended product and meet the supplied creative requirements?",choices:[{label:"ACCEPT"},{label:"RETRY"},{label:"HUMAN_REVIEW"}]},
  fulfillment:{id:"fulfillment",question:"Given authoritative stock, price and order data, how should procurement be routed?",choices:[{label:"AUTO_FULFILL"},{label:"CHECK_STOCK"},{label:"CHECK_PRICE_CHANGE"},{label:"MANUAL_REVIEW"}]},
  trend_relevance:{id:"trend_relevance",question:"Is this social video or trend genuinely relevant to the product/category rather than merely adjacent?",choices:[{label:"RELEVANT"},{label:"ADJACENT"},{label:"IRRELEVANT"}]},
  viral_pattern:{id:"viral_pattern",question:"Which reusable creative pattern best describes why this content is performing?",choices:[{label:"HOOK_DEMO_PAYOFF"},{label:"PROBLEM_SOLUTION"},{label:"UGC_TESTIMONIAL"},{label:"BEFORE_AFTER"},{label:"DISCOVERY_REVEAL"},{label:"AESTHETIC_SHOWCASE"},{label:"OTHER"}]},
  product_trend_fit:{id:"product_trend_fit",question:"Given observed social evidence and product economics, how strong is this product as a candidate for this trend?",choices:[{label:"STRONG"},{label:"TEST"},{label:"WEAK"}]},
  pitch_angle:{id:"pitch_angle",question:"Which pitch family best fits the product and observed winning content?",choices:[{label:"VALUE"},{label:"PROBLEM_SOLUTION"},{label:"DISCOVERY"},{label:"SOCIAL_PROOF"},{label:"TRANSFORMATION"},{label:"DESIGN_DESIRE"},{label:"CONVENIENCE"}]},
  prompt_strategy:{id:"prompt_strategy",question:"How should the generation prompt treat the observed creative pattern?",choices:[{label:"ADAPT_STRUCTURE"},{label:"ADAPT_HOOK"},{label:"ADAPT_VISUAL_LANGUAGE"},{label:"START_FRESH"}]},
};

export async function decideYnot(context:JevContext,kinds:JevDecisionKind[]){
  return askJev(context,kinds.map(k=>YNOT_JEV_DECISIONS[k]));
}

export async function decideProduct(context:JevContext){
  return decideYnot(context,["catalogue","economics","supplier","search","personalization","payment_presentation"]);
}
export async function decideGrowth(context:JevContext){
  return decideYnot(context,["creator_match","commission","creative_route","ad_action","creative_qc","trend_relevance","viral_pattern","product_trend_fit","pitch_angle","prompt_strategy"]);
}
export async function decideOrder(context:JevContext){
  return decideYnot(context,["supplier","payment_presentation","fulfillment"]);
}
