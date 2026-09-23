export type SourceQuote = {
  sourceId:string;
  merchantId?:string;
  productId:string;
  title?:string;
  category?:string;
  price:number;
  currency:string;
  shipping:number;
  tax?:number;
  duties?:number;
  paymentFeePct?:number;
  returnRate?:number;
  cancellationRate?:number;
  stockConfidence?:number;
  deliveryDays?:number;
  refundSpeedDays?:number;
  returnPolicyScore?:number;
  regionMatch?:number;
  affiliateCommissionPct?:number;
  preferredSupplier?:boolean;
  fulfilledByLumina?:boolean;
};

export type RiskProfile = {
  minMarginPct:number;
  minContribution:number;
  returnReservePct:number;
  cancellationReservePct:number;
  safetyBufferPct:number;
};

export type CommerceQuote = {
  source:SourceQuote;
  riskAdjustedCost:number;
  luminaPrice:number;
  grossContribution:number;
  marginPct:number;
  reliabilityScore:number;
  routingScore:number;
  state:'buy-with-lumina'|'verify-at-checkout'|'view-at-store';
  monetization:'retail-margin'|'affiliate'|'partner';
  reasons:string[];
};

const DEFAULT_RISK:Record<string,RiskProfile> = {
  fashion:{minMarginPct:.20,minContribution:10,returnReservePct:.12,cancellationReservePct:.02,safetyBufferPct:.03},
  fitness:{minMarginPct:.16,minContribution:9,returnReservePct:.08,cancellationReservePct:.02,safetyBufferPct:.025},
  skin:{minMarginPct:.18,minContribution:8,returnReservePct:.05,cancellationReservePct:.02,safetyBufferPct:.025},
  hair:{minMarginPct:.18,minContribution:8,returnReservePct:.05,cancellationReservePct:.02,safetyBufferPct:.025},
  smile:{minMarginPct:.18,minContribution:8,returnReservePct:.05,cancellationReservePct:.02,safetyBufferPct:.025},
  home:{minMarginPct:.13,minContribution:12,returnReservePct:.05,cancellationReservePct:.02,safetyBufferPct:.02},
  tech:{minMarginPct:.12,minContribution:15,returnReservePct:.05,cancellationReservePct:.025,safetyBufferPct:.025},
  default:{minMarginPct:.15,minContribution:8,returnReservePct:.07,cancellationReservePct:.02,safetyBufferPct:.025},
};

const n=(v:number)=>Math.round(v*100)/100;
const clamp=(v:number,min=0,max=1)=>Math.min(max,Math.max(min,v));

export function riskProfile(category?:string, sourcePrice?:number):RiskProfile {
  const key=(category||'default').toLowerCase();
  const base=DEFAULT_RISK[key]||DEFAULT_RISK.default;
  const highTicketBnpl=(key==='home'||key==='furniture'||key==='tech'||key==='electronics')&&Number(sourcePrice)>=500;
  return highTicketBnpl?{...base,minMarginPct:Math.max(base.minMarginPct,.20)}:base;
}

export function reliabilityScore(q:SourceQuote){
  const stock=clamp(q.stockConfidence ?? .75);
  const returnPolicy=clamp(q.returnPolicyScore ?? .7);
  const region=clamp(q.regionMatch ?? .75);
  const cancel=1-clamp(q.cancellationRate ?? .04);
  const refund=1-clamp((q.refundSpeedDays ?? 7)/30);
  const delivery=1-clamp(((q.deliveryDays ?? 6)-2)/20);
  return n(100*(stock*.28+cancel*.22+returnPolicy*.18+region*.12+refund*.10+delivery*.10));
}

export function landedCost(q:SourceQuote, profile=riskProfile(q.category,q.price)){
  const base=q.price+q.shipping+(q.tax||0)+(q.duties||0);
  const payment=base*(q.paymentFeePct ?? .029);
  const returnReserve=base*Math.max(profile.returnReservePct,q.returnRate||0);
  const cancelReserve=base*Math.max(profile.cancellationReservePct,q.cancellationRate||0);
  const safety=base*profile.safetyBufferPct;
  return n(base+payment+returnReserve+cancelReserve+safety);
}

export function dynamicLuminaPrice(q:SourceQuote, profile=riskProfile(q.category,q.price)){
  const cost=landedCost(q,profile);
  const reliability=reliabilityScore(q)/100;
  const volatilityPremium=(1-reliability)*.06;
  const targetMargin=Math.max(profile.minMarginPct, profile.minMarginPct+volatilityPremium);
  const byPct=cost/(1-targetMargin);
  const byContribution=cost+profile.minContribution;
  return n(Math.max(byPct,byContribution));
}

export function affiliateValue(q:SourceQuote){
  return n(q.price*(q.affiliateCommissionPct||0));
}

export function buildQuote(q:SourceQuote):CommerceQuote{
  const profile=riskProfile(q.category,q.price);
  const cost=landedCost(q,profile);
  const price=dynamicLuminaPrice(q,profile);
  const contribution=n(price-cost);
  const margin=price?contribution/price:0;
  const reliability=reliabilityScore(q);
  const affiliate=affiliateValue(q);
  const retailRiskAdjusted=contribution*(reliability/100);
  const monetization = q.preferredSupplier ? 'partner' : affiliate>retailRiskAdjusted ? 'affiliate' : 'retail-margin';
  const stockOk=(q.stockConfidence ?? .75)>=.65;
  const marginOk=margin>=profile.minMarginPct && contribution>=profile.minContribution;
  const reliable=reliability>=58;
  const reasons:string[]=[];
  if(!stockOk) reasons.push('Low stock confidence');
  if(!marginOk) reasons.push('Below margin floor');
  if(!reliable) reasons.push('Source reliability below threshold');
  if(q.regionMatch!=null && q.regionMatch<.45) reasons.push('Weak regional fit');
  if(monetization==='affiliate') reasons.push('Affiliate route is better risk-adjusted economics');
  if(q.preferredSupplier) reasons.push('Preferred supplier relationship');
  const state = stockOk && marginOk && reliable && monetization!=='affiliate'
    ? 'buy-with-lumina'
    : stockOk && reliable && monetization!=='affiliate'
      ? 'verify-at-checkout'
      : 'view-at-store';
  const routingScore=n(
    reliability*.45 +
    clamp(contribution/Math.max(price,1))*100*.25 +
    clamp(q.regionMatch??.75)*100*.15 +
    (q.preferredSupplier?100:55)*.10 +
    (q.fulfilledByLumina?100:50)*.05
  );
  return {source:q,riskAdjustedCost:cost,luminaPrice:price,grossContribution:contribution,marginPct:n(margin*100),reliabilityScore:reliability,routingScore,state,monetization,reasons};
}

export function rankSources(sources:SourceQuote[]){
  return sources.map(buildQuote).sort((a,b)=>b.routingScore-a.routingScore);
}

export function chooseBestSource(sources:SourceQuote[]){
  const ranked=rankSources(sources);
  return ranked.find(x=>x.state==='buy-with-lumina')||ranked[0]||null;
}

export function installmentPreview(total:number, parts=4){
  return {parts, amount:n(total/parts), total:n(total)};
}

export function priceProtectionCredit(original:number,current:number,thresholdPct=.05){
  const drop=original-current;
  return drop>0 && drop/original>=thresholdPct ? n(drop) : 0;
}

export type Wallet = {balance:number;credits:{id:string;amount:number;reason:string;createdAt:string}[]};
export function creditWallet(wallet:Wallet,amount:number,reason:string):Wallet{
  if(amount<=0) return wallet;
  return {balance:n(wallet.balance+amount),credits:[...wallet.credits,{id:crypto.randomUUID(),amount:n(amount),reason,createdAt:new Date().toISOString()}]};
}

export type MerchantStats={merchantId:string;orders:number;gmv:number;spend:number;impressions:number;opens:number;cancelRate:number;currentMarginPct:number;estimatedDirectMarginPct:number};
export function merchantOpportunity(m:MerchantStats){
  const uplift=Math.max(0,m.estimatedDirectMarginPct-m.currentMarginPct);
  const score=Math.round(
    Math.min(35,m.orders/3)+Math.min(25,m.gmv/1000)+Math.min(15,m.impressions/500)+Math.min(10,m.opens/100)+Math.min(15,uplift*100)
  );
  return {score,trigger:score>=55||m.spend>=5000||m.orders>=40,estimatedMarginUpliftPct:n(uplift*100)};
}

export type BasketLine={id:string;qty:number;sourceOptions:SourceQuote[]};
export function optimizeBasket(lines:BasketLine[]){
  const choices=lines.map(line=>({line,best:chooseBestSource(line.sourceOptions)}));
  const merchantGroups=new Map<string,number>();
  for(const c of choices){
    if(!c.best) continue;
    const key=c.best.source.merchantId||c.best.source.sourceId;
    merchantGroups.set(key,(merchantGroups.get(key)||0)+1);
  }
  const estimatedTotal=n(choices.reduce((s,c)=>s+(c.best?.luminaPrice||0)*c.line.qty,0));
  const expectedContribution=n(choices.reduce((s,c)=>s+(c.best?.grossContribution||0)*c.line.qty,0));
  return {choices,estimatedTotal,expectedContribution,merchantGroups:Object.fromEntries(merchantGroups)};
}

export function replacementScore(original:SourceQuote,candidate:SourceQuote){
  const priceGap=Math.abs(candidate.price-original.price)/Math.max(original.price,1);
  const sameCategory=(candidate.category||'')===(original.category||'');
  const region=clamp(candidate.regionMatch??.7);
  const rel=reliabilityScore(candidate)/100;
  return n(100*(Math.max(0,1-priceGap)*.35+(sameCategory?1:.55)*.25+region*.15+rel*.25));
}
