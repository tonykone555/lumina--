"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {ArrowDown,ArrowLeft,ArrowUpRight,Bookmark,Check,ChevronDown,ChevronUp,Copy,Layers3,Search,Share2,X} from "lucide-react";
import "./StudioFeed.css";

type Product={id:string;title:string;brand:string;price:number;image:string;sourceUrl:string;category:string};
type Category="all"|"lighting"|"chairs"|"furniture";
const tabs:{key:Category;label:string}[]=[{key:"all",label:"All pieces"},{key:"lighting",label:"Lighting"},{key:"chairs",label:"Chairs"},{key:"furniture",label:"Furniture"}];
const describe=(p:Product)=>p.category==="lighting"?"A statement light for atmospheric residential, hospitality and interior design projects.":p.category==="chairs"?"A distinctive seating piece for refined residential and contemporary commercial spaces.":"An expressive furniture piece for curated interiors and spatial compositions.";
const money=(n:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"EUR",maximumFractionDigits:2}).format(n);
const storageKey="ynot-studio-saved-v1";
export default function StudioFeed({products}:{products:Product[]}){
 const [category,setCategory]=useState<Category>("all");
 const [index,setIndex]=useState(0);
 const [saved,setSaved]=useState<string[]>([]);
 const [saveOpen,setSaveOpen]=useState(false);
 const [project,setProject]=useState("My interior project");
 const [toast,setToast]=useState("");
 const [scrubbing,setScrubbing]=useState(false);
 const [showInfo,setShowInfo]=useState(false);
 const zipper=useRef<HTMLDivElement>(null);
 const swipe=useRef<{x:number;y:number;at:number}|null>(null);
 const lastWheel=useRef(0);
 const items=useMemo(()=>category==="all"?products:products.filter(p=>p.category===category),[category,products]);
 const current=items[Math.min(index,Math.max(0,items.length-1))];
 const currentIndex=Math.min(index,Math.max(0,items.length-1));
 const setSafeIndex=useCallback((next:number)=>setIndex(Math.max(0,Math.min(items.length-1,Math.round(next)))),[items.length]);
 useEffect(()=>{try{const value=JSON.parse(localStorage.getItem(storageKey)||"[]");if(Array.isArray(value))setSaved(value.filter(x=>typeof x==="string"))}catch{}},[]);
 useEffect(()=>{setIndex(0)},[category]);
 useEffect(()=>{if(!toast)return;const t=window.setTimeout(()=>setToast(""),2500);return()=>clearTimeout(t)},[toast]);
 useEffect(()=>{if(!current)return;const nearby=items.slice(currentIndex+1,currentIndex+5);for(const p of nearby){const image=new Image();image.src=p.image}},[items,currentIndex,current?.id]);
 const save=()=>{
  if(!current)return;
  const next=saved.includes(current.id)?saved.filter(v=>v!==current.id):[...saved,current.id];
  setSaved(next);try{localStorage.setItem(storageKey,JSON.stringify(next))}catch{}
  setToast(next.includes(current.id)?"Saved to your project":"Removed from project");
 };
 const share=async()=>{if(!current)return;const url=window.location.origin+"/worlds/studio?product="+encodeURIComponent(current.id);try{if(navigator.share)await navigator.share({title:current.title,url});else{await navigator.clipboard.writeText(url);setToast("Link copied")}}catch{}};
 useEffect(()=>{const params=new URLSearchParams(window.location.search);const selected=params.get("product");if(selected){const idx=items.findIndex(p=>p.id===selected);if(idx>=0)setIndex(idx)}},[items]);
 const selectFromPoint=(clientY:number)=>{const el=zipper.current;if(!el)return;const b=el.getBoundingClientRect();const percent=Math.min(1,Math.max(0,(clientY-b.top)/b.height));setSafeIndex(percent*(items.length-1))};
 const onZipperDown=(e:React.PointerEvent<HTMLDivElement>)=>{e.preventDefault();e.stopPropagation();setScrubbing(true);e.currentTarget.setPointerCapture(e.pointerId);selectFromPoint(e.clientY)};
 const onZipperMove=(e:React.PointerEvent<HTMLDivElement>)=>{if(scrubbing)selectFromPoint(e.clientY)};
 const onZipperUp=(e:React.PointerEvent<HTMLDivElement>)=>{setScrubbing(false);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)};
 const onStageDown=(e:React.PointerEvent<HTMLElement>)=>{if((e.target as HTMLElement).closest("button,a,input,.studio-zip,.studio-filters,.studio-project-panel"))return;swipe.current={x:e.clientX,y:e.clientY,at:Date.now()}};
 const onStageUp=(e:React.PointerEvent<HTMLElement>)=>{const start=swipe.current;swipe.current=null;if(!start)return;const dy=e.clientY-start.y;const dx=e.clientX-start.x;if(Math.abs(dy)>52&&Math.abs(dy)>Math.abs(dx))setSafeIndex(currentIndex+(dy<0?1:-1))};
 const onWheel=(e:React.WheelEvent<HTMLElement>)=>{if((e.target as HTMLElement).closest(".studio-project-panel,.studio-zip"))return;if(Math.abs(e.deltaY)<12)return;const now=Date.now();if(now-lastWheel.current<360)return;lastWheel.current=now;setSafeIndex(currentIndex+(e.deltaY>0?1:-1))};
 const copyProject=async()=>{const chosen=products.filter(p=>saved.includes(p.id));const list=chosen.map(p=>p.title+" — "+money(p.price)+" (indicative) — "+p.sourceUrl).join("\n");try{await navigator.clipboard.writeText(project+"\n\n"+list);setToast("Project list copied")}catch{setToast("Copy unavailable")}};
 if(!current)return <main className="studio-empty"><Link href="/worlds">Back to Worlds</Link><p>No catalogue pieces available.</p></main>;
 const progress=items.length>1?currentIndex/(items.length-1):0;
 return <main className="studio-stage" tabIndex={0} aria-label="YNOT Studio vertical interiors product feed" onPointerDown={onStageDown} onPointerUp={onStageUp} onWheel={onWheel} onKeyDown={e=>{if(e.key==="ArrowDown"){e.preventDefault();setSafeIndex(currentIndex+1)}if(e.key==="ArrowUp"){e.preventDefault();setSafeIndex(currentIndex-1)}if(e.key==="Escape")setSaveOpen(false)}}>
  <div className="studio-backdrop" key={"bg-"+current.id} style={{backgroundImage:`url("${current.image.replaceAll('"',"%22")}")`}} aria-hidden="true"/>
  <div className="studio-hero" key={current.id}><img src={current.image} alt={current.title} fetchPriority="high"/></div>
  <div className="studio-vignette" aria-hidden="true"/>
  <header className="studio-topbar">
   <Link href="/worlds" className="studio-back" aria-label="Back to YNOT Worlds"><ArrowLeft size={18}/></Link>
   <div className="studio-wordmark"><b>YNOT</b> <span>/ STUDIO</span><small>THE INTERIORS EDIT</small></div>
   <button className="studio-project-trigger" type="button" onClick={()=>setSaveOpen(true)}><Layers3 size={17}/><span>My project</span>{saved.length>0&&<i>{saved.length}</i>}</button>
  </header>
  <nav className="studio-filters" aria-label="Filter Studio collections">
   {tabs.map(tab=><button key={tab.key} onClick={()=>setCategory(tab.key)} className={category===tab.key?"selected":""} aria-pressed={category===tab.key}>{tab.label}</button>)}
  </nav>
  <div className="studio-counter" aria-live="off"><span>{String(currentIndex+1).padStart(3,"0")}</span><em> / {String(items.length).padStart(3,"0")}</em></div>
  <div className="studio-zip-wrap">
   <span className="studio-zip-label">ZIP THROUGH</span>
   <div className={`studio-zip ${scrubbing?"active":""}`} ref={zipper} role="slider" aria-label="Zipper: scrub through products" aria-valuemin={1} aria-valuemax={items.length} aria-valuenow={currentIndex+1} tabIndex={0} onPointerDown={onZipperDown} onPointerMove={onZipperMove} onPointerUp={onZipperUp} onPointerCancel={onZipperUp} onKeyDown={e=>{if(e.key==="ArrowDown"||e.key==="ArrowRight"){e.preventDefault();setSafeIndex(currentIndex+1)}else if(e.key==="ArrowUp"||e.key==="ArrowLeft"){e.preventDefault();setSafeIndex(currentIndex-1)}else if(e.key==="Home"){e.preventDefault();setSafeIndex(0)}else if(e.key==="End"){e.preventDefault();setSafeIndex(items.length-1)}}}>
    <span className="studio-zip-track"/><span className="studio-zip-fill" style={{height:`${progress*100}%`}}/>
    {Array.from({length:31},(_,i)=><span key={i} className="studio-zip-notch" style={{top:`${i/30*100}%`}}/>)}
    <span className="studio-zip-handle" style={{top:`${progress*100}%`}}><i/><span className="studio-zip-bubble">{currentIndex+1}</span></span>
   </div>
   <button aria-label="Next product" className="studio-next-arrow" onClick={()=>setSafeIndex(currentIndex+1)}><ChevronDown size={21}/></button>
  </div>
  <div className="studio-bottom">
   <div className="studio-kind"><span>YNOT CURATED / {current.category.toUpperCase()}</span><span className="studio-kind-line"/></div>
   <div className="studio-text">
    <p className="studio-brand">{current.brand||"Independent designer"}</p>
    <h1>{current.title}</h1>
    <p className="studio-description">{describe(current)}</p>
    <div className="studio-price">{money(current.price)} <span>Indicative YNOT catalogue price · delivery and availability to confirm</span></div>
   </div>
   <div className="studio-actions">
    <button className={saved.includes(current.id)?"is-saved":""} onClick={save}><Bookmark size={19} fill={saved.includes(current.id)?"currentColor":"none"}/><span>{saved.includes(current.id)?"Saved":"Save to project"}</span></button>
    <a href={current.sourceUrl} target="_blank" rel="noopener noreferrer"><ArrowUpRight size={19}/><span>Product details</span></a>
    <button onClick={share} aria-label="Share current product"><Share2 size={18}/><span>Share</span></button>
   </div>
   <div className="studio-hint"><span>SWIPE UP TO DISCOVER</span><ChevronUp size={15}/></div>
  </div>
  {toast&&<div className="studio-toast" role="status"><Check size={16}/>{toast}</div>}
  {saveOpen&&<div className="studio-panel-backdrop" onClick={()=>setSaveOpen(false)}><aside className="studio-project-panel" role="dialog" aria-label="My interior project" aria-modal="true" onClick={e=>e.stopPropagation()}>
   <header><div><small>YNOT STUDIO</small><h2>My project</h2></div><button aria-label="Close projects" onClick={()=>setSaveOpen(false)}><X size={22}/></button></header>
   <label htmlFor="studio-project-name">Project name</label><input id="studio-project-name" value={project} onChange={e=>setProject(e.target.value.slice(0,80))} placeholder="e.g. Hotel Lobby"/>
   <p className="studio-project-summary">{saved.length} saved piece{saved.length===1?"":"s"} · indicative product prices</p>
   <div className="studio-project-list">{products.filter(p=>saved.includes(p.id)).map(p=><div key={p.id} className="studio-project-item"><img src={p.image} alt=""/><span><b>{p.title}</b><small>{money(p.price)}</small></span><button type="button" aria-label={"Remove "+p.title} onClick={()=>{const next=saved.filter(id=>id!==p.id);setSaved(next);localStorage.setItem(storageKey,JSON.stringify(next))}}><X size={16}/></button></div>)}{!saved.length&&<p className="studio-project-empty">Save pieces as you browse. They'll appear here for your next design presentation.</p>}</div>
   <button className="studio-export" disabled={!saved.length} onClick={copyProject}><Copy size={17}/> Copy project product list</button>
  </aside></div>}
 </main>
}
