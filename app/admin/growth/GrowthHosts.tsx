"use client";

import {useMemo,useState} from "react";

type Listing={
 id:string;title:string;url:string;location:string;propertyType?:string;roomType?:string;nightlyPrice?:number|null;currency?:string;
 rating?:number|null;reviewCount?:number;photos?:string[];qualificationScore:number;host?:{name?:string;isSuperhost?:boolean;profileUrl?:string};
};
type AnalysisResult={
 property:any;reviews:string[];qualificationScore:number;analysis:any;model:string;matchedProducts:any[];
 contact?:{bestContact?:{email?:string;confidence?:string;sourceUrl?:string}|null}|null;
};

function money(v:number|null|undefined,currency="EUR"){
 if(v==null)return "Price varies";
 try{return new Intl.NumberFormat(undefined,{style:"currency",currency,maximumFractionDigits:0}).format(Number(v))}catch{return String(v)}
}

export default function GrowthHosts(){
 const[location,setLocation]=useState("Marbella, Spain"),[minNightly,setMinNightly]=useState(300),[loading,setLoading]=useState(false);
 const[listings,setListings]=useState<Listing[]>([]),[selectedId,setSelectedId]=useState(""),[analysis,setAnalysis]=useState<AnalysisResult|null>(null);
 const[busy,setBusy]=useState(""),[notice,setNotice]=useState("");
 const selected=useMemo(()=>listings.find(x=>x.id===selectedId)||listings[0]||null,[listings,selectedId]);

 async function search(){
  setLoading(true);setNotice("");setAnalysis(null);
  try{
   const r=await fetch("/api/admin/growth/hosts/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({location,min_nightly:minNightly,pages:2,currency:"EUR"})});
   const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Airbnb search failed");
   setListings(j.listings||[]);setSelectedId(j.listings?.[0]?.id||"");
   if(!(j.listings||[]).length)setNotice("No listings matched this price threshold.");
  }catch(e){setNotice(e instanceof Error?e.message:"Airbnb search failed")}finally{setLoading(false)}
 }
 async function analyze(){
  if(!selected)return;setBusy("analyze");setNotice("");
  try{
   const r=await fetch("/api/admin/growth/hosts/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({listing:selected.id||selected.url,fallback:selected,enrich_contact:true})});
   const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Property analysis failed");
   setAnalysis(j);
  }catch(e){setNotice(e instanceof Error?e.message:"Property analysis failed")}finally{setBusy("")}
 }
 async function save(){
  if(!analysis)return;setBusy("save");setNotice("");
  try{
   const r=await fetch("/api/admin/growth/hosts/save",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(analysis)});
   const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Could not save lead");
   setNotice("Saved to Growth Outreach Inbox.");
  }catch(e){setNotice(e instanceof Error?e.message:"Could not save lead")}finally{setBusy("")}
 }

 return <section className="hostIntel" id="hosts">
  <div className="hostIntelHead">
   <div><span>HOST INTELLIGENCE</span><h2>Find premium Airbnb upgrade opportunities</h2><p>Search expensive listings, analyse their photos and reviews, match YNOT products and enrich the host contact.</p></div>
   <div className="hostIntelBadge">FETCHLAYER + GEMINI</div>
  </div>

  <div className="hostSearch">
   <label><span>LOCATION</span><input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Marbella, Spain"/></label>
   <label><span>MIN / NIGHT</span><input type="number" min="0" step="50" value={minNightly} onChange={e=>setMinNightly(Math.max(0,Number(e.target.value)||0))}/></label>
   <button onClick={search} disabled={loading||location.trim().length<2}>{loading?"Searching Airbnb…":"Find premium hosts"}</button>
  </div>

  {notice&&<div className="hostNotice">{notice}</div>}

  <div className="hostLayout">
   <aside className="hostList">
    {listings.length?listings.map(x=><button key={x.id} className={"hostLead "+(selected?.id===x.id?"selected":"")} onClick={()=>{setSelectedId(x.id);setAnalysis(null)}}>
     <div className="hostLeadImg">{x.photos?.[0]?<img src={x.photos[0]} alt=""/>:<span>Y</span>}</div>
     <div className="hostLeadMain"><div><strong>{x.title}</strong><b>{x.qualificationScore}</b></div><small>{x.host?.name||"Airbnb host"} · {x.location||location}</small><p>{money(x.nightlyPrice,x.currency||"EUR")} / night · {x.rating?x.rating+"★":"No rating"} · {x.reviewCount||0} reviews</p></div>
    </button>):<div className="empty">Search a market to load premium Airbnb prospects.</div>}
   </aside>

   <section className="hostDetail">
    {selected?<><div className="hostPropertyHero">
      <div className="hostHeroPhotos">{(selected.photos||[]).slice(0,3).map((src,i)=><img key={src+i} src={src} alt=""/> )}</div>
      <div className="hostHeroInfo"><span>{selected.propertyType||selected.roomType||"PROPERTY"}</span><h3>{selected.title}</h3><p>{selected.host?.name||"Host"} · {selected.location||location}</p><div><b>{money(selected.nightlyPrice,selected.currency||"EUR")} / night</b><b>{selected.qualificationScore}/100 prospect</b></div></div>
     </div>
     <div className="hostActions"><a href={selected.url} target="_blank" rel="noreferrer">Open Airbnb ↗</a><button onClick={analyze} disabled={busy==="analyze"}>{busy==="analyze"?"Gemini is analysing…":"Analyse photos + reviews"}</button></div>

     {analysis?<div className="hostAnalysis">
      <div className="hostAnalysisTop"><div><span>{String(analysis.analysis?.propertyTier||"premium").toUpperCase()} PROPERTY</span><h3>{analysis.analysis?.styleSummary||"Property analysis"}</h3></div><b>{analysis.qualificationScore}/100</b></div>

      {analysis.analysis?.heroOpportunity&&<article className="hostHeroOpportunity"><span>HERO UPGRADE</span><h4>{analysis.analysis.heroOpportunity.category}</h4><p>{analysis.analysis.heroOpportunity.reason}</p><small>{analysis.analysis.heroOpportunity.room} · {analysis.analysis.heroOpportunity.ticket}</small></article>}

      <div className="hostOpportunityGrid">{(analysis.analysis?.bestRooms||[]).slice(0,4).map((room:any,i:number)=><article key={i}><span>{room.room}</span><p>{room.visualSummary}</p><div>{(room.opportunities||[]).slice(0,3).map((o:any,j:number)=><div className="hostOpportunity" key={j}><strong>{o.category}</strong><small>{o.reason}</small><em>{o.ticket} · {o.evidence}</em></div>)}</div></article>)}</div>

      <article className="hostContactCard"><div><span>PUBLIC CONTACT</span><h4>{analysis.contact?.bestContact?.email||"No published email found yet"}</h4><p>{analysis.contact?.bestContact?.email?(String(analysis.contact.bestContact.confidence||"unknown")+" confidence · "+String(analysis.contact.bestContact.sourceUrl||"source available")):"Keep the lead and retry through company/social enrichment later."}</p></div></article>

      <article className="hostProductsCard"><div className="sectionTitle"><span>MATCHED YNOT PRODUCTS</span><b>{analysis.matchedProducts?.length||0}</b></div><div className="hostProducts">{(analysis.matchedProducts||[]).slice(0,8).map((p:any)=><a key={p.id} href={"/p/"+encodeURIComponent(p.id)+"?src=host-intelligence"} target="_blank" rel="noreferrer">{p.image?<img src={p.image} alt=""/>:<span>Y</span>}<div><strong>{p.title}</strong><small>{p.brand||"YNOT"} · {p.price!=null?money(Number(p.price),p.currency||"EUR"):"Price varies"}</small><em>{p.matchedQuery||"Matched upgrade"}</em></div></a>)}</div></article>

      <div className="hostSaveRow"><div><span>OUTREACH ANGLE</span><p>{analysis.analysis?.outreachAngle||"Premium property upgrade recommendations."}</p></div><button onClick={save} disabled={busy==="save"}>{busy==="save"?"Saving…":"Save to Outreach Inbox"}</button></div>
     </div>:null}
    </>:<div className="empty">Select a property.</div>}
   </section>
  </div>
 </section>;
}