"use client";

import {FormEvent,useState} from "react";
import {ChevronDown,Search} from "lucide-react";
import LuminaWorld from "./LuminaWorld";
import YnotDrawer from "./YnotDrawer";
import YnotIntentBridge from "./YnotIntentBridge";
import SubcategoryNavigator from "./SubcategoryNavigator";
import SavedNotebook from "./SavedNotebook";
import DiscoveryUniverse from "./DiscoveryUniverse";

type Mode="shop"|"discover";
type Source="Shopify"|"Amazon"|"eBay";

function setReactInput(input:HTMLInputElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}))}

export default function AppShell(){
 const [mode,setMode]=useState<Mode>("shop");
 const [source,setSource]=useState<Source>("Shopify");
 const [sourceOpen,setSourceOpen]=useState(false);
 const [bottomQuery,setBottomQuery]=useState("");
 function openYnot(){document.querySelector<HTMLButtonElement>(".ynot-peek")?.click()}
 function switchSource(next:Source){
  setSource(next);setSourceOpen(false);
  if(next==="eBay"){
   const ebay=document.querySelector<HTMLButtonElement>(".lv4-market-toggle button.ebay");ebay?.click();return;
  }
  const worldButtons=[...document.querySelectorAll<HTMLButtonElement>(".lv4-market-toggle button")];
  const world=worldButtons.find(button=>!button.classList.contains("ebay"));if(world&&!world.classList.contains("active"))world.click();
  const trigger=document.querySelector<HTMLButtonElement>(".lv4-source-trigger");trigger?.click();
  requestAnimationFrame(()=>{
   const choices=[...document.querySelectorAll<HTMLButtonElement>(".lv4-source-menu button,.lv4-source-popover button,.lv4-source-options button")];
   choices.find(button=>button.textContent?.toLowerCase().includes(next.toLowerCase()))?.click();
  });
 }
 function submitBottomSearch(e:FormEvent){
  e.preventDefault();const clean=bottomQuery.trim();if(clean.length<2)return;
  if(mode==="discover"){window.dispatchEvent(new CustomEvent("discover:search",{detail:clean}));return}
  const input=document.querySelector<HTMLInputElement>(".lv4-search input");if(!input)return;setReactInput(input,clean);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(".lv4-search button")?.click());
 }
 return <>
  <nav className="ynot-top-mode" aria-label="Main experience">
   <button className={mode==="shop"?"active":""} onClick={()=>setMode("shop")}>SHOP</button>
   <button className={mode==="discover"?"active":""} onClick={()=>setMode("discover")}>DISCOVER</button>
  </nav>
  {mode==="shop"&&<div className="ynot-world-controls">
   <div className="ynot-world-row"><button className="active">WORLD</button><button onClick={openYnot}>YNOT</button></div>
   <div className="ynot-view-source"><small>VIEW</small><button onClick={()=>setSourceOpen(v=>!v)}>{source}<ChevronDown/></button>{sourceOpen&&<div className="ynot-source-list">{(["Shopify","Amazon","eBay"] as Source[]).map(option=><button key={option} className={source===option?"active":""} onClick={()=>switchSource(option)}>{option}</button>)}</div>}</div>
  </div>}
  {mode==="discover"?<DiscoveryUniverse/>:<><LuminaWorld/><SubcategoryNavigator/></>}
  <form className={`ynot-bottom-search ${mode}`} onSubmit={submitBottomSearch}><Search/><input value={bottomQuery} onChange={e=>setBottomQuery(e.target.value)} placeholder={mode==="discover"?"Search Instagram niches, brands or styles":"Search products, brands or categories"}/><button aria-label="Search">Search</button></form>
  <YnotDrawer/>
  <YnotIntentBridge/>
  <SavedNotebook/>
 </>;
}
