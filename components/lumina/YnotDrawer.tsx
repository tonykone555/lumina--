"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Search, ShoppingBag, Sparkles, X } from "lucide-react";

type Deal = {
  id:string; title:string; brand?:string; price:number; currency:string; image:string; url:string;
  section:string; sections:string[]; badge:string; note:string; installments?:number; score?:number; source?:string;
};

type FeedItem={
  source:string; source_product_id:string; title:string; brand?:string; price:number|null; currency?:string;
  image_url:string; product_url:string; primary_section:string; sections?:string[]; badge?:string; offer_score?:number;
  installment_eligible?:boolean; free_delivery_evidence?:boolean;
};

const sections=["Best Value","Under €25","Pay in 4","Watches","Tech","Fitness","Style","Beauty","Home","Free Delivery"];
const fallback:Deal[]=[
  {id:"preview-watch",title:"Minimal Steel Watch",brand:"YNOT preview",price:39,currency:"EUR",image:"https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=700&q=82",url:"#",section:"Watches",sections:["Best Value","Watches","Under €25"],badge:"Preview",note:"Preview product while live offers load.",installments:4},
  {id:"preview-speaker",title:"Mini Wireless Speaker",brand:"YNOT preview",price:24,currency:"EUR",image:"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=700&q=82",url:"#",section:"Tech",sections:["Best Value","Under €25","Tech"],badge:"Preview",note:"Preview product while live offers load."}
];

function money(v:number,currency="EUR"){try{return new Intl.NumberFormat("en-IE",{style:"currency",currency,maximumFractionDigits:2}).format(v)}catch{return `${v.toFixed(2)} ${currency}`}}
function normalizeSections(item:FeedItem){return (item.sections||[]).map(s=>s==="Under 25"?"Under €25":s)}
function toDeal(item:FeedItem):Deal|null{
  if(item.price==null||!item.image_url||!item.product_url)return null;
  const ss=normalizeSections(item);
  return {id:`${item.source}:${item.source_product_id}`,title:item.title,brand:item.brand,price:Number(item.price),currency:item.currency||"EUR",image:item.image_url,url:item.product_url,section:item.primary_section||"Best Value",sections:ss.length?ss:[item.primary_section||"Best Value"],badge:item.badge||"Worth a look",note:`${item.brand||"Independent store"} · ${item.offer_score||0}/100 offer score`,installments:item.installment_eligible?4:undefined,score:item.offer_score||0,source:item.source};
}

export default function YnotDrawer(){
  const [open,setOpen]=useState(false);
  const [active,setActive]=useState("Best Value");
  const [deals,setDeals]=useState<Deal[]>(fallback);
  const [selected,setSelected]=useState<Deal>(fallback[0]);
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true);
  const [live,setLive]=useState(false);
  const bodyRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    let alive=true;
    fetch("https://iycxkwoxbkanfyraohge.supabase.co/functions/v1/ynot-feed")
      .then(r=>r.json()).then(data=>{if(!alive)return;const items=(data?.items||[]).map(toDeal).filter(Boolean) as Deal[];if(items.length){setDeals(items);setSelected(items[0]);setLive(true)}})
      .catch(()=>{}).finally(()=>alive&&setLoading(false));
    return()=>{alive=false};
  },[]);

  const grouped=useMemo(()=>sections.map(section=>({section,items:deals.filter(d=>section==="Best Value"?d.sections.includes("Best Value")||true:d.sections.includes(section)||d.section===section)})).filter(g=>g.items.length),[deals]);
  const searched=useMemo(()=>query.trim()?deals.filter(d=>`${d.title} ${d.brand||""} ${d.section} ${d.badge}`.toLowerCase().includes(query.toLowerCase())):null,[query,deals]);

  function jump(section:string){setActive(section);const el=document.getElementById(`ynot-${section.replaceAll(" ","-").replace("€","").toLowerCase()}`);el?.scrollIntoView({behavior:"smooth",block:"start"})}
  function openDeal(){if(selected.url&&selected.url!=="#")window.open(selected.url,"_blank","noopener,noreferrer")}

  return <>
    <button className="ynot-peek" onClick={()=>setOpen(true)} aria-label="Open YNOT deals">
      <span className="ynot-peek-mark">YNOT</span><span>{live?"Live offers":"Worth a look"}</span><ChevronRight/>
    </button>

    <div className={`ynot-backdrop ${open?"open":""}`} onClick={()=>setOpen(false)} />
    <aside className={`ynot-drawer ${open?"open":""}`} aria-hidden={!open}>
      <div className="ynot-head">
        <div><small>LUMINA DEAL WORLD</small><h2>YNOT</h2><p>Products automatically sorted by value, price and category.</p></div>
        <button className="ynot-close" onClick={()=>setOpen(false)}><X/></button>
      </div>

      <label className="ynot-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search YNOT"/></label>

      <nav className="ynot-dock" aria-label="YNOT sections">
        {sections.filter(s=>s==="Best Value"||deals.some(d=>d.sections.includes(s)||d.section===s)).map(s=><button key={s} className={active===s?"active":""} onClick={()=>jump(s)}><span>{s}</span></button>)}
      </nav>

      <div className="ynot-body" ref={bodyRef}>
        {searched?<section className="ynot-section"><div className="ynot-section-title"><span>Search results</span><small>{searched.length} finds</small></div><div className="ynot-grid">{searched.map(d=><DealOrb key={d.id} deal={d} active={selected.id===d.id} onSelect={setSelected}/>)}</div></section>:
        grouped.map(group=><section className="ynot-section" key={group.section} id={`ynot-${group.section.replaceAll(" ","-").replace("€","").toLowerCase()}`}>
          <div className="ynot-section-title"><span>{group.section}</span><small>{group.items.length} finds</small></div>
          <div className="ynot-grid">{group.items.map(d=><DealOrb key={`${group.section}-${d.id}`} deal={d} active={selected.id===d.id} onSelect={setSelected}/>)}</div>
        </section>)}
      </div>

      <div className="ynot-selected">
        <img src={selected.image} alt=""/>
        <div className="ynot-selected-copy"><small>{selected.badge}{selected.score?` · ${selected.score}/100`:""}</small><h3>{selected.title}</h3><strong>{money(selected.price,selected.currency)}</strong>{selected.installments&&<span>{money(selected.price/selected.installments,selected.currency)} × {selected.installments}</span>}<p>{selected.note}</p></div>
        <button className="ynot-shop" onClick={openDeal} disabled={selected.url==="#"}><ShoppingBag/><span>Open deal</span></button>
      </div>
      <div className="ynot-foot"><Sparkles/><span>{loading?"Loading live YNOT offers…":live?"Live product feed · automatically classified and scored":"Live feed unavailable · showing preview products"}</span></div>
    </aside>
  </>
}

function DealOrb({deal,active,onSelect}:{deal:Deal;active:boolean;onSelect:(d:Deal)=>void}){
  return <button className={`ynot-orb ${active?"active":""}`} onClick={()=>onSelect(deal)}>
    <span className="ynot-orb-img"><img src={deal.image} alt=""/></span>
    <span className="ynot-orb-copy"><b>{deal.title}</b><em>{deal.badge}</em><strong>{money(deal.price,deal.currency)}</strong></span>
  </button>
}
