"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import {Bell,ChevronDown,Compass,Minus,Search,UserRound} from "lucide-react";
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
import WorldCompass from "./WorldCompass";
import WorldSaveBridge from "./WorldSaveBridge";
import CircleDrawer from "./CircleDrawer";
import ProfilePanel from "./ProfilePanel";
import CheckoutStatus from "./CheckoutStatus";
import DesktopLatticeController from "./DesktopLatticeController";

type Mode="shop"|"discover";
type Source="Shopify"|"Amazon"|"eBay";
type HeaderProfile={name?:string;avatar?:string;hasPin?:boolean}|null;
const PROFILE_KEY="ynot-local-profile-v1";

function setReactInput(input:HTMLInputElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}))}
function readHeaderProfile():HeaderProfile{try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||"null") as HeaderProfile}catch{return null}}

export default function AppShell(){
 const [mode,setMode]=useState<Mode>("shop");
 const [source,setSource]=useState<Source>("Shopify");
 const [sourceOpen,setSourceOpen]=useState(false);
 const [bottomQuery,setBottomQuery]=useState("");
 const [chromeHidden,setChromeHidden]=useState(false);
 const [selectedTags,setSelectedTags]=useState<string[]>([]);
 const [headerProfile,setHeaderProfile]=useState<HeaderProfile>(null);
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
  const sync=()=>setHeaderProfile(readHeaderProfile());
  const onProfile=(event:Event)=>{
   const detail=(event as CustomEvent<HeaderProfile>).detail;
   if(detail)setHeaderProfile(detail);else sync();
  };
  sync();
  window.addEventListener("ynot:profile-changed",onProfile as EventListener);
  window.addEventListener("storage",sync);
  return()=>{window.removeEventListener("ynot:profile-changed",onProfile as EventListener);window.removeEventListener("storage",sync)};
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
 function goHome(){document.querySelector<HTMLButtonElement>(".lv4-logo")?.click()}
 function toggleFar(){document.querySelector<HTMLButtonElement>(".ynot-far-button")?.click()}
 function toggleCompass(){document.querySelector<HTMLButtonElement>(".ynot-compass-button")?.click()}
 function openProfile(){document.querySelector<HTMLButtonElement>(".ynot-profile-orb")?.click()}
 function openSaved(){window.dispatchEvent(new Event("ynot:open-saves"))}
 function openNotifications(){window.dispatchEvent(new Event("ynot:open-circle"))}
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
 const hasProfile=Boolean(headerProfile?.hasPin||headerProfile?.name||headerProfile?.avatar);
 return <div className={`ynot-app-shell ${chromeHidden?"chrome-hidden":""}`}>
  <header className="ynot-reference-header">
   <div className="ynot-reference-left">
    <button className="ynot-reference-brand" onClick={goHome} aria-label="YNOT home"><b>YNOT</b></button>
   </div>
   <div className="ynot-reference-center">
    <div className="ynot-reference-topline">
     <nav className="ynot-top-mode" aria-label="Main experience">
      <button className={mode==="shop"?"active":""} onClick={()=>setMode("shop")}>SHOP</button>
      <button className={mode==="discover"?"active":""} onClick={()=>setMode("discover")}>DISCOVER</button>
     </nav>
     {mode==="shop"&&<div className="ynot-reference-nav-tools"><button onClick={toggleFar} aria-label="Zoom out"><Minus/></button><button onClick={toggleCompass} aria-label="Open world map"><Compass/></button></div>}
    </div>
    {mode==="shop"&&<div className="ynot-world-controls">
     <div className="ynot-world-row"><button className="active">WORLD</button><button onClick={openYnot}>YNOT</button></div>
     <div className="ynot-view-source"><button className="ynot-source-trigger-clean" onClick={()=>setSourceOpen(v=>!v)}>{source}<ChevronDown/></button>{sourceOpen&&<div className="ynot-source-list">{(["Shopify","Amazon","eBay"] as Source[]).map(option=><button key={option} className={source===option?"active":""} onClick={()=>switchSource(option)}>{option}</button>)}</div>}</div>
    </div>}
   </div>
   <div className="ynot-reference-right">
    <button className="ynot-reference-notify" onClick={openNotifications} aria-label="Notifications"><Bell/><i/></button>
    <button className={`ynot-reference-signin ${hasProfile?"has-profile":""}`} onClick={hasProfile?openSaved:openProfile}>{headerProfile?.avatar?<img src={headerProfile.avatar} alt="Your profile"/>:<UserRound/>}<span>{hasProfile?"Saves":"Sign in"}</span></button>
    <button className="ynot-reference-avatar" onClick={openProfile} aria-label="Open profile">{headerProfile?.avatar?<img src={headerProfile.avatar} alt="Your profile"/>:<UserRound/>}</button>
   </div>
  </header>
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
  <DesktopLatticeController/>
  <CheckoutStatus/>
 </div>;
}
