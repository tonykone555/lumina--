"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import "../growth.css";
import "../growth-light.css";

const ALL=["TikTok","Reddit","X","YouTube","Forum"];

export default function IntentOutreachPage(){
 const[query,setQuery]=useState("");const[country,setCountry]=useState("FR");const[timeRange,setTimeRange]=useState("week");const[platforms,setPlatforms]=useState<string[]>(ALL);const[busy,setBusy]=useState(false);const[result,setResult]=useState<any>(null);const[error,setError]=useState("");const[savedRows,setSavedRows]=useState<any[]>([]);const[savedBusy,setSavedBusy]=useState(false);const[view,setView]=useState<"scan"|"saved">("saved");
 const scanRows=Array.isArray(result?.opportunities)?result.opportunities:[];
 const rows=view==="scan"?scanRows:savedRows;
 const counts=useMemo(()=>ALL.map(p=>[p,rows.filter((x:any)=>x.platform===p).length] as const),[rows]);
 function toggle(p:string){setPlatforms(v=>v.includes(p)?v.filter(x=>x!==p):[...v,p])}
 async function loadSaved(){setSavedBusy(true);try{const r=await fetch("/api/admin/growth/intent-outreach?limit=400",{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j?.error||"Could not load saved leads");setSavedRows(Array.isArray(j?.opportunities)?j.opportunities:[])}catch(e){setError(e instanceof Error?e.message:"Could not load saved leads")}finally{setSavedBusy(false)}}
 useEffect(()=>{void loadSaved()},[]);
 async function run(){setBusy(true);setError("");setResult(null);try{const r=await fetch("/api/admin/growth/intent-outreach",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query,country,timeRange,platforms,limit:220})});const j=await r.json();if(!r.ok)throw new Error(j?.error||"Intent scan failed");setResult(j);setView("scan");await loadSaved()}catch(e){setError(e instanceof Error?e.message:"Intent scan failed")}finally{setBusy(false)}}
 return <main className="growth">
  <header><div><div className="eyebrow">YNOT / LIVE INTENT</div><h1>Outreach Discovery</h1><p>Recent buyer intent → qualification → catalogue match → personalized action.</p></div><Link href="/admin/growth" className="live">← Growth</Link></header>
  <section className="panel wide" style={{marginTop:24}}>
   <div className="panelHead"><div><span>LIVE INTENT SCANNER</span><h2>Build a long, recent lead list</h2></div><b>{savedRows.length} saved</b></div>
   <div style={{display:"grid",gridTemplateColumns:"minmax(220px,1fr) 90px 130px auto",gap:10,marginTop:18}}>
    <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Product/category, e.g. walking pad, skincare, home decor…" style={{padding:"13px 14px",borderRadius:12,border:"1px solid rgba(127,127,127,.25)",background:"transparent",color:"inherit"}}/>
    <input value={country} onChange={e=>setCountry(e.target.value.toUpperCase().slice(0,2))} style={{padding:"13px 14px",borderRadius:12,border:"1px solid rgba(127,127,127,.25)",background:"transparent",color:"inherit"}}/>
    <select value={timeRange} onChange={e=>setTimeRange(e.target.value)} style={{padding:"13px 14px",borderRadius:12,border:"1px solid rgba(127,127,127,.25)",background:"transparent",color:"inherit"}}><option value="day">Past day</option><option value="week">Past week</option><option value="month">Past month</option></select>
    <button onClick={run} disabled={busy||platforms.length===0} className="approveBtn">{busy?"Scanning…":"Find recent intent"}</button>
   </div>
   <div className="inboxFilters" style={{marginTop:14}}>{ALL.map(p=><button key={p} className={platforms.includes(p)?"active":""} onClick={()=>toggle(p)}>{p}</button>)}</div>
   <p style={{opacity:.68,fontSize:12,marginTop:10}}>TikTok uses FetchLayer video search. Reddit, X/Twitter, YouTube and forums use FetchLayer Google search scoped to those public sources. Qualified leads are persisted in the Growth CRM and can be reloaded later.</p>
   {error&&<div className="empty" style={{marginTop:18}}>{error}</div>}
   <div style={{marginTop:18,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
    <button className={view==="saved"?"approveBtn":"revokeBtn"} onClick={()=>setView("saved")}>Saved leads ({savedRows.length})</button>
    <button className={view==="scan"?"approveBtn":"revokeBtn"} disabled={!result} onClick={()=>setView("scan")}>Latest scan ({scanRows.length})</button>
    <button className="revokeBtn" disabled={savedBusy} onClick={()=>void loadSaved()}>{savedBusy?"Refreshing…":"Refresh saved"}</button>
   </div>
   {result&&<div className="inboxCounts" style={{justifyContent:"flex-start",flexWrap:"wrap",marginTop:14}}><b>{result.scanned} scanned</b><b>{result.qualified} qualified</b><b>{result.saved} saved</b></div>}
   <div className="inboxCounts" style={{justifyContent:"flex-start",flexWrap:"wrap",marginTop:12}}>{counts.map(([p,n])=><b key={p}>{p} {n}</b>)}</div>
   <div className="rows" style={{marginTop:16}}>{rows.length?rows.map((x:any,i:number)=><article className="row" key={x.id||x.external_key||i} style={{alignItems:"flex-start"}}><div className="leadAvatar">{String(x.platform||"?").slice(0,1)}</div><div className="grow"><strong>{x.display_name||x.handle||x.niche||"Buyer intent"}</strong><small>{x.platform} · intent {x.intent_strength??"—"} · {x.country||country}{x.updated_at?` · ${new Date(x.updated_at).toLocaleDateString()}`:""}</small><p style={{margin:"7px 0",opacity:.84}}>{x.source_quote||x.summary||x.reason}</p><small>{x.reason}</small><div className="intentContextMeta" style={{marginTop:8}}>{(x.intent_tags||[]).slice(0,6).map((t:string)=><span key={t}>{t}</span>)}</div><p style={{marginTop:9}}><b>Draft:</b> {x.draft_message||"—"}</p></div><div style={{display:"grid",gap:8,minWidth:130}}>{x.source_post_url&&<a href={x.source_post_url} target="_blank" rel="noreferrer">Source ↗</a>}<span>{x.matched_product_ids?.length||0} products</span><span>{x.status||"ready"}</span></div></article>):<div className="empty">{view==="saved"?"No saved intent leads yet. Run a scan to add some.":"No qualified buying-intent leads found. Broaden the category or use a longer time range."}</div>}</div>
   <div style={{marginTop:16,display:"flex",gap:10}}><Link href="/admin/growth#outreach-inbox" className="approveBtn">Open Outreach Inbox</Link></div>
  </section>
 </main>
}
