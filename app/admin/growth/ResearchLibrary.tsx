"use client";

import "./research-library.css";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";

type Item={id:string;kind:string;source?:string;title:string;summary?:string;url?:string;image_url?:string;score?:number;payload?:any;created_at?:string};
type Folder={id:string;name:string;niche?:string;description?:string;cover_image_url?:string;created_at?:string;updated_at?:string;ynot_growth_research_items?:Item[]};
type Props={products?:any[]};

function words(v:string){return String(v||"").toLowerCase().replace(/[^a-z0-9€$£ ]+/g," ").split(/\s+/).filter(x=>x.length>3)}
function topValues(values:string[],limit=6){const m=new Map<string,number>();values.filter(Boolean).forEach(v=>m.set(v,(m.get(v)||0)+1));return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,limit)}
function analyse(folder:Folder,products:any[]){
 const items=(folder.ynot_growth_research_items||[]).filter(x=>x.kind==="ad"||String(x.source||"").toLowerCase().includes("ads"));
 const payloads=items.map(x=>x.payload||{});
 const ctas=topValues(payloads.map(x=>String(x.cta||"")).filter(Boolean));
 const formats=topValues(payloads.map(x=>String(x.format||"")).filter(Boolean));
 const advertisers=topValues(payloads.map(x=>String(x.advertiser||"")).filter(Boolean));
 const corpus=payloads.map(x=>[x.headline,x.body,x.cta].filter(Boolean).join(" ")).join(" ");
 const freq=new Map<string,number>();words(corpus).forEach(w=>freq.set(w,(freq.get(w)||0)+1));
 const keywords=[...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
 const queryWords=new Set(words(`${folder.name} ${folder.niche||""} ${corpus}`));
 const matched=[...products].map(p=>{const title=String(p.title||"");const hits=words(title).filter(w=>queryWords.has(w)).length;return{...p,_match:hits*20+Number(p.advertability_score||0)}}).sort((a,b)=>b._match-a._match).slice(0,6);
 return{items,ctas,formats,advertisers,keywords,matched};
}

export default function ResearchLibrary({products=[]}:Props){
 const[folders,setFolders]=useState<Folder[]>([]),[selected,setSelected]=useState<Folder|null>(null),[busy,setBusy]=useState(true),[notice,setNotice]=useState(""),[showAnalysis,setShowAnalysis]=useState(false);
 const[sourceAd,setSourceAd]=useState<Item|null>(null),[createBusy,setCreateBusy]=useState(false),[createProgress,setCreateProgress]=useState(""),[createResults,setCreateResults]=useState<any[]>([]),[creativePlan,setCreativePlan]=useState<any>(null);
 async function load(){setBusy(true);setNotice("");try{const r=await fetch("/api/admin/growth/research",{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not load research library");setFolders(j.folders||[])}catch(e){setNotice(e instanceof Error?e.message:"Could not load research library")}finally{setBusy(false)}}
 useEffect(()=>{load();const refresh=()=>load();window.addEventListener("ynot:research-saved",refresh);return()=>window.removeEventListener("ynot:research-saved",refresh)},[]);
 const count=useMemo(()=>folders.reduce((n,f)=>n+(f.ynot_growth_research_items?.length||0),0),[folders]);
 const analysis=useMemo(()=>selected?analyse(selected,products):null,[selected,products]);

 async function createFromAd(product:any,adItem?:Item|null){
  if(!selected||!analysis||createBusy)return;
  const item=adItem||sourceAd||analysis.items[0];if(!item){setNotice("Choose a saved ad first.");return}
  setCreateBusy(true);setCreateResults([]);setCreativePlan(null);setNotice("");
  try{
   setCreateProgress("Gemini is analysing the source ad and adapting it to our product…");
   const ar=await fetch("/api/admin/growth/create-from-ad",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"analyse",ad:item.payload||item,product,contextAds:analysis.items.slice(0,12).map(x=>x.payload||x),folderId:selected.id})});
   const aj=await ar.json();if(!ar.ok)throw new Error(aj.error||"Ad analysis failed");
   setCreativePlan(aj.analysis);
   const directions=(aj.analysis?.directions||[]).slice(0,5);const all:any[]=[];
   for(let i=0;i<directions.length;i++){
    setCreateProgress(`Modal GPU is generating direction ${i+1} of ${directions.length} · 4 variants…`);
    const gr=await fetch("/api/admin/growth/create-from-ad",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"generate",ad:item.payload||item,product,analysis:aj.analysis,direction:directions[i],folderId:selected.id})});
    const gj=await gr.json();if(!gr.ok)throw new Error(gj.error||`Generation failed on direction ${i+1}`);
    all.push(...(gj.variants||[]).map((v:any)=>({...v,direction:directions[i],creativeId:gj.creative?.id||null})));
    setCreateResults([...all]);
   }
   setCreateProgress(`Finished · ${all.length} original variants generated and scored.`);
   setNotice(`Created ${all.length} YNOT ad variants for ${product.title}. They were saved back into this folder and the creative review queue.`);
   window.dispatchEvent(new Event("ynot:research-saved"));
  }catch(e){setCreateProgress("");setNotice(e instanceof Error?e.message:"Could not create ad variants")}finally{setCreateBusy(false)}
 }

 return <section className="researchLibrary" id="research-library">
  <div className="researchLibraryTop"><div><span>RESEARCH LIBRARY</span><h2>Saved intelligence folders</h2><p>Saved ad research, demand scans and product shortlists live here. Open an ad folder, choose a source ad and let Gemini adapt its useful patterns to one of our products before Modal generates original variants.</p></div><div className="researchLibraryStats"><b>{folders.length} folders</b><b>{count} saved items</b></div></div>
  {notice&&<div className="researchLibraryNotice">{notice}</div>}
  <div className="researchFolderGrid">{busy?<div className="researchEmpty">Loading folders…</div>:folders.length?folders.map(f=>{const items=f.ynot_growth_research_items||[];const imgs=[f.cover_image_url,...items.map(x=>x.image_url)].filter(Boolean).slice(0,4) as string[];return <button className="researchFolder" key={f.id} onClick={()=>{setSelected(f);setShowAnalysis(false);setSourceAd(null);setCreateResults([]);setCreativePlan(null);setCreateProgress("")}}><div className="folderPreview">{imgs.length?imgs.map((src,i)=><img src={src} alt="" key={src+i}/>):<div className="folderGlyph">Y</div>}</div><div className="folderMeta"><span>{f.niche||"Research"}</span><h3>{f.name}</h3><p>{f.description||"Saved Growth intelligence and examples."}</p><footer><b>{items.length} items</b><em>Open folder →</em></footer></div></button>}):<div className="researchEmpty">Nothing saved yet. Run a demand, ad or product discovery search and use “Save to folder”.</div>}</div>
  {selected&&<div className="researchModalBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="researchModal"><button className="researchClose" onClick={()=>setSelected(null)}>×</button><header><span>RESEARCH FOLDER</span><h2>{selected.name}</h2><p>{selected.description||selected.niche||"Saved YNOT Growth intelligence."}</p><div><b>{selected.ynot_growth_research_items?.length||0} items</b>{selected.niche&&<b>{selected.niche}</b>}{analysis?.items.length?<button className="researchAnalyse" onClick={()=>setShowAnalysis(v=>!v)}>{showAnalysis?"Hide analysis":"Analyse ads"}</button>:null}</div></header>
   {showAnalysis&&analysis&&<section className="researchAnalysis"><div className="researchAnalysisHead"><div><span>AD PATTERN ANALYSIS</span><h3>Turn market patterns into original YNOT creative</h3></div><b>{analysis.items.length} ads analysed</b></div><div className="researchSignals"><div><span>Repeated CTAs</span>{analysis.ctas.length?analysis.ctas.map(([x,n])=><b key={x}>{x} · {n}</b>):<b>None returned</b>}</div><div><span>Formats</span>{analysis.formats.length?analysis.formats.map(([x,n])=><b key={x}>{x} · {n}</b>):<b>Unknown</b>}</div><div><span>Language patterns</span>{analysis.keywords.slice(0,6).map(([x,n])=><b key={x}>{x} · {n}</b>)}</div><div><span>Advertiser activity</span>{analysis.advertisers.slice(0,5).map(([x,n])=><b key={x}>{x} · {n}</b>)}</div></div><div className="researchProductMatches"><div className="researchAnalysisHead"><div><span>CATALOGUE MATCH</span><h3>{sourceAd?`Create from ${sourceAd.payload?.advertiser||sourceAd.title}`:"Pick a product for the selected market pattern"}</h3></div><small>Gemini analysis → 5 directions → Modal · 4 variants each</small></div>{analysis.matched.length?analysis.matched.map(p=><article key={p.product_id}>{p.image_url?<img src={p.image_url} alt=""/>:<div className="researchItemPlaceholder">Y</div>}<div><strong>{p.title}</strong><small>{p.currency||""} {p.price??"—"} · advertability {p.advertability_score??"—"}</small></div><button disabled={createBusy} onClick={()=>void createFromAd(p)}>{createBusy?"Working…":"Generate 20"}</button></article>):<div className="researchEmpty">No scored YNOT products available to match yet.</div>}</div>{createProgress&&<div className="creativeJobProgress"><i/><span>{createProgress}</span></div>}{creativePlan&&<div className="creativePlan"><div><span>GEMINI ADAPTATION</span><strong>{creativePlan.adaptation?.adapted_angle||"Original YNOT adaptation"}</strong><p>{creativePlan.adaptation?.reason_for_match}</p></div><div className="creativeDirectionPills">{(creativePlan.directions||[]).map((d:any)=><b key={d.direction_id}>{d.name}</b>)}</div></div>}{createResults.length>0&&<div className="generatedVariantGrid">{[...createResults].sort((a,b)=>Number(b.score?.overall||0)-Number(a.score?.overall||0)).map((v:any,i)=><article key={`${v.directionId}-${v.variantIndex}-${i}`}><img src={v.url} alt="Generated YNOT ad variant"/><div><strong>{v.direction?.name||v.directionId}</strong><span>Variant {v.variantIndex}{v.score?.overall!=null?` · ${Math.round(Number(v.score.overall))}/100`:""}</span>{v.score?.summary&&<small>{v.score.summary}</small>}</div></article>)}</div>}<div className="researchCreativeFlow"><span>Generation pipeline</span><p>Source ad → Gemini extracts hook, problem, promise, offer, visual language and CTA → Gemini rewrites the concept around our real product → five original directions → Modal GPU creates four variants per direction → Gemini visually scores the results → best assets go into this folder and the human review queue.</p><Link href="/admin/growth/content">Open Content Studio →</Link></div></section>}
   <div className="researchItemGrid">{(selected.ynot_growth_research_items||[]).map(item=><article key={item.id} className={sourceAd?.id===item.id?"sourceAdSelected":""}>{item.image_url?<img src={item.image_url} alt=""/>:<div className="researchItemPlaceholder">Y</div>}<div><span>{item.source||item.kind}</span><h3>{item.title}</h3>{item.summary&&<p>{item.summary}</p>}<footer>{item.score!=null&&<b>Score {Math.round(Number(item.score))}</b>}{item.kind==="ad"?<button className="createFromAd" onClick={()=>{setSourceAd(item);setShowAnalysis(true)}}>{sourceAd?.id===item.id?"Source selected":"Create from this ad"}</button>:item.url?<a href={item.url} target="_blank" rel="noreferrer">Source ↗</a>:<em>{item.kind}</em>}</footer></div></article>)}</div></section></div>}
 </section>
}
