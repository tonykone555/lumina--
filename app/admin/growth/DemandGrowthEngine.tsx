"use client";

import Link from "next/link";
import {useMemo,useState} from "react";

type Props={trends:any[];gaps:any[];products:any[]};
type Tab="demand"|"ads"|"creative"|"distribution";
type IntelMode="meta_ads"|"tiktok_ads"|"google_ads"|"linkedin_ads"|"google_demand";

const AD_SOURCES=[
 {name:"Meta Ads",mode:"meta_ads" as IntelMode,note:"Facebook + Instagram Ad Library",state:"live"},
 {name:"TikTok Ads",mode:"tiktok_ads" as IntelMode,note:"TikTok public Ad Library",state:"live"},
 {name:"Google Ads",mode:"google_ads" as IntelMode,note:"Ads Transparency Center advertiser creatives",state:"live"},
 {name:"LinkedIn Ads",mode:"linkedin_ads" as IntelMode,note:"LinkedIn public ad intelligence",state:"live"},
];
const WANT_SOURCES=[
 ["TikTok","videos · comments · hashtags"],["Instagram","reels · captions · comments"],["Reddit","posts · comments · problem language"],["YouTube","videos · comments · repeated questions"],["X","conversation · complaints · requests"],["Google Search","autocomplete · People Also Ask · related searches"],["Google Trends","trend velocity layer · separate connector slot"],["Shopify","merchant/product availability"],["Amazon / eBay","marketplace demand + pricing"],["AliExpress / Temu","supply + fast-moving product patterns"],
];
const SCORE=["Consumer demand 25%","Demand growth 20%","Advertiser activity 15%","Catalogue match 15%","Margin 10%","Creative potential 10%","YNOT performance 5%"];
const CONTENT=["Product discovery","Aesthetic / inspiration","Deal / conversion","Engagement / polls","UGC short video","Carousel","Story / vertical","Comparison / find cheaper"];

function clamp(v:any){return Math.max(0,Math.min(100,Number(v||0)))}
function opportunityScore(x:any,index:number){const base=clamp(x.velocity_score??x.priority_score??0);return base||Math.max(48,88-index*4)}

export default function DemandGrowthEngine({trends,gaps,products}:Props){
 const[tab,setTab]=useState<Tab>("demand");
 const[query,setQuery]=useState("glowing skin");
 const[country,setCountry]=useState("FR");
 const[busy,setBusy]=useState("");
 const[intel,setIntel]=useState<any>(null);
 const[notice,setNotice]=useState("");
 const opportunities=useMemo(()=>{
  const a=trends.slice(0,6).map((x:any,i:number)=>({id:`t-${x.id||i}`,name:x.name||x.niche||"Emerging demand",score:opportunityScore(x,i),source:x.platform||"multi-source",why:x.recommendation||x.audience||x.niche||"Demand signal detected.",matched:x.matched_product_ids?.length||0,status:x.lifecycle||x.status||"watch"}));
  const b=gaps.slice(0,4).map((x:any,i:number)=>({id:`g-${x.id||i}`,name:x.niche||"Catalogue opportunity",score:opportunityScore(x,i+2),source:"want graph",why:x.demand_signal||x.reason||"Consumer demand with a catalogue gap.",matched:0,status:x.status||"source"}));
  return [...a,...b].sort((x,y)=>y.score-x.score).slice(0,8);
 },[trends,gaps]);

 async function runIntel(mode:IntelMode){
  if(query.trim().length<2)return;
  setBusy(mode);setNotice("");setIntel(null);
  try{
   const r=await fetch("/api/admin/growth/intelligence",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode,query:query.trim(),country,language:"en",limit:30})});
   const j=await r.json();
   if(!r.ok)throw new Error(j.error||"Intelligence search failed");
   setIntel(j);
  }catch(e){setNotice(e instanceof Error?e.message:"Intelligence search failed")}
  finally{setBusy("")}
 }

 return <section className="demandEngine" id="demand-radar">
  <div className="demandTop">
   <div><span>YNOT DEMAND + ADS ENGINE</span><h2>Find what people want, then create around proven demand</h2><p>FetchLayer intelligence → Want Graph → opportunity score → YNOT catalogue match → creative packs → TryPost → performance learning.</p></div>
   <div className="demandStatus"><i/> Multi-platform intelligence live</div>
  </div>
  <div className="demandTabs">
   {([['demand','Demand Radar'],['ads','Ad Libraries'],['creative','Creative Brain'],['distribution','Autopost Loop']] as [Tab,string][]).map(([id,label])=><button key={id} className={tab===id?"active":""} onClick={()=>{setTab(id);setIntel(null);setNotice("")}}>{label}</button>)}
  </div>

  {tab==="demand"&&<div className="demandGrid">
   <section className="demandCard span2"><div className="demandCardHead"><div><span>LIVE GOOGLE DEMAND</span><h3>See how people phrase what they want</h3></div><b>FetchLayer Google Search</b></div>
    <div className="intelSearch"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="e.g. gym outfit under 150"/><input className="country" value={country} onChange={e=>setCountry(e.target.value.toUpperCase().slice(0,2))}/><button onClick={()=>runIntel("google_demand")} disabled={busy==="google_demand"}>{busy==="google_demand"?"Reading demand…":"Read demand"}</button></div>
    {notice&&<div className="intelNotice">{notice}</div>}
    {intel?.mode==="google_demand"&&<div className="signalColumns"><SignalList title="Autocomplete" items={intel.signals?.suggestions}/><SignalList title="People also ask" items={intel.signals?.questions}/><SignalList title="Related searches" items={intel.signals?.related}/></div>}
    <div className="trendNote"><strong>Google Trends</strong><span>FetchLayer’s current documented Google Search API gives us live autocomplete, People Also Ask and related-search intent. Google Trends itself is not exposed as a documented FetchLayer endpoint, so YNOT keeps it as a separate trend-velocity connector instead of pretending the search data is Google Trends.</span></div>
   </section>
   <section className="demandCard span2"><div className="demandCardHead"><div><span>WANT GRAPH</span><h3>What people are actually asking for</h3></div><b>{opportunities.length} active signals</b></div><div className="wantSources">{WANT_SOURCES.map(([name,note])=><div key={name}><strong>{name}</strong><small>{note}</small></div>)}</div></section>
   <section className="demandCard"><div className="demandCardHead"><div><span>OPPORTUNITY MODEL</span><h3>Score before spending</h3></div></div><div className="scoreFormula">{SCORE.map((x,i)=><div key={x}><i>{String(i+1).padStart(2,"0")}</i><span>{x}</span></div>)}</div></section>
   <section className="demandCard opportunities"><div className="demandCardHead"><div><span>DEMAND OPPORTUNITIES</span><h3>Highest-signal niches</h3></div></div>{opportunities.length?opportunities.map(x=><article key={x.id}><div><strong>{x.name}</strong><small>{x.source} · {x.status}</small></div><b>{x.score}</b><p>{x.why}</p><footer><span>{x.matched?`${x.matched} catalogue matches`:"Catalogue match needed"}</span><em>Want Graph</em></footer></article>):<div className="demandEmpty">No demand signals saved yet. Existing Growth research will populate this board.</div>}</section>
  </div>}

  {tab==="ads"&&<div className="demandGrid">
   <section className="demandCard span2"><div className="demandCardHead"><div><span>PAID MARKET INTELLIGENCE</span><h3>Search the major public ad libraries</h3></div><b>FetchLayer live</b></div>
    <div className="intelSearch"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="product, problem, brand or niche"/><input className="country" value={country} onChange={e=>setCountry(e.target.value.toUpperCase().slice(0,2))}/></div>
    <div className="adSourceGrid">{AD_SOURCES.map(s=><article key={s.name}><div><strong>{s.name}</strong><em className={s.state}>{s.state}</em></div><p>{s.note}</p><small>hooks · offers · CTA · format · repetition · landing angle</small><button onClick={()=>runIntel(s.mode)} disabled={busy===s.mode}>{busy===s.mode?"Searching…":"Search "+s.name}</button></article>)}</div>
    {notice&&<div className="intelNotice">{notice}</div>}
    {intel?.ads&&<div className="intelResults"><div className="intelResultHead"><strong>{intel.platform} · {intel.ads.length} ads loaded</strong><span>{intel.matchedAdvertisers?.length?`${intel.matchedAdvertisers.length} matched advertisers`:"Public library result"}</span></div>{intel.ads.slice(0,12).map((ad:any)=><article key={ad.id}><div><strong>{ad.advertiser}</strong><small>{ad.format||ad.platform}</small></div><p>{ad.headline||ad.body}</p><footer><span>{ad.cta||"No CTA published"}</span><em>{ad.started?`Since ${String(ad.started).slice(0,10)}`:"Date unavailable"}</em></footer></article>)}</div>}
   </section>
   <section className="demandCard"><div className="demandCardHead"><div><span>PATTERN EXTRACTION</span><h3>Learn the market, don’t copy it</h3></div></div><div className="pillCloud">{["Hook","Problem","Promise","Offer","Audience","Opening shot","CTA","Price framing","Ad longevity","Variant count","Landing angle","Media type"].map(x=><span key={x}>{x}</span>)}</div></section>
   <section className="demandCard"><div className="demandCardHead"><div><span>SIGNAL RULE</span><h3>Repeated spend attention</h3></div></div><p className="demandCopy">Multiple live variations around the same concept become a useful research signal. YNOT treats it as evidence of advertiser attention, not proof of profitability.</p></section>
  </div>}

  {tab==="creative"&&<div className="demandGrid">
   <section className="demandCard span2"><div className="demandCardHead"><div><span>CONTENT BRAIN</span><h3>One demand signal → a full content pack</h3></div><Link href="/admin/growth/content">Open Content Studio →</Link></div><div className="contentTypes">{CONTENT.map((x,i)=><div key={x}><i>{String(i+1).padStart(2,"0")}</i><strong>{x}</strong></div>)}</div></section>
   <section className="demandCard"><div className="demandCardHead"><div><span>EXAMPLE TRANSFORMATION</span><h3>Ad language → original YNOT angle</h3></div></div><div className="transform"><small>Market signal</small><p>“glowing skin routine”</p><i>↓</i><small>YNOT demand angle</small><strong>3 products for glowing skin under €50</strong></div></section>
   <section className="demandCard"><div className="demandCardHead"><div><span>CATALOGUE MATCH</span><h3>Use products we can actually sell</h3></div></div><div className="miniProducts">{products.slice(0,4).map((p:any)=><div key={p.product_id}><span>{p.image_url?<img src={p.image_url} alt=""/>:"Y"}</span><div><strong>{p.title}</strong><small>Advertability {p.advertability_score??"—"}</small></div></div>)}</div></section>
  </div>}

  {tab==="distribution"&&<div className="demandGrid">
   <section className="demandCard span2"><div className="demandCardHead"><div><span>TRYPOST AUTOPUBLISH LOOP</span><h3>Research → create → schedule → learn</h3></div><Link href="/admin/growth/content">Build content queue →</Link></div><div className="autoFlow">{[["01","Detect demand"],["02","Mine ad angles"],["03","Match products"],["04","Generate pack"],["05","Review"],["06","TryPost"],["07","Read results"],["08","Improve next pack"]].map(([n,t])=><div key={n}><b>{n}</b><span>{t}</span></div>)}</div></section>
   <section className="demandCard"><div className="demandCardHead"><div><span>CHANNEL MIX</span><h3>Format for the platform</h3></div></div><div className="channelList"><div><b>TikTok</b><span>short video</span></div><div><b>Instagram</b><span>reel · carousel · story</span></div><div><b>Facebook</b><span>product · deal · video</span></div><div><b>YouTube</b><span>Shorts</span></div><div><b>X</b><span>conversation-led posts</span></div></div></section>
   <section className="demandCard"><div className="demandCardHead"><div><span>LEARNING LOOP</span><h3>Feed real performance back</h3></div></div><div className="pillCloud">{["Reach","CTR","CPC","Saves","Comments","Product opens","Add to bag","Purchases","Revenue","ROAS"].map(x=><span key={x}>{x}</span>)}</div><p className="demandCopy">Performance evidence updates future niche, hook, format and product selection instead of posting the same content forever.</p></section>
  </div>}
 </section>;
}

function SignalList({title,items}:{title:string;items?:string[]}){return <div><span>{title}</span>{items?.length?items.slice(0,8).map((x,i)=><p key={i}>{x}</p>):<p>No signal returned.</p>}</div>}
