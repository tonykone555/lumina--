"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import {ChevronDown,Search} from "lucide-react";
import LuminaWorld from "./LuminaWorld";
import YnotDrawer from "./YnotDrawer";
import YnotIntentBridge from "./YnotIntentBridge";
import SubcategoryNavigator from "./SubcategoryNavigator";
import SavedNotebook from "./SavedNotebook";
import DiscoveryUniverse from "./DiscoveryUniverse";
import ProductCardEnhancer from "./ProductCardEnhancer";
import ProductDetailHydrator from "./ProductDetailHydrator";
import ProductReferenceEnhancer from "./ProductReferenceEnhancer";
import ProductCardSync from "./ProductCardSync";
import WorldVisualPolish from "./WorldVisualPolish";
import WorldBubbleSpacing from "./WorldBubbleSpacing";
import WorldCompass from "./WorldCompass";
import WorldSaveBridge from "./WorldSaveBridge";
import CircleDrawer from "./CircleDrawer";
import ProfilePanel from "./ProfilePanel";
import CheckoutStatus from "./CheckoutStatus";

type Mode="shop"|"discover";
type Source="Shopify"|"Amazon"|"eBay";

function setReactInput(input:HTMLInputElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}))}

export default function AppShell(){
 const [mode,setMode]=useState<Mode>("shop");
 const [source,setSource]=useState<Source>("Shopify");
 const [sourceOpen,setSourceOpen]=useState(false);
 const [bottomQuery,setBottomQuery]=useState("");
 const [chromeHidden,setChromeHidden]=useState(false);
 const [selectedTags,setSelectedTags]=useState<string[]>([]);
 const effectiveQuery=useMemo(()=>[bottomQuery.trim(),...selectedTags].filter(Boolean).join(" ").replace(/\s+/g," ").trim(),[bottomQuery,selectedTags]);

 useEffect(()=>{
  const selector=[".lv4-detail",".lv4-detail-backdrop",".ynot-selected",".ynot-story",".ynot-cart",".ynot-drawer.open",".discover-profile-backdrop",".ynot-notebook-shell"].join(",");
  const sync=()=>setChromeHidden(Boolean(document.querySelector(selector)));
  sync();
  const observer=new MutationObserver(sync);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
  return()=>observer.disconnect();
 },[]);

 useEffect(()=>{
  const onTags=(event:Event)=>{
   const detail=(event as CustomEvent<{tags?:string[]}>).detail;
   const tags=Array.isArray(detail?.tags)?detail.tags:[];
   setSelectedTags(tags);
   if(mode==="shop")setBottomQuery(tags.join(" "));
  };
  window.addEventListener("shop:tags-changed",onTags as EventListener);
  return()=>window.removeEventListener("shop:tags-changed",onTags as EventListener);
 },[mode]);

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
  e.preventDefault();
  if(mode==="discover"){
   const clean=bottomQuery.trim();if(clean.length<2)return;
   window.dispatchEvent(new CustomEvent("discover:search",{detail:clean}));return;
  }
  const clean=effectiveQuery;if(clean.length<2)return;
  const input=document.querySelector<HTMLInputElement>(".lv4-search input");if(!input)return;
  setReactInput(input,clean);
  window.dispatchEvent(new CustomEvent("shop:tag-search",{detail:{query:clean,tags:selectedTags}}));
  requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(".lv4-search button")?.click());
 }
 return <div className={`ynot-app-shell ${chromeHidden?"chrome-hidden":""}`}>
  <nav className="ynot-top-mode" aria-label="Main experience">
   <button className={mode==="shop"?"active":""} onClick={()=>setMode("shop")}>SHOP</button>
   <button className={mode==="discover"?"active":""} onClick={()=>setMode("discover")}>DISCOVER</button>
  </nav>
  {mode==="shop"&&<div className="ynot-world-controls">
   <div className="ynot-world-row"><button className="active">WORLD</button><button onClick={openYnot}>YNOT</button></div>
   <div className="ynot-view-source"><button className="ynot-source-trigger-clean" onClick={()=>setSourceOpen(v=>!v)}>{source}<ChevronDown/></button>{sourceOpen&&<div className="ynot-source-list">{(["Shopify","Amazon","eBay"] as Source[]).map(option=><button key={option} className={source===option?"active":""} onClick={()=>switchSource(option)}>{option}</button>)}</div>}</div>
  </div>}
  {mode==="discover"?<DiscoveryUniverse/>:<><LuminaWorld/><SubcategoryNavigator/><WorldCompass/></>}
  <form className={`ynot-bottom-search ${mode}`} onSubmit={submitBottomSearch}><Search/><input value={bottomQuery} onChange={e=>setBottomQuery(e.target.value)} placeholder={mode==="discover"?"Search Instagram niches, brands or styles":"Search products, brands or categories"}/><button aria-label="Search">Search</button></form>
  <YnotDrawer/>
  <YnotIntentBridge/>
  <SavedNotebook/>
  <ProductCardEnhancer/>
  <ProductDetailHydrator/>
  <ProductReferenceEnhancer/>
  <ProductCardSync/>
  <WorldSaveBridge/>
  <CircleDrawer/>
  <ProfilePanel/>
  <WorldVisualPolish/>
  <WorldBubbleSpacing/>
  <CheckoutStatus/>
 </div>;
}
