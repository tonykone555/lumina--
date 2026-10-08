"use client";

import {useEffect,useMemo,useState} from "react";
import "./ebay.css";

type Candidate={id:string;created_at:string;status:string;source_url:string;merchant_name?:string|null;title:string;brand?:string|null;model?:string|null;condition?:string|null;supplier_price?:number|null;supplier_currency?:string|null;estimated_ebay_price?:number|null;estimated_profit?:number|null;image_urls?:string[];origin_country?:string|null;origin_city?:string|null;origin_postal_code?:string|null;last_error?:string|null};
type Attempt={id:string;created_at:string;query?:string|null;product_id?:string|null;product_title?:string|null;stage:string;status:string;error_class?:string|null;error_code?:string|null;error_message?:string|null;listing_id?:string|null;sku?:string|null;retryable:boolean};

export default function EbayDashboardClient(){
 const [token,setToken]=useState("");
 const [savedToken,setSavedToken]=useState("");
 const [data,setData]=useState<{candidates:Candidate[];attempts:Attempt[]}>({candidates:[],attempts:[]});
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{const t=sessionStorage.getItem("ynot-ebay-token")||"";if(t){setToken(t);setSavedToken(t)}},[]);
 async function load(nextToken=savedToken||token){
  if(!nextToken){setError("Enter your YNOT access token.");return}
  setLoading(true);setError("");
  try{
   const r=await fetch("/api/ebay/dashboard",{headers:{Authorization:`Bearer ${nextToken}`},cache:"no-store"});
   const j=await r.json();
   if(!r.ok)throw new Error(j?.error||`HTTP ${r.status}`);
   sessionStorage.setItem("ynot-ebay-token",nextToken);
   setSavedToken(nextToken);setData({candidates:j.candidates||[],attempts:j.attempts||[]});
  }catch(e){setError(e instanceof Error?e.message:"Could not load eBay dashboard")}
  finally{setLoading(false)}
 }
 const stats=useMemo(()=>({
  candidates:data.candidates.length,
  profit:data.candidates.reduce((s,x)=>s+Math.max(0,Number(x.estimated_profit||0)),0),
  published:data.attempts.filter(x=>x.status==="published").length,
  problems:data.attempts.filter(x=>x.status==="failed"||x.status==="blocked").length
 }),[data]);
 return <main className="ebayAdmin">
  <header className="ebayTop"><div><a href="/" className="ebayBrand">YNOT</a><span>eBay Autopilot</span></div>{savedToken&&<button onClick={()=>load()} disabled={loading}>{loading?"Refreshing…":"Refresh"}</button>}</header>
  {!savedToken?<section className="ebayGate"><div><small>PRIVATE YNOT TOOL</small><h1>eBay Autopilot</h1><p>Enter your YNOT access token to open the private product and publishing dashboard.</p><input type="password" value={token} onChange={e=>setToken(e.target.value)} placeholder="YNOT access token"/><button onClick={()=>load(token)} disabled={loading}>{loading?"Opening…":"Open dashboard"}</button>{error&&<em>{error}</em>}</div></section>:
  <>
   <section className="ebayHero"><div><small>YNOT · EBAY FRANCE</small><h1>Find. Check. Publish.</h1><p>Products found from ChatGPT/web research and YNOT catalogue discovery, with publishing results and exact eBay blockers in one place.</p></div><div className="ebayStats"><div><span>Candidates</span><b>{stats.candidates}</b></div><div><span>Est. opportunity</span><b>€{stats.profit.toLocaleString(undefined,{maximumFractionDigits:0})}</b></div><div><span>Published</span><b>{stats.published}</b></div><div><span>Problems</span><b>{stats.problems}</b></div></div></section>
   {error&&<div className="ebayError">{error}</div>}
   <section className="ebaySection"><div className="ebaySectionHead"><div><small>PRODUCT FINDER</small><h2>Web candidates</h2></div><span>{data.candidates.length} saved</span></div>
    <div className="ebayGrid">{data.candidates.length?data.candidates.map(c=><article className="ebayCard" key={c.id}>
      <div className="ebayImage">{c.image_urls?.[0]?<img src={c.image_urls[0]} alt=""/>:<span>Y</span>}</div>
      <div className="ebayCardBody"><div className="ebayBadges"><i>{c.status}</i>{c.origin_country&&<i>{c.origin_country}</i>}</div><h3>{c.title}</h3><p>{[c.brand,c.model,c.merchant_name].filter(Boolean).join(" · ")}</p><div className="ebayMoney"><span>Cost <b>{c.supplier_currency||"EUR"} {Number(c.supplier_price||0).toLocaleString()}</b></span><span>Est. eBay <b>€{Number(c.estimated_ebay_price||0).toLocaleString()}</b></span><span>Profit <b>€{Number(c.estimated_profit||0).toLocaleString()}</b></span></div>{c.last_error&&<div className="ebayInlineError">{c.last_error}</div>}<a href={c.source_url} target="_blank" rel="noreferrer">Open supplier ↗</a></div>
    </article>):<div className="ebayEmpty">No web candidates saved yet. Products I find in ChatGPT will appear here.</div>}</div>
   </section>
   <section className="ebaySection"><div className="ebaySectionHead"><div><small>EBAY DIAGNOSTICS</small><h2>Publish history</h2></div><span>{data.attempts.length} recent attempts</span></div>
    <div className="ebayTable">{data.attempts.length?data.attempts.map(a=><div className="ebayRow" key={a.id}><div><strong>{a.product_title||a.product_id||"Unknown product"}</strong><span>{new Date(a.created_at).toLocaleString()} · {a.stage}</span></div><div><b className={`status ${a.status}`}>{a.status}</b>{a.error_class&&<span>{a.error_class}{a.error_code?` · ${a.error_code}`:""}</span>}</div><div>{a.listing_id?<strong>Listing {a.listing_id}</strong>:<span>{a.error_message||"No error"}</span>}{a.retryable&&<i>Retryable</i>}</div></div>):<div className="ebayEmpty">No publishing attempts logged yet.</div>}</div>
   </section>
  </>}
 </main>;
}
