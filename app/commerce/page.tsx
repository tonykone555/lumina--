"use client";

import { useEffect, useMemo, useState } from "react";

type DemoQuote={
  riskAdjustedCost:number; luminaPrice:number; grossContribution:number; marginPct:number;
  reliabilityScore:number; routingScore:number; state:string; monetization:string;
};

const eur=(n:number)=>new Intl.NumberFormat("en",{style:"currency",currency:"EUR",maximumFractionDigits:2}).format(n||0);

export default function CommercePage(){
  const [quote,setQuote]=useState<DemoQuote|null>(null);
  const [wallet,setWallet]=useState(18.5);
  const [creatorSales,setCreatorSales]=useState(1240);
  const [merchantSpend,setMerchantSpend]=useState(8400);
  useEffect(()=>{fetch("/api/commerce/quote").then(r=>r.json()).then(d=>setQuote(d.quote||null)).catch(()=>{})},[]);
  const creatorCommission=useMemo(()=>creatorSales*.12,[creatorSales]);
  const merchantFlag=merchantSpend>=5000;

  return <main style={{minHeight:"100vh",background:"#f1ede7",color:"#27231f",fontFamily:"Inter,system-ui,sans-serif",padding:"28px"}}>
    <div style={{maxWidth:1180,margin:"0 auto"}}>
      <p style={{fontSize:11,letterSpacing:".14em",textTransform:"uppercase",opacity:.55}}>YNOT / Commerce Control</p>
      <h1 style={{fontFamily:"Georgia,serif",fontStyle:"italic",fontWeight:500,fontSize:"clamp(36px,6vw,68px)",lineHeight:.95,margin:"10px 0 14px"}}>Retail routing, margin and growth engine.</h1>
      <p style={{maxWidth:780,opacity:.65,lineHeight:1.55}}>A working operations surface for the commercial layer underneath the bubble world. Real payment and retailer purchasing stay disabled until verified provider credentials, legal setup and live source checks are connected.</p>

      <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,marginTop:24}}>
        <Metric label="YNOT price" value={quote?eur(quote.luminaPrice):"…"} sub="Dynamic risk-adjusted pricing"/>
        <Metric label="Expected contribution" value={quote?eur(quote.grossContribution):"…"} sub={quote?`${quote.marginPct}% margin`:"Calculating"}/>
        <Metric label="Source reliability" value={quote?`${quote.reliabilityScore}/100`:"…"} sub="Stock + returns + delivery"/>
        <Metric label="Routing score" value={quote?`${quote.routingScore}/100`:"…"} sub={quote?.state||"Waiting"}/>
      </section>

      <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:14,marginTop:14}}>
        <Card title="Dynamic margin engine" text="Category-specific return reserves, cancellation reserve, payment fees, regional risk and reliability all feed the final YNOT price." tags={["Landed cost","Risk floor","Price lock","Margin floor"]}/>
        <Card title="Smart sourcing" text="The engine ranks sources by profit, stock confidence, delivery, region, returns and reliability rather than blindly choosing the cheapest retailer." tags={["Multi-source","Fallback","Anomaly block","Regional routing"]}/>
        <Card title="YNOT Wallet + Credit" text={`Current demo wallet: ${eur(wallet)}. Credits can absorb price-protection rewards, refunds, referral bonuses and loyalty value.`} tags={["Price protection","Referral credit","Refund credit"]} action={()=>setWallet(v=>Math.round((v+10)*100)/100)} actionLabel="Add €10 demo credit"/>
        <Card title="Basket optimizer" text="Each basket line can carry multiple source options. YNOT chooses the strongest risk-adjusted route and reports expected total contribution before checkout." tags={["Shared shipping","Source consolidation","Split orders"]}/>
        <Card title="Replacement engine" text="When a source fails, candidates can be scored by price gap, category match, regional fit and source reliability before asking the shopper to approve a replacement." tags={["96% match","Fallback source","Cancel rescue"]}/>
        <Card title="Retailer reliability graph" text="Reliability is designed as a proprietary score combining stock accuracy, cancellation rate, return policy, refund speed, delivery and regional fit." tags={["Source memory","Risk graph","Operational moat"]}/>
        <Card title="Merchant conversion trigger" text={`${merchantFlag?"Partnership opportunity triggered":"Not yet triggered"}. Demo merchant retail spend is ${eur(merchantSpend)}.`} tags={["GMV","Orders","Margin uplift","Direct supply"]} action={()=>setMerchantSpend(v=>v+1000)} actionLabel="Add €1k routed spend"/>
        <Card title="Preferred suppliers" text="Connected merchants can be marked as preferred suppliers, improving operational routing without buying better organic search placement." tags={["Direct integration","Wholesale","Better fulfillment"]}/>
        <Card title="Creator shopping worlds" text={`Demo creator-attributed GMV: ${eur(creatorSales)} · creator commission: ${eur(creatorCommission)}.`} tags={["Creator world","Attribution","Commission"]} action={()=>setCreatorSales(v=>v+250)} actionLabel="Add €250 creator GMV"/>
        <Card title="YNOT+" text="Consumer membership can later fund premium image-reference search, saved worlds, price alerts, visualization credits and delivery benefits." tags={["Recurring revenue","Saved worlds","Price alerts"]}/>
        <Card title="YNOT Fulfilled" text="A future fulfillment mode is already represented in routing logic, allowing high-volume products to graduate from retail sourcing to direct warehouse fulfillment." tags={["Higher margin","Direct stock","Fulfillment network"]}/>
        <Card title="Unit economics ledger" text="Every production order should persist customer paid, source cost, shipping, tax, fees, reserves, expected contribution and final realized contribution." tags={["Expected vs actual","Return reserve","Contribution"]}/>
      </section>

      <section style={{marginTop:14,padding:20,borderRadius:28,background:"rgba(255,255,255,.45)",border:"1px solid rgba(255,255,255,.6)"}}>
        <p style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",opacity:.5}}>North star</p>
        <h2 style={{fontFamily:"Georgia,serif",fontStyle:"italic",fontWeight:500,fontSize:30,margin:"6px 0 8px"}}>Discovery → verified price → YNOT checkout → smart fulfillment → direct merchant leverage.</h2>
        <p style={{opacity:.63,maxWidth:900,lineHeight:1.55,margin:0}}>The logic is separated from the discovery UI so YNOT can keep its invisible bubble experience while the commerce engine makes the commercial decision underneath.</p>
      </section>
    </div>
  </main>
}

function Metric({label,value,sub}:{label:string;value:string;sub:string}){
  return <div style={{padding:18,borderRadius:24,background:"rgba(255,255,255,.5)",border:"1px solid rgba(255,255,255,.7)"}}><span style={{fontSize:10,textTransform:"uppercase",letterSpacing:".1em",opacity:.48}}>{label}</span><strong style={{display:"block",fontFamily:"Georgia,serif",fontSize:28,fontWeight:500,margin:"7px 0 3px"}}>{value}</strong><small style={{opacity:.5}}>{sub}</small></div>
}
function Card({title,text,tags,action,actionLabel}:{title:string;text:string;tags:string[];action?:()=>void;actionLabel?:string}){
  return <article style={{padding:19,borderRadius:26,background:"rgba(255,255,255,.38)",border:"1px solid rgba(255,255,255,.58)",boxShadow:"0 12px 36px rgba(50,40,30,.04)"}}><h3 style={{fontFamily:"Georgia,serif",fontStyle:"italic",fontSize:22,fontWeight:500,margin:"0 0 8px"}}>{title}</h3><p style={{fontSize:13,lineHeight:1.55,opacity:.66,minHeight:60}}>{text}</p><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{tags.map(t=><span key={t} style={{fontSize:9,padding:"6px 8px",borderRadius:999,background:"rgba(255,255,255,.6)",opacity:.7}}>{t}</span>)}</div>{action&&<button onClick={action} style={{marginTop:12,border:0,borderRadius:999,padding:"9px 12px",background:"#2f2a26",color:"white",fontSize:10,cursor:"pointer"}}>{actionLabel}</button>}</article>
}
