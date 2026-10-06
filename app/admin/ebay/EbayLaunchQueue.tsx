"use client";
import {useState} from "react";

const DISCOVERY=["skincare","necklace","gym shorts","dress","handbag","pet bed","table lamp","home decor","fitness accessories","travel bag"];

export default function EbayLaunchQueue(){
 const [query,setQuery]=useState("skincare");
 const [data,setData]=useState<any>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");

 async function preview(q=query){
  setBusy(true);setMessage("");
  try{
   const r=await fetch(`/api/ebay/listings/global-preview?q=${encodeURIComponent(q)}&marketplaces=EBAY_FR&t=${Date.now()}`,{cache:"no-store",credentials:"include"});
   const j=await r.json(); if(!r.ok)throw new Error(j.error||"Preview failed"); setData(j); return j;
  }catch(e:any){setMessage(e?.message||"Preview failed");return null}finally{setBusy(false)}
 }
 async function findEligible(){
  setBusy(true);setMessage("Scanning YNOT catalogue for the first product that can be listed on eBay France…");
  try{
   for(const q of DISCOVERY){
    const r=await fetch(`/api/ebay/listings/global-preview?q=${encodeURIComponent(q)}&marketplaces=EBAY_FR&t=${Date.now()}`,{cache:"no-store",credentials:"include"});
    const j=await r.json();
    const row=j?.marketplaces?.[0];
    if(r.ok&&row?.publishable){setQuery(q);setData(j);setMessage(`Eligible product found for “${q}”.`);return}
   }
   setMessage("No fully publishable product was found in the quick scan. Try another query or wait for more supplier-location data.");
  }catch(e:any){setMessage(e?.message||"Scan failed")}finally{setBusy(false)}
 }
 async function publish(){
  const row=data?.marketplaces?.[0]; if(!row?.publishable)return;
  if(!confirm(`Publish “${data?.sourceProduct?.title}” to eBay France now?`))return;
  setBusy(true);setMessage("");
  try{
   const item={...row.preview,...row.sellerDefaults,quantity:5,condition:"NEW"};
   const r=await fetch("/api/ebay/listings/publish",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({...item,originVerified:true,confirmPublish:true})});
   const j=await r.json();if(!r.ok)throw new Error(j.error||"eBay publish failed");
   setMessage(`Published ✓ Listing ${j.listingId||""}`);
  }catch(e:any){setMessage(e?.message||"eBay publish failed")}finally{setBusy(false)}
 }

 const row=data?.marketplaces?.[0];
 return <section className="ebayCard">
  <div className="ebayToolbar">
   <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search YNOT catalogue"/>
   <button onClick={()=>preview()} disabled={busy}>Preview</button>
   <button onClick={findEligible} disabled={busy}>Find first eligible</button>
  </div>
  {data&&<div className="ebayResult">
   <div className="product"><img src={data?.sourceProduct?.image||""} alt=""/><div><small>{data?.sourceProduct?.brand}</small><h2>{data?.sourceProduct?.title}</h2><p>{data?.sourceProduct?.price} {data?.sourceProduct?.currency}</p></div></div>
   <div className="facts">
    <div><span>Ships to France</span><strong>{row?.shipsTo?"Yes":"No"}</strong></div>
    <div><span>Ship-from origin</span><strong>{row?.sourceOrigin||"Unknown"}</strong></div>
    <div><span>Item location</span><strong>{row?.originLocationReady?"Auto-ready":"Needs supplier postal/city"}</strong></div>
    <div><span>Category</span><strong>{row?.categoryName||"—"}</strong></div>
    <div><span>Margin</span><strong>{row?.marginPct==null?"Unknown":`${row.marginPct}%`}</strong></div>
    <div><span>Delivery max</span><strong>{row?.deliveryDaysMax==null?"Unknown":`${row.deliveryDaysMax} days`}</strong></div>
   </div>
   {!!row?.blockers?.length&&<div className="warn">Blocked: {row.blockers.join(" · ")}</div>}
   {!!row?.warnings?.length&&<div className="notice">Review: {row.warnings.join(" · ")}</div>}
   <button className="publish" disabled={busy||!row?.publishable} onClick={publish}>{row?.publishable?"Publish first listing":"Not publishable yet"}</button>
  </div>}
  {message&&<div className="message">{message}</div>}
 </section>;
}
