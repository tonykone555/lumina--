"use client";

import {useEffect,useMemo,useState} from "react";

type Item={id:string;kind:string;source?:string;title:string;summary?:string;url?:string;image_url?:string;score?:number;payload?:any;created_at?:string};
type Folder={id:string;name:string;niche?:string;description?:string;cover_image_url?:string;created_at?:string;updated_at?:string;ynot_growth_research_items?:Item[]};

export default function ResearchLibrary(){
 const[folders,setFolders]=useState<Folder[]>([]),[selected,setSelected]=useState<Folder|null>(null),[busy,setBusy]=useState(true),[notice,setNotice]=useState("");
 async function load(){setBusy(true);setNotice("");try{const r=await fetch("/api/admin/growth/research",{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not load research library");setFolders(j.folders||[])}catch(e){setNotice(e instanceof Error?e.message:"Could not load research library")}finally{setBusy(false)}}
 useEffect(()=>{load();const refresh=()=>load();window.addEventListener("ynot:research-saved",refresh);return()=>window.removeEventListener("ynot:research-saved",refresh)},[]);
 const count=useMemo(()=>folders.reduce((n,f)=>n+(f.ynot_growth_research_items?.length||0),0),[folders]);
 return <section className="researchLibrary" id="research-library">
  <div className="researchLibraryTop"><div><span>RESEARCH LIBRARY</span><h2>Saved intelligence folders</h2><p>Every useful demand scan, ad example and product shortlist can be kept as a visual folder with the full source context.</p></div><div className="researchLibraryStats"><b>{folders.length} folders</b><b>{count} saved items</b></div></div>
  {notice&&<div className="researchLibraryNotice">{notice}</div>}
  <div className="researchFolderGrid">{busy?<div className="researchEmpty">Loading folders…</div>:folders.length?folders.map(f=>{const items=f.ynot_growth_research_items||[];const imgs=[f.cover_image_url,...items.map(x=>x.image_url)].filter(Boolean).slice(0,4) as string[];return <button className="researchFolder" key={f.id} onClick={()=>setSelected(f)}><div className="folderPreview">{imgs.length?imgs.map((src,i)=><img src={src} alt="" key={src+i}/>):<div className="folderGlyph">Y</div>}</div><div className="folderMeta"><span>{f.niche||"Research"}</span><h3>{f.name}</h3><p>{f.description||"Saved Growth intelligence and examples."}</p><footer><b>{items.length} items</b><em>Open folder →</em></footer></div></button>}):<div className="researchEmpty">Nothing saved yet. Run a demand, ad or product discovery search and use “Save to folder”.</div>}</div>
  {selected&&<div className="researchModalBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="researchModal"><button className="researchClose" onClick={()=>setSelected(null)}>×</button><header><span>RESEARCH FOLDER</span><h2>{selected.name}</h2><p>{selected.description||selected.niche||"Saved YNOT Growth intelligence."}</p><div><b>{selected.ynot_growth_research_items?.length||0} items</b>{selected.niche&&<b>{selected.niche}</b>}</div></header><div className="researchItemGrid">{(selected.ynot_growth_research_items||[]).map(item=><article key={item.id}>{item.image_url?<img src={item.image_url} alt=""/>:<div className="researchItemPlaceholder">Y</div>}<div><span>{item.source||item.kind}</span><h3>{item.title}</h3>{item.summary&&<p>{item.summary}</p>}<footer>{item.score!=null&&<b>Score {Math.round(Number(item.score))}</b>}{item.url?<a href={item.url} target="_blank" rel="noreferrer">Source ↗</a>:<em>{item.kind}</em>}</footer></div></article>)}</div></section></div>}
 </section>
}
