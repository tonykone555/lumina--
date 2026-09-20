"use client";
import {useMemo,useState} from "react";

type Product={id:string;title:string;brand?:string;price?:number|null;currency?:string;image?:string;images?:string[];url?:string;description?:string;category?:string};

const niches=["home","fitness","beauty","fashion","tech","pets"];
const objectives=["organic","ugc","paid","launch","retargeting"];
const platforms=["TikTok","Instagram Reels","YouTube Shorts","X"];

export default function CampaignBuilder(){
  const [niche,setNiche]=useState("home"),[objective,setObjective]=useState("ugc"),[products,setProducts]=useState<Product[]>([]),[selected,setSelected]=useState<string[]>([]);
  const [branches,setBranches]=useState(5),[variants,setVariants]=useState(2),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const total=selected.length*branches*variants;
  const chosen=useMemo(()=>products.filter(p=>selected.includes(String(p.id))),[products,selected]);

  async function findProducts(){
    setBusy(true);setMessage("");
    try{
      const r=await fetch(`/api/catalog?q=${encodeURIComponent(niche)}&source=shopify&country=FR`);
      const j=await r.json();
      const list=(j.products||[]).slice(0,12);
      setProducts(list);
      setSelected(list.slice(0,5).map((p:Product)=>String(p.id)));
    }catch{setMessage("Could not load catalogue products.");}
    finally{setBusy(false);}
  }

  function toggle(id:string){setSelected(s=>s.includes(id)?s.filter(x=>x!==id):s.length<5?[...s,id]:s)}

  async function start(){
    if(!selected.length)return;
    setBusy(true);setMessage("");
    try{
      const r=await fetch("/api/admin/growth/campaigns",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        niche,objective,products:chosen,branches_per_product:branches,variants_per_branch:variants,platforms
      })});
      const j=await r.json();
      if(!r.ok)throw new Error(j.error||"CAMPAIGN_CREATE_FAILED");
      setMessage(`Campaign ${j.campaign_id} created with ${j.creatives_created} creative branches. Grok can now pick up the pending prompt packs through YNOT MCP.`);
    }catch(e:any){setMessage(e?.message||"Campaign creation failed.");}
    finally{setBusy(false);}
  }

  return <section className="factoryPanel">
    <div className="factoryHead"><div><span>CREATIVE FACTORY</span><h2>Launch a Grok campaign</h2><p>Pick a niche, select up to five real YNOT products, then branch them into prompt-pack jobs for Grok.</p></div><div className="factoryTotal"><b>{total}</b><small>planned variants</small></div></div>
    <div className="factoryControls">
      <label>Niche<select value={niche} onChange={e=>setNiche(e.target.value)}>{niches.map(n=><option key={n}>{n}</option>)}</select></label>
      <label>Objective<select value={objective} onChange={e=>setObjective(e.target.value)}>{objectives.map(n=><option key={n}>{n}</option>)}</select></label>
      <label>Branches<input type="number" min={1} max={6} value={branches} onChange={e=>setBranches(Math.max(1,Math.min(6,Number(e.target.value)||1)))}/></label>
      <label>Variants<input type="number" min={1} max={4} value={variants} onChange={e=>setVariants(Math.max(1,Math.min(4,Number(e.target.value)||1)))}/></label>
      <button onClick={findProducts} disabled={busy}>Find products</button>
    </div>
    <div className="factoryProducts">{products.length?products.map(p=>{const id=String(p.id),on=selected.includes(id);return <button type="button" className={"factoryProduct "+(on?"selected":"")} key={id} onClick={()=>toggle(id)}>
      <div className="factoryProductImage">{p.image?<img src={p.image} alt=""/>:<span>Y</span>}</div>
      <div><strong>{p.title}</strong><small>{p.brand||"YNOT"} · {p.currency||"EUR"} {p.price??"—"}</small></div><i>{on?"✓":"+"}</i>
    </button>}):<div className="factoryEmpty">Choose a niche and load products from the live catalogue.</div>}</div>
    <div className="factoryLaunch"><div><strong>{selected.length}/5 products selected</strong><small>Image-first → video · Grok Imagine · 9:16 · approval gated</small></div><button onClick={start} disabled={busy||!selected.length}>{busy?"Working…":"Start campaign"}</button></div>
    {message&&<div className="factoryMessage">{message}</div>}
  </section>
}
