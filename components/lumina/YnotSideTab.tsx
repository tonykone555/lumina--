"use client";

import {useEffect,useState} from "react";
import {Heart,ShoppingBag,Sparkles} from "lucide-react";

function readCount(key:string){try{const value=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(value)?value.length:0}catch{return 0}}

export default function YnotSideTab(){
 const [saved,setSaved]=useState(0),[bag,setBag]=useState(0);
 useEffect(()=>{const sync=()=>{setSaved(readCount("ynot-saved-items"));setBag(readCount("ynot-cart"))};sync();window.addEventListener("ynot:saves-changed",sync);window.addEventListener("storage",sync);const timer=window.setInterval(sync,1200);return()=>{window.removeEventListener("ynot:saves-changed",sync);window.removeEventListener("storage",sync);window.clearInterval(timer)}},[]);
 function openYnot(){document.querySelector<HTMLButtonElement>(".ynot-peek")?.click()}
 function openSaved(){window.dispatchEvent(new Event("ynot:open-saves"))}
 function openBag(){openYnot();window.setTimeout(()=>document.querySelector<HTMLButtonElement>(".ynot-cart-trigger")?.click(),80)}
 return <nav className="ynot-side-tab" aria-label="YNOT quick navigation">
  <button onClick={openYnot}><Sparkles/><span>Explore</span></button>
  <button onClick={openSaved}><Heart/><span>Saved</span>{saved>0&&<b>{saved}</b>}</button>
  <button onClick={openBag}><ShoppingBag/><span>Bag</span>{bag>0&&<b>{bag}</b>}</button>
 </nav>
}
