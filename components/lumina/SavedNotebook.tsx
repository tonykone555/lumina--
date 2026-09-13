"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

type SavedItem={id:string;title:string;brand?:string;price?:number;currency?:string;image:string;images?:string[];url?:string;source?:string;section?:string;sections?:string[];variants?:unknown[];variantId?:string;description?:string;cutout?:string;savedAt?:number};
const STORAGE="ynot-saved-items";

function loadSaved():SavedItem[]{try{const parsed=JSON.parse(localStorage.getItem(STORAGE)||"[]");return Array.isArray(parsed)?parsed:[]}catch{return[]}}
function categoryOf(item:SavedItem){const raw=[item.section,...(item.sections||[])].filter(Boolean).join(" ").toLowerCase();if(/fashion|dress|shoe|bag|jewel|accessor/.test(raw))return"fashion";if(/beauty|hair|skin/.test(raw))return"beauty";if(/fitness|sport|training/.test(raw))return"fitness";if(/home|decor|kitchen/.test(raw))return"home";if(/tech|audio|phone|gadget/.test(raw))return"tech";return"discover"}

export default function SavedNotebook(){
 const [open,setOpen]=useState(false),[items,setItems]=useState<SavedItem[]>([]),[page,setPage]=useState(0);
 const pages=useMemo(()=>{const groups=new Map<string,SavedItem[]>();for(const item of items){const key=categoryOf(item);groups.set(key,[...(groups.get(key)||[]),item])}return [...groups.values()].filter(Boolean)},[items]);
 useEffect(()=>{const refresh=()=>setItems(loadSaved());const openNotebook=()=>{refresh();setPage(0);setOpen(true)};const onClick=(event:MouseEvent)=>{const button=(event.target as HTMLElement)?.closest(".lv4-rail button");if(button?.textContent?.toLowerCase().includes("saved")){event.preventDefault();openNotebook()}};window.addEventListener("ynot:open-saves",openNotebook as EventListener);window.addEventListener("ynot:saves-changed",refresh as EventListener);document.addEventListener("click",onClick,true);return()=>{window.removeEventListener("ynot:open-saves",openNotebook as EventListener);window.removeEventListener("ynot:saves-changed",refresh as EventListener);document.removeEventListener("click",onClick,true)}},[]);
 if(!open)return null;
 const visible=pages.length?pages[Math.min(page,pages.length-1)]:items;
 return <div className="ynot-notebook-shell" role="dialog" aria-modal="true" aria-label="Saved products">
   <div className="ynot-notebook-backdrop" onClick={()=>setOpen(false)}/>
   <section className="ynot-notebook" onTouchEnd={e=>{const x=e.changedTouches[0]?.clientX||0;const start=Number((e.currentTarget as HTMLElement).dataset.touchx||x);const dx=x-start;if(Math.abs(dx)>55&&pages.length>1)setPage(p=>dx<0?Math.min(pages.length-1,p+1):Math.max(0,p-1))}} onTouchStart={e=>{e.currentTarget.dataset.touchx=String(e.touches[0]?.clientX||0)}}>
    <button className="ynot-notebook-close" onClick={()=>setOpen(false)} aria-label="Close saved notebook"><X/></button>
    <div className="ynot-notebook-fold"/>
    <div className="ynot-notebook-grid">
      {(visible||[]).map(item=><button key={item.id} className="ynot-save-orb" aria-label={item.title} onClick={()=>window.dispatchEvent(new CustomEvent("ynot:open-story",{detail:item}))}>
        <span className="ynot-save-orb-gloss"/>
        <img loading="lazy" src={item.cutout||`/api/cutout?src=${encodeURIComponent(item.image)}`} alt="" onError={e=>{(e.currentTarget as HTMLImageElement).src=item.image}}/>
      </button>)}
    </div>
    <div className="ynot-notebook-dots" aria-hidden="true">{pages.map((_,i)=><i key={i} className={i===page?"active":""}/>)}</div>
   </section>
 </div>
}