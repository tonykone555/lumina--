"use client";

import {useEffect,useState} from "react";
import {Minus,X} from "lucide-react";

type WorldKey="fashion"|"fitness"|"skin"|"hair"|"home"|"tech"|"retail";
type WorldGroup={key:WorldKey;label:string;sub:string[]};
type CurrentMap={root:WorldKey;path:string[];suggestions:string[];selectedTags:string[]};

const GROUPS:WorldGroup[]=[
 {key:"fashion",label:"Fashion",sub:["Dresses","Tops","Bottoms","Shoes","Bags","Accessories","Activewear","Outerwear"]},
 {key:"fitness",label:"Fitness",sub:["Activewear","Strength","Running","Recovery","Gym Accessories","Training Shoes","Yoga","Mobility"]},
 {key:"skin",label:"Beauty",sub:["Skincare","Serums","Moisturizers","Cleansers","SPF","Sensitive Skin","Tools","Body Care"]},
 {key:"hair",label:"Hair",sub:["Shampoo","Conditioner","Repair","Scalp Care","Styling","Hair Tools","Volume","Curl Care"]},
 {key:"home",label:"Home",sub:["Furniture","Lighting","Decor","Storage","Kitchen","Bedding","Smart Home","Bathroom"]},
 {key:"tech",label:"Tech",sub:["Phones","Audio","Wearables","Gaming","Smart Home","Desk Setup","Accessories","Portable Tech"]},
 {key:"retail",label:"Discover",sub:["Trending","Best Value","New Arrivals","Popular","Premium","Under €50","Hidden Gems","Editor Picks"]}
];

function setInput(input:HTMLInputElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}))}
function resetToWorlds(){const discover=[...document.querySelectorAll<HTMLButtonElement>(".lv4-rail button")].find(button=>button.textContent?.toLowerCase().includes("discover"));discover?.click()}
function clickCategory(key:WorldKey){const button=document.querySelector<HTMLButtonElement>(`.lv4-category-bubble.cat-${key}`);if(button){button.click();return true}return false}
function openCategory(key:WorldKey,after?:()=>void){document.querySelector<HTMLElement>(".lv4-shell")?.classList.remove("ynot-far-overview");resetToWorlds();let tries=0;const step=()=>{tries+=1;if(clickCategory(key)){window.setTimeout(()=>after?.(),90);return}if(tries<16)window.setTimeout(step,35)};window.setTimeout(step,20)}
function directSearch(group:WorldGroup,label:string){openCategory(group.key,()=>{window.dispatchEvent(new CustomEvent("shop:tags-changed",{detail:{tags:[label],root:group.key,path:[label]}}));const input=document.querySelector<HTMLInputElement>(".lv4-search input");if(!input)return;setInput(input,`${group.label} ${label}`);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(".lv4-search button")?.click())})}

export default function WorldCompass():React.ReactElement{
 const [open,setOpen]=useState(false),[far,setFar]=useState(false);const [current,setCurrent]=useState<CurrentMap>({root:"retail",path:[],suggestions:GROUPS.find(g=>g.key==="retail")!.sub,selectedTags:[]});
 useEffect(()=>{const shell=document.querySelector<HTMLElement>(".lv4-shell");if(!shell)return;shell.classList.toggle("ynot-far-overview",far);return()=>shell.classList.remove("ynot-far-overview")},[far]);
 useEffect(()=>{const close=()=>{setOpen(false);setFar(false)};window.addEventListener("ynot:world-focus",close);return()=>window.removeEventListener("ynot:world-focus",close)},[]);
 useEffect(()=>{const update=(event:Event)=>{const detail=(event as CustomEvent<CurrentMap>).detail;if(detail?.root&&Array.isArray(detail.suggestions))setCurrent(detail)};window.addEventListener("ynot:subcategories-changed",update as EventListener);return()=>window.removeEventListener("ynot:subcategories-changed",update as EventListener)},[]);
 function chooseWorld(group:WorldGroup){setOpen(false);setFar(false);openCategory(group.key)}
 function chooseSub(group:WorldGroup,label:string){setOpen(false);setFar(false);directSearch(group,label)}
 function toggleFar(){setOpen(false);setFar(v=>!v)}
 return <>
  <div className="ynot-compass-tools" aria-label="World navigation">
   <button className={`ynot-far-button ${far?"active":""}`} onClick={toggleFar} aria-label={far?"Return to normal world view":"Zoom out to world overview"}><Minus/><span>{far?"Near":"Far"}</span></button>
   <button className={`ynot-minimap-dot ${open?"active":""}`} onClick={()=>setOpen(v=>!v)} aria-label={open?"Close mini map":"Open mini map"} aria-expanded={open}><span/></button>
  </div>
  {open&&<div className="ynot-compass-backdrop" onClick={()=>setOpen(false)}>
   <section className="ynot-compass-map" onClick={e=>e.stopPropagation()}>
    <header><div><small>WORLD COMPASS</small><h2>Jump anywhere.</h2><p>Choose a world or go straight into a subcategory.</p></div><button className="ynot-compass-close" onClick={()=>setOpen(false)} aria-label="Close map"><X/></button></header>
    <section className="ynot-map-current"><div><small>YOU ARE HERE</small><b>{GROUPS.find(group=>group.key===current.root)?.label||"Discover"}{current.path.length?` · ${current.path.join(" · ")}`:""}</b></div><div>{current.suggestions.map(label=><button key={label} className={current.selectedTags.includes(label)?"active":""} onClick={()=>chooseSub(GROUPS.find(group=>group.key===current.root)||GROUPS[6],label)}>{label}</button>)}</div></section>
    <div className="ynot-compass-grid">{GROUPS.map((group,index)=><article key={group.key} className={`ynot-map-world map-${group.key}`} style={{"--world-i":index} as React.CSSProperties}>
     <button className="ynot-map-world-main" onClick={()=>chooseWorld(group)}><span className="ynot-map-node"/><b>{group.label}</b><small>Open world</small></button>
     <div className="ynot-map-branches">{group.sub.map(label=><button key={label} onClick={()=>chooseSub(group,label)}>{label}</button>)}</div>
    </article>)}</div>
   </section>
  </div>}
 </>;
}
