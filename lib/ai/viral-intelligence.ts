import { decideYnot } from "@/lib/ai/jev";

export type SocialPlatform="tiktok"|"instagram"|"youtube"|"threads";
export type SocialSignal={
 platform:SocialPlatform; url?:string; id?:string; caption?:string; transcript?:string;
 hashtags?:string[]; audio?:string; views?:number; likes?:number; comments?:number; shares?:number;
 publishedAt?:string; author?:string; visualSummary?:string;
};
export type ProductCandidate={
 id:string; title:string; description?:string; category?:string; price?:number; marginPct?:number;
 contribution?:number; image?:string; tags?:string[]; reliabilityScore?:number;
};
export type CreativeBrief={
 productId:string; required:string[]; preferred:string[]; hook:string; pitch:string;
 structure:string; visualDirection:string; prompt:string; evidence:string[];
};

const text=(v:unknown)=>String(v??"").trim();
function engagement(s:SocialSignal){
 const views=Math.max(1,Number(s.views)||1);
 return ((Number(s.likes)||0)+(Number(s.comments)||0)*2+(Number(s.shares)||0)*3)/views;
}
export function rankSignals(signals:SocialSignal[]){
 return [...signals].sort((a,b)=>engagement(b)-engagement(a));
}

/** Jev filters social observations. Collection stays provider-specific and respects platform APIs/terms. */
export async function clearTrend(signal:SocialSignal,product?:ProductCandidate){
 const context={signal,product,engagementRate:engagement(signal),
  required:["topic/product relevance"],
  preferred:["format","tone","audience","hook style","visual style"]};
 return decideYnot(context,["trend_relevance","viral_pattern","product_trend_fit","pitch_angle","prompt_strategy"]);
}

export async function rankProductsForTrend(signal:SocialSignal,products:ProductCandidate[]){
 const shortlist=products
  .filter(p=>Number(p.price||0)>0)
  .sort((a,b)=>(Number(b.contribution)||0)-(Number(a.contribution)||0))
  .slice(0,30);
 const results=await Promise.all(shortlist.map(async product=>({product,decisions:await clearTrend(signal,product)})));
 const weight=(choice:string)=>choice==="STRONG"?3:choice==="TEST"?2:choice==="RELEVANT"?2:choice==="ADJACENT"?1:0;
 return results.sort((a,b)=>{
  const sa=a.decisions.reduce((n,d)=>n+weight(d.choice),0)+(Number(a.product.reliabilityScore)||0)/100;
  const sb=b.decisions.reduce((n,d)=>n+weight(d.choice),0)+(Number(b.product.reliabilityScore)||0)/100;
  return sb-sa;
 });
}

export async function buildViralCreativeBrief(product:ProductCandidate,signals:SocialSignal[]):Promise<CreativeBrief>{
 const evidence=rankSignals(signals).slice(0,8);
 const judgments=await Promise.all(evidence.map(s=>clearTrend(s,product)));
 const flat=judgments.flat();
 const pick=(id:string,fallback:string)=>{
  const counts=new Map<string,number>();
  flat.filter(x=>x.id===id&&Number(x.confidence??1)>=.35).forEach(x=>counts.set(x.choice,(counts.get(x.choice)||0)+1));
  return [...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]||fallback;
 };
 const structure=pick("viral_pattern","HOOK_DEMO_PAYOFF");
 const pitch=pick("pitch_angle","DISCOVERY");
 const strategy=pick("prompt_strategy","ADAPT_STRUCTURE");
 const hook=pitch==="PROBLEM_SOLUTION"?"Lead immediately with the shopper problem and show the product as the resolution":
  pitch==="VALUE"?"Open with the clearest value proposition in the first beat":
  pitch==="DESIGN_DESIRE"?"Open on the most desirable visual detail before revealing the full product":
  "Open with a curiosity-led product discovery in the first beat";
 const required=[`Feature the exact product: ${product.title}`,"Keep product identity and key physical attributes accurate","Make the product/category the actual topic","Use original wording and original footage/generation"];
 const preferred=[`Creative structure: ${structure}`,`Pitch family: ${pitch}`,`Trend adaptation: ${strategy}`,"Fast mobile-first pacing","Natural creator delivery when UGC is selected"];
 const prompt=[hook,`Create an original vertical commerce video for ${product.title}.`,`Use the observed pattern as inspiration for structure only: ${structure}.`,`Pitch angle: ${pitch}.`,"Do not copy another creator's script, identity, footage, music, or distinctive expression.",`Required: ${required.join("; ")}.`,`Preferences, not hard constraints: ${preferred.join("; ")}.`].join(" ");
 return {productId:product.id,required,preferred,hook,pitch,structure,visualDirection:strategy,prompt,evidence:evidence.map(s=>text(s.url||s.id||s.caption)).filter(Boolean)};
}
