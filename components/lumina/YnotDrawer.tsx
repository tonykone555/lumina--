"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronRight, Search, ShoppingBag, Sparkles, X } from "lucide-react";

type Deal = {
  id:string;
  title:string;
  price:number;
  image:string;
  section:string;
  badge:string;
  note:string;
  installments?:number;
};

const sections=["Best Value","Under €25","Pay in 4","Free Delivery","Tech","Fitness","Style"];

const seedDeals:Deal[]=[
  {id:"ynot-watch",title:"Minimal Steel Watch",price:39,image:"https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=700&q=82",section:"Style",badge:"Best value",note:"Clean everyday watch with a low entry price",installments:4},
  {id:"ynot-speaker",title:"Mini Wireless Speaker",price:24,image:"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=700&q=82",section:"Tech",badge:"Under €25",note:"Portable audio pick for impulse-buy territory"},
  {id:"ynot-massage",title:"Mini Massage Gun",price:49,image:"https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=700&q=82",section:"Fitness",badge:"Free delivery",note:"Compact recovery gear with strong visual appeal",installments:4},
  {id:"ynot-bottle",title:"Insulated Gym Bottle",price:18,image:"https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=700&q=82",section:"Fitness",badge:"Under €25",note:"Simple high-utility add-on product"},
  {id:"ynot-stand",title:"Foldable Laptop Stand",price:29,image:"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=82",section:"Tech",badge:"Best value",note:"Work-from-anywhere accessory with broad appeal",installments:4},
  {id:"ynot-led",title:"Smart LED Light Strip",price:17,image:"https://images.unsplash.com/photo-1550985543-f47f38aeee86?auto=format&fit=crop&w=700&q=82",section:"Under €25",badge:"Cheap find",note:"Low-cost room upgrade that works well in short-form ads"},
  {id:"ynot-shaker",title:"Matte Protein Shaker",price:12,image:"https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=700&q=82",section:"Under €25",badge:"Low price",note:"Easy basket-builder for fitness traffic"},
  {id:"ynot-buds",title:"Compact Wireless Earbuds",price:35,image:"https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=700&q=82",section:"Tech",badge:"Free delivery",note:"Popular everyday tech category",installments:4},
  {id:"ynot-bag",title:"Everyday Crossbody Bag",price:28,image:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=82",section:"Style",badge:"Best value",note:"Simple fashion add-on with broad styling range",installments:4},
  {id:"ynot-bands",title:"Resistance Band Set",price:16,image:"https://images.unsplash.com/photo-1598289431512-b97b0917affc?auto=format&fit=crop&w=700&q=82",section:"Fitness",badge:"Under €25",note:"Compact home-training product with easy bundling"},
  {id:"ynot-keyboard",title:"Compact Bluetooth Keyboard",price:42,image:"https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=700&q=82",section:"Pay in 4",badge:"4x available",note:"Higher-intent tech accessory with installment-friendly pricing",installments:4},
  {id:"ynot-lamp",title:"Portable Desk Lamp",price:22,image:"https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=700&q=82",section:"Free Delivery",badge:"Free delivery",note:"Small home-office product that is easy to merchandise"}
];

function money(v:number){return new Intl.NumberFormat("en-IE",{style:"currency",currency:"EUR",maximumFractionDigits:2}).format(v)}

export default function YnotDrawer(){
  const [open,setOpen]=useState(false);
  const [active,setActive]=useState("Best Value");
  const [selected,setSelected]=useState<Deal>(seedDeals[0]);
  const [query,setQuery]=useState("");
  const bodyRef=useRef<HTMLDivElement>(null);

  const grouped=useMemo(()=>sections.map(section=>({section,items:seedDeals.filter(d=>section==="Best Value"?true:d.section===section||d.badge===section)})).filter(g=>g.items.length),[]);
  const searched=useMemo(()=>query.trim()?seedDeals.filter(d=>`${d.title} ${d.section} ${d.badge}`.toLowerCase().includes(query.toLowerCase())):null,[query]);

  function jump(section:string){setActive(section);const el=document.getElementById(`ynot-${section.replaceAll(" ","-").toLowerCase()}`);el?.scrollIntoView({behavior:"smooth",block:"start"})}

  return <>
    <button className="ynot-peek" onClick={()=>setOpen(true)} aria-label="Open YNOT deals">
      <span className="ynot-peek-mark">YNOT</span><span>Worth a look</span><ChevronRight/>
    </button>

    <div className={`ynot-backdrop ${open?"open":""}`} onClick={()=>setOpen(false)} />
    <aside className={`ynot-drawer ${open?"open":""}`} aria-hidden={!open}>
      <div className="ynot-head">
        <div><small>LUMINA DEAL WORLD</small><h2>YNOT</h2><p>Good products. Good prices. Why not?</p></div>
        <button className="ynot-close" onClick={()=>setOpen(false)}><X/></button>
      </div>

      <label className="ynot-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search YNOT"/></label>

      <nav className="ynot-dock" aria-label="YNOT sections">
        {sections.map(s=><button key={s} className={active===s?"active":""} onClick={()=>jump(s)}><span>{s}</span></button>)}
      </nav>

      <div className="ynot-body" ref={bodyRef}>
        {searched?<section className="ynot-section"><div className="ynot-section-title"><span>Search results</span><small>{searched.length} finds</small></div><div className="ynot-grid">{searched.map(d=><DealOrb key={d.id} deal={d} active={selected.id===d.id} onSelect={setSelected}/>)}</div></section>:
        grouped.map(group=><section className="ynot-section" key={group.section} id={`ynot-${group.section.replaceAll(" ","-").toLowerCase()}`}>
          <div className="ynot-section-title"><span>{group.section}</span><small>{group.items.length} finds</small></div>
          <div className="ynot-grid">{group.items.map(d=><DealOrb key={`${group.section}-${d.id}`} deal={d} active={selected.id===d.id} onSelect={setSelected}/>)}</div>
        </section>)}
      </div>

      <div className="ynot-selected">
        <img src={selected.image} alt=""/>
        <div className="ynot-selected-copy"><small>{selected.badge}</small><h3>{selected.title}</h3><strong>{money(selected.price)}</strong>{selected.installments&&<span>{money(selected.price/selected.installments)} × {selected.installments}</span>}<p>{selected.note}</p></div>
        <button className="ynot-shop"><ShoppingBag/><span>Open deal</span></button>
      </div>
      <div className="ynot-foot"><Sparkles/><span>Preview inventory for the YNOT experience. Live supplier offers can replace these demo products later.</span></div>
    </aside>
  </>
}

function DealOrb({deal,active,onSelect}:{deal:Deal;active:boolean;onSelect:(d:Deal)=>void}){
  return <button className={`ynot-orb ${active?"active":""}`} onClick={()=>onSelect(deal)}>
    <span className="ynot-orb-img"><img src={deal.image} alt=""/></span>
    <span className="ynot-orb-copy"><b>{deal.title}</b><em>{deal.badge}</em><strong>{money(deal.price)}</strong></span>
  </button>
}
