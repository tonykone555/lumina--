"use client";

import {useEffect,useState} from "react";
import {Compass,Minus,X} from "lucide-react";
import CompassAIInputs from "./CompassAIInputs";
import {SHOP_TAXONOMY,type ShopCategory,type WorldRoot} from "./shopTaxonomy";

function setInput(input:HTMLInputElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}))}
function resetToWorlds(){[...document.querySelectorAll<HTMLButtonElement>(".lv4-rail button")].find(button=>button.textContent?.toLowerCase().includes("discover"))?.click()}
function clickCategory(key:WorldRoot){const button=document.querySelector<HTMLButtonElement>(`.lv4-category-bubble.cat-${key}`);if(button){button.click();return true}return false}
function openCategory(key:WorldRoot,after?:()=>void){document.querySelector<HTMLElement>(".lv4-shell")?.classList.remove("ynot-far-overview");resetToWorlds();let tries=0;const step=()=>{tries++;if(clickCategory(key)){setTimeout(()=>after?.(),90);return}if(tries<16)setTimeout(step,35)};setTimeout(step,20)}
function directSearch(group:ShopCategory,label?:string){openCategory(group.root,()=>{const tags=label?[label]:[];window.dispatchEvent(new CustomEvent("shop:tags-changed",{detail:{tags,root:group.root,path:tags}}));const input=document.querySelector<HTMLInputElement>(".lv4-search input");if(!input)return;setInput(input,[group.query,label].filter(Boolean).join(" "));requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(".lv4-search button")?.click())})}

export default function WorldCompass():React.ReactElement{
 const[open,setOpen]=useState(false),[far,setFar]=useState(false),[worldActive,setWorldActive]=useState(false);
 useEffect(()=>{const shell=document.querySelector<HTMLElement>(".lv4-shell");if(!shell)return;shell.classList.toggle("ynot-far-overview",far);return()=>shell.classList.remove("ynot-far-overview")},[far]);
 useEffect(()=>{document.body.classList.toggle("ynot-compass-open",open);return()=>document.body.classList.remove("ynot-compass-open")},[open]);
 useEffect(()=>{const close=()=>{setOpen(false);setFar(false)};window.addEventListener("ynot:world-focus",close);return()=>window.removeEventListener("ynot:world-focus",close)},[]);
 useEffect(()=>{const activate=()=>setWorldActive(true),reset=()=>{setWorldActive(false);setOpen(false);setFar(false)};window.addEventListener("ynot:world-active",activate);window.addEventListener("ynot:world-reset",reset);return()=>{window.removeEventListener("ynot:world-active",activate);window.removeEventListener("ynot:world-reset",reset)}},[]);
 function closeCompass(){setOpen(false);setFar(false)}
 function chooseWorld(group:ShopCategory){setOpen(false);setFar(false);directSearch(group)}
 function chooseSub(group:ShopCategory,label:string){setOpen(false);setFar(false);directSearch(group,label)}
 function toggleFar(){setOpen(false);setFar(value=>{const next=!value;window.dispatchEvent(new CustomEvent("ynot:set-world-overview",{detail:{far:next}}));return next})}
 return <>{worldActive&&<div className="ynot-compass-tools" aria-label="World navigation"><button className={`ynot-far-button ${far?"active":""}`} onClick={toggleFar}><Minus/><span>{far?"Near":"Far"}</span></button><button className={`ynot-compass-button ${open?"active":""}`} onClick={()=>setOpen(v=>!v)}><Compass/><span>Map</span></button></div>}{worldActive&&open&&<div className="ynot-compass-backdrop" onClick={closeCompass}><section className="ynot-compass-map ynot-compass-map-expanded" onClick={e=>e.stopPropagation()}><header><div><small>WORLD COMPASS</small><h2>Explore every category</h2><p>Shop across Shopify and Etsy through categories, subcategories and deeper niches.</p></div><button className="ynot-compass-close" aria-label="Close compass" onPointerDown={e=>{e.preventDefault();e.stopPropagation();closeCompass()}} onTouchStart={e=>{e.preventDefault();e.stopPropagation();closeCompass()}} onClick={e=>{e.preventDefault();e.stopPropagation();closeCompass()}}><X/></button></header><div className="ynot-compass-grid ynot-compass-grid-expanded">{SHOP_TAXONOMY.map((group,index)=><article key={group.id} className={`ynot-map-world map-${group.root}`} style={{"--world-i":index} as React.CSSProperties}><button className="ynot-map-world-main" onClick={()=>chooseWorld(group)}><span className="ynot-map-node"/><b>{group.label}</b><small>Open category</small></button><div className="ynot-map-branches">{group.sub.map(label=><button key={label} onClick={()=>chooseSub(group,label)}>{label}</button>)}</div></article>)}</div><CompassAIInputs/></section></div>}</>}
