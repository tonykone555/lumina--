"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type SavedItem={id:string;title:string;brand?:string;price?:number;currency?:string;image:string;images?:string[];url?:string;source?:string;section?:string;sections?:string[];variants?:unknown[];variantId?:string;description?:string;cutout?:string;savedAt?:number};
const STORAGE="ynot-saved-items";

function loadSaved():SavedItem[]{try{const parsed=JSON.parse(localStorage.getItem(STORAGE)||"[]");return Array.isArray(parsed)?parsed:[]}catch{return[]}}
export default function SavedNotebook(){
 const [open,setOpen]=useState(false),[items,setItems]=useState<SavedItem[]>([]);
 useEffect(()=>{const refresh=()=>setItems(loadSaved());const openNotebook=()=>{refresh();setOpen(true)};const onClick=(event:MouseEvent)=>{const button=(event.target as HTMLElement)?.closest(".lv4-rail button");if(button?.textContent?.toLowerCase().includes("saved")){event.preventDefault();openNotebook()}};window.addEventListener("ynot:open-saves",openNotebook as EventListener);window.addEventListener("ynot:saves-changed",refresh as EventListener);document.addEventListener("click",onClick,true);return()=>{window.removeEventListener("ynot:open-saves",openNotebook as EventListener);window.removeEventListener("ynot:saves-changed",refresh as EventListener);document.removeEventListener("click",onClick,true)}},[]);
 if(!open)return null;
 return <div className="ynot-notebook-shell" role="dialog" aria-modal="true" aria-label="Saved products">
   <div className="ynot-notebook-backdrop" onClick={()=>setOpen(false)}/>
   <section className="ynot-notebook">
    <button className="ynot-notebook-close" onClick={()=>setOpen(false)} aria-label="Close saved notebook"><X/></button>
    <header className="ynot-notebook-head"><small>YNOT LIBRARY</small><h2>Saved</h2><span>{items.length} product{items.length===1?"":"s"}</span></header>
    <div className="ynot-notebook-grid">
      {items.map(item=><button key={item.id} className="ynot-save-orb" aria-label={item.title} title={item.title} onClick={()=>window.dispatchEvent(new CustomEvent("ynot:open-story",{detail:item}))}>
        <span className="ynot-save-orb-gloss"/>
        <img loading="lazy" src={item.image} alt=""/>
      </button>)}
      {!items.length&&<p className="ynot-notebook-empty">Tap the heart on any product to build your saved world.</p>}
    </div>
   </section>
 </div>
}
