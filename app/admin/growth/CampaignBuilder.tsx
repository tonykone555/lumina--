"use client";
import {useMemo,useState} from "react";

type Product={id:string;title:string;brand?:string;price?:number|null;currency?:string;image?:string;images?:string[];url?:string;description?:string;category?:string;content_score?:number;why?:string;signals?:Record<string,number|null>};

const niches=["home","fitness","beauty","fashion","tech","pets"];
const objectives=["organic","ugc","paid","launch","retargeting"];
const platforms=["TikTok","Instagram Reels","YouTube Shorts","X"];

export default function CampaignBuilder(){
  const [niche,setNiche]=useState("home"),[query,setQuery]=useState(""),[objective,setObjective]=useState("ugc"),[products,setProducts]=useState<Product[]>([]),[selected,setSelected]=useState<string[]>([]);
  const [branches,setBranches]=useState(5),[variants,setVariants]=useState(2),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const total=selected.length*branches*variants;
  const chosen=useMemo(()=>products.filter(p=>selected.includes(String(p.id))),[products,selected]);

  async function findProducts(){
    setBusy(true);setMessage("");
    try{
      const params=new URLSearchParams({niche,limit:"60"});
      if(query.trim())params.set("q",query.trim());
      const r=await fetch("/api/admin/growth/product-candidates?"+params.toString());
      const j=await r.json();
      if(!r.ok)throw new Error(j.error||"CANDIDATES_FAILED");
      const list=(j.candidates||[]).slice(0,60);
      setProducts(list);
      setSelected([]);
      setMessage(list.length?`${list.length} products loaded. Pick any five for Grok.`:"No products found. Try another search.");
    }catch(e:any){setMessage(e?.message||"Could not load product choices.");}
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
    <div className="factoryHead"><div><span>CREATIVE FACTORY</span><h2>Launch a Grok campaign</h2><p>Search the live YNOT catalogue or browse a broad niche. YNOT gives you a large candidate pool; you choose the five and Grok only creates from those exact products.</p></div><div className="factoryTotal"><b>{total}</b><small>planned variants</small></div></div>
    <div className="factorySearch"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")findProducts()}} placeholder="Search any product — e.g. portable blender, sofa, gym set, LED mirror"/><button onClick={findProducts} disabled={busy}>{busy?"Searching…":"Search catalogue"}</button></div><div className="factoryControls">
      <label>Niche<select value={niche} onChange={e=>setNiche(e.target.value)}>{niches.map(n=><option key={n}>{n}</option>)}</select></label>
      <label>Objective<select value={objective} onChange={e=>setObjective(e.target.value)}>{objectives.map(n=><option key={n}>{n}</option>)}</select></label>
      <label>Branches<input type="number" min={1} max={6} value={branches} onChange={e=>setBranches(Math.max(1,Math.min(6,Number(e.target.value)||1)))}/></label>
      <label>Variants<input type="number" min={1} max={4} value={variants} onChange={e=>setVariants(Math.max(1,Math.min(4,Number(e.target.value)||1)))}/></label>
      <button onClick={findProducts} disabled={busy}>{query.trim()?"Search + rank":"Browse 60 products"}</button>
    </div>
    <div className="factoryProducts">{products.length?products.map(p=>{const id=String(p.id),on=selected.includes(id);return <button type="button" className={"factoryProduct "+(on?"selected":"")} key={id} onClick={()=>toggle(id)}>
      <div className="factoryProductImage">{p.image?<img src={p.image} alt=""/>:<span>Y</span>}</div>
      <div><strong>{p.title}</strong><small>{p.brand||"YNOT"} · {p.currency||"EUR"} {p.price??"—"}</small>{p.content_score!=null&&<span className="candidateScore">Content {p.content_score}</span>}{p.why&&<em className="candidateWhy">{p.why}</em>}</div><i>{on?"✓":"+"}</i>
    </button>}):<div className="factoryEmpty">Search for anything or browse the niche to load up to 60 products. Nothing is auto-selected.</div>}</div>
    <div className="factoryLaunch"><div><strong>{selected.length}/5 products selected</strong><small>Manual product choice · image-first → video · Grok Imagine · approval gated</small></div><button onClick={start} disabled={busy||!selected.length}>{busy?"Working…":"Start campaign"}</button></div>
    {message&&<div className="factoryMessage">{message}</div>}
  </section>
}
