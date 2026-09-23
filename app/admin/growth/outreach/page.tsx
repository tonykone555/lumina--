"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import GrowthNav from "../GrowthNav";
import "../growth.css";
import "../growth-light.css";
import "./outreach.css";

const ALL=["TikTok","Reddit","X","YouTube","Forum"];
type View="saved"|"all"|"filtered";

export default function IntentOutreachPage(){
 const[query,setQuery]=useState("");const[country,setCountry]=useState("FR");const[timeRange,setTimeRange]=useState("week");const[platforms,setPlatforms]=useState<string[]>(ALL);const[busy,setBusy]=useState(false);const[result,setResult]=useState<any>(null);const[error,setError]=useState("");const[savedRows,setSavedRows]=useState<any[]>([]);const[savedBusy,setSavedBusy]=useState(false);const[view,setView]=useState<View>("saved");
 const allScanRows=Array.isArray(result?.allOpportunities)?result.allOpportunities:Array.isArray(result?.opportunities)?result.opportunities:[];
 const filteredRows=Array.isArray(result?.qualifiedOpportunities)?result.qualifiedOpportunities:allScanRows.filter((x:any)=>x?.constraints?.gemini_qualified===true||Number(x?.intent_strength)>=55);
 const rows=view==="saved"?savedRows:view==="filtered"?filteredRows:allScanRows;
 const counts=useMemo(()=>ALL.map(p=>[p,rows.filter((x:any)=>x.platform===p).length] as const),[rows]);
 function toggle(p:string){setPlatforms(v=>v.includes(p)?v.filter(x=>x!==p):[...v,p])}
 async function loadSaved(){setSavedBusy(true);try{const r=await fetch("/api/admin/growth/intent-outreach?limit=400",{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j?.error||"Could not load saved leads");setSavedRows(Array.isArray(j?.opportunities)?j.opportunities:[])}catch(e){setError(e instanceof Error?e.message:"Could not load saved leads")}finally{setSavedBusy(false)}}
 useEffect(()=>{void loadSaved()},[]);
 async function run(){setBusy(true);setError("");setResult(null);try{const r=await fetch("/api/admin/growth/intent-outreach",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query,country,timeRange,platforms,limit:220})});const j=await r.json();if(!r.ok)throw new Error(j?.error||"Intent scan failed");setResult(j);setView("all");await loadSaved()}catch(e){setError(e instanceof Error?e.message:"Intent scan failed")}finally{setBusy(false)}}
 return <main className="growth outreachPage">
  <header className="outreachHeader"><div><div className="eyebrow">YNOT / GROWTH OS</div><h1>Outreach</h1><p>Recent buyer intent → qualification → catalogue match → personalized action.</p></div><Link href="/admin/growth" className="live outreachBack">← Overview</Link></header>
  <GrowthNav active="outreach"/>
  <section className="panel wide outreachPanel">
   <div className="panelHead outreachPanelHead"><div><span>LIVE INTENT SCANNER</span><h2>Build a long, recent lead list</h2></div><b>{savedRows.length} saved</b></div>
   <div className="outreachControls">
    <input className="outreachInput outreachQuery" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Product/category, e.g. walking pad, skincare, home decor…"/>
    <input className="outreachInput outreachCountry" value={country} onChange={e=>setCountry(e.target.value.toUpperCase().slice(0,2))}/>
    <select className="outreachInput outreachRange" value={timeRange} onChange={e=>setTimeRange(e.target.value)}><option value="day">Past day</option><option value="week">Past week</option><option value="month">Past month</option></select>
    <button onClick={run} disabled={busy||platforms.length===0} className="approveBtn outreachScanBtn">{busy?"Scanning…":"Find recent intent"}</button>
   </div>
   <div className="inboxFilters outreachPlatforms">{ALL.map(p=><button key={p} className={platforms.includes(p)?"active":""} onClick={()=>toggle(p)}>{p}</button>)}</div>
   <p className="outreachNote">Every paid scan result is kept. Use <b>All scanned</b> to inspect everything returned and <b>Gemini filtered</b> for the stronger buying-intent shortlist. Qualified leads receive product matching and personalized drafts.</p>
   {error&&<div className="empty outreachError">{error}</div>}
   <div className="outreachViewTabs">
    <button className={view==="saved"?"approveBtn":"revokeBtn"} onClick={()=>setView("saved")}>Saved archive ({savedRows.length})</button>
    <button className={view==="all"?"approveBtn":"revokeBtn"} disabled={!result} onClick={()=>setView("all")}>All scanned ({allScanRows.length})</button>
    <button className={view==="filtered"?"approveBtn":"revokeBtn"} disabled={!result} onClick={()=>setView("filtered")}>Gemini filtered ({filteredRows.length})</button>
    <button className="revokeBtn" disabled={savedBusy} onClick={()=>void loadSaved()}>{savedBusy?"Refreshing…":"Refresh saved"}</button>
   </div>
   {result&&<div className="inboxCounts outreachStats"><b>{result.scanned} scanned</b><b>{result.qualified} Gemini filtered</b><b>{result.saved} newly persisted/updated</b></div>}
   <div className="inboxCounts outreachStats outreachPlatformCounts">{counts.map(([p,n])=><b key={p}>{p} {n}</b>)}</div>
   <div className="rows outreachRows">{rows.length?rows.map((x:any,i:number)=>{const filtered=x?.constraints?.gemini_qualified===true||Number(x?.intent_strength)>=55;return <article className="row outreachLead" key={x.id||x.external_key||i}><div className="leadAvatar outreachLeadAvatar">{String(x.platform||"?").slice(0,1)}</div><div className="grow outreachLeadMain"><strong>{x.display_name||x.handle||x.niche||"Scanned signal"}</strong><small>{x.platform} · {filtered?`intent ${x.intent_strength??"—"}`:"not Gemini-filtered"} · {x.country||country}{x.updated_at?` · ${new Date(x.updated_at).toLocaleDateString()}`:""}</small><p className="outreachQuote">{x.source_quote||x.summary||x.reason}</p><small>{x.reason}</small><div className="intentContextMeta outreachTags">{filtered&&<span>Gemini selected</span>}{(x.intent_tags||[]).slice(0,6).map((t:string)=><span key={t}>{t}</span>)}</div>{x.draft_message&&<p className="outreachDraft"><b>Draft:</b> {x.draft_message}</p>}</div><div className="outreachLeadActions">{x.source_post_url&&<a href={x.source_post_url} target="_blank" rel="noreferrer">Source ↗</a>}<span>{x.matched_product_ids?.length||0} products</span><span>{x.status||"new"}</span></div></article>}):<div className="empty">{view==="saved"?"No saved scan results yet. Run a scan to add some.":view==="filtered"?"Gemini did not select any high-intent leads from this scan.":"No source results were returned for this scan."}</div>}</div>
   <div className="outreachFooter"><Link href="/admin/growth#outreach-inbox" className="approveBtn">Open Outreach Inbox</Link></div>
  </section>
 </main>
}
