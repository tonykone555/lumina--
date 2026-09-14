"use client";

import {useEffect} from "react";

const STOP=new Set(["the","and","for","with","from","this","that","your","live","product","products","store","shopify","amazon","ebay","ynot","best","value","view","available","option","options"]);
function words(text:string){return String(text||"").toLowerCase().replace(/[^a-z0-9€$£\- ]/g," ").split(/\s+/).filter(w=>w.length>2&&!STOP.has(w))}
function titleTags(root:Element){
 const title=(root.querySelector("h2,h3")?.textContent||"").trim();
 const body=(root.textContent||"").toLowerCase();
 const titleWords=words(title);
 const candidates:string[]=[];
 const existing=[...root.querySelectorAll<HTMLButtonElement>(".lv4-tagrow button")].map(b=>(b.textContent||"").trim()).filter(Boolean);
 candidates.push(...existing);
 const patterns=["minimal","premium","black","white","blue","red","green","beige","brown","pink","silver","gold","leather","cotton","linen","silk","wireless","portable","waterproof","running","activewear","dress","dresses","shoes","bag","bags","jewelry","skincare","hair","home","tech","fitness","accessories","vintage","organic","recycled","lightweight","casual"];
 for(const p of patterns)if(body.includes(p))candidates.push(p.replace(/^./,c=>c.toUpperCase()));
 candidates.push(...titleWords.slice(0,6).map(w=>w.replace(/^./,c=>c.toUpperCase())));
 const seen=new Set<string>();
 return candidates.filter(tag=>{const k=tag.toLowerCase();if(k.length<3||seen.has(k)||STOP.has(k))return false;seen.add(k);return true}).sort((a,b)=>{
  const al=title.toLowerCase().includes(a.toLowerCase())?1:0,bl=title.toLowerCase().includes(b.toLowerCase())?1:0;
  return bl-al||a.length-b.length;
 }).slice(0,6);
}
function buildRow(root:Element){
 let row=root.querySelector<HTMLElement>(".lv4-tagrow,.ynot-card-tags");
 if(!row){row=document.createElement("div");row.className="lv4-tagrow ynot-card-tags";const action=root.querySelector(".ynot-story-action,.lv4-direction-row");if(action?.parentElement)action.parentElement.insertBefore(row,action);else root.appendChild(row)}
 const tags=titleTags(root);if(!tags.length)return;
 row.innerHTML="";
 for(const tag of tags){const b=document.createElement("button");b.type="button";b.textContent=tag;b.addEventListener("click",()=>window.dispatchEvent(new CustomEvent("shop:quick-tag",{detail:tag})));row.appendChild(b)}
}
function sync(){document.querySelectorAll(".lv4-detailcopy,.ynot-story-copy,.ynot-selected-copy").forEach(buildRow)}

export default function ProductCardEnhancer(){
 useEffect(()=>{sync();const observer=new MutationObserver(sync);observer.observe(document.body,{subtree:true,childList:true});return()=>observer.disconnect()},[]);
 return null;
}
