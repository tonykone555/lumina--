"use client";
import {FormEvent,useEffect,useMemo,useRef,useState} from "react";
import dynamic from "next/dynamic";
import {Bell,ChevronDown,Compass,Link2,Search,Sparkles,UserRound} from "lucide-react";
import LuminaWorld from "./LuminaWorld";
import WorldVisualPolish from "./WorldVisualPolish";
import WorldCompass from "./WorldCompass";
import CircleDrawer from "./CircleDrawer";
import ProfilePanel from "./ProfilePanel";
import DesktopLatticeController from "./DesktopLatticeController";
import DesktopGlassSideControls from "./DesktopGlassSideControls";
import MobileProductSwipeController from "./MobileProductSwipeController";
import AuthGate from "./AuthGate";
import EntryAmbientBubbles from "./EntryAmbientBubbles";
import TaxonomyRailClean from "./TaxonomyRailClean";
import ShopIntentPlannerBridge from "./ShopIntentPlannerBridge";
import {authedFetch,readSession} from "../../lib/ynot/supabase-browser";

const EtsyCatalogBridge=dynamic(()=>import("./EtsyCatalogBridge"),{ssr:false});
const YnotDrawer=dynamic(()=>import("./YnotDrawer"),{ssr:false});
const UnifiedBag=dynamic(()=>import("./UnifiedBag"),{ssr:false});
const YnotBuyPolish=dynamic(()=>import("./YnotBuyPolish"),{ssr:false});
const YnotCloseStability=dynamic(()=>import("./YnotCloseStability"),{ssr:false});
const YnotIntentBridge=dynamic(()=>import("./YnotIntentBridge"),{ssr:false});
const SavedNotebook=dynamic(()=>import("./SavedNotebook"),{ssr:false});
const SavesBookToast=dynamic(()=>import("./SavesBookToast"),{ssr:false});
const DiscoveryUniverse=dynamic(()=>import("./DiscoveryUniverse"),{ssr:false});
const ProductCardEnhancer=dynamic(()=>import("./ProductCardEnhancer"),{ssr:false});
const ProductDetailHydrator=dynamic(()=>import("./ProductDetailHydrator"),{ssr:false});
const ProductReferenceEnhancer=dynamic(()=>import("./ProductReferenceEnhancer"),{ssr:false});
const ProductCardSync=dynamic(()=>import("./ProductCardSync"),{ssr:false});
const ProductMotionPrefetch=dynamic(()=>import("./ProductMotionPrefetch"),{ssr:false});
const WorldSaveBridge=dynamic(()=>import("./WorldSaveBridge"),{ssr:false});
const CheckoutStatus=dynamic(()=>import("./CheckoutStatus"),{ssr:false});
const YnotTryPricing=dynamic(()=>import("./YnotTryPricing"),{ssr:false});
type Mode="shop"|"discover";type Source="Shopify"|"eBay"|"Etsy";type Account={name?:string;avatar?:string}|null;
const SHOP_AI_PROMPTS=["Ask YNOT","Find me an outfit under €150","Find beauty products for glowing skin","Find me a luxury-style bag under €90","Build me a dinner outfit","Find gifts under €50","Find white sneakers like designer ones","Help me decorate my home"];
function setReactInput(input:HTMLInputElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}))}
function sourceDisplay(source:Source){return source==="Shopify"?"YNOT":source==="eBay"?"Marketplace":"Commerce"}
const SOURCE_RENAMES:[[RegExp,string],[RegExp,string],[RegExp,string],[RegExp,string],[RegExp,string]]=[[/\bShopify\b/g,"YNOT"],[/\beBay Marketplace\b/g,"Marketplace"],[/\beBay\b/g,"Marketplace"],[/\bEtsy Marketplace\b/g,"Commerce"],[/\bEtsy\b/g,"Commerce"]];
function publicSourceText(value:string){return SOURCE_RENAMES.reduce((text,[pattern,replacement])=>text.replace(pattern,replacement),String(value||""))}
function brandNode(root:Node){const element=root instanceof Element?root:null;if(element?.closest("script,style,noscript,code,pre"))return;const textNodes:Text[]=[];if(root.nodeType===Node.TEXT_NODE)textNodes.push(root as Text);if(root instanceof Element){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode())textNodes.push(walker.currentNode as Text)}for(const node of textNodes){if(node.parentElement?.closest("script,style,noscript,code,pre"))continue;const current=node.nodeValue||"",next=publicSourceText(current);if(next!==current)node.nodeValue=next}if(root instanceof Element){const targets=[root,...root.querySelectorAll<HTMLElement>("[title],[aria-label],[placeholder]")];for(const target of targets){for(const attr of ["title","aria-label","placeholder"]){const current=target.getAttribute(attr);if(!current)continue;const next=publicSourceText(current);if(next!==current)target.setAttribute(attr,next)}}}}
function cleanPhrase(v:string){return v.trim().replace(/\s+/g," ")}
function appendMissingTags(base:string,tags:string[]){let next=cleanPhrase(base);for(const tag of tags){const t=cleanPhrase(tag);if(!t)continue;if(!next.toLowerCase().includes(t.toLowerCase()))next=cleanPhrase(`${next} ${t}`)}return next}
export default function AppShell({initialQuery=""}:{initialQuery?:string}={}){const cleanInitial=cleanPhrase(initialQuery);const[mode,setMode]=useState<Mode>("shop"),[source,setSource]=useState<Source>("Shopify"),[sourceOpen,setSourceOpen]=useState(false),[bottomQuery,setBottomQuery]=useState(cleanInitial),[chromeHidden,setChromeHidden]=useState(false),[selectedTags,setSelectedTags]=useState<string[]>([]),[account,setAccount]=useState<Account>(null),[discoverLoading,setDiscoverLoading]=useState(false),[discoverCount,setDiscoverCount]=useState(0),[secondaryReady,setSecondaryReady]=useState(false),[aiPromptIndex,setAiPromptIndex]=useState(0),[searchFocused,setSearchFocused]=useState(false);const effectiveQuery=useMemo(()=>appendMissingTags(bottomQuery,selectedTags),[bottomQuery,selectedTags]);const sourceMenuRef=useRef<HTMLDivElement>(null),initialSearchRan=useRef(false);
useEffect(()=>{const selector=[".lv4-detail",".lv4-detail-backdrop",".ynot-selected",".ynot-story",".ynot-cart",".ynot-unified-bag",".ynot-drawer.open",".discover-profile-backdrop",".ynot-notebook-shell",".ynot-auth-shell"].join(","),sync=()=>setChromeHidden(Boolean(document.querySelector(selector)));let frame=0;const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;sync()})};sync();const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});return()=>{observer.disconnect();if(frame)cancelAnimationFrame(frame)}},[]);
useEffect(()=>{
 if(!cleanInitial||initialSearchRan.current)return;
 let tries=0,timer:number|undefined;
 const run=()=>{
  if(initialSearchRan.current)return;
  const input=document.querySelector<HTMLInputElement>(".lv4-search input"),button=document.querySelector<HTMLButtonElement>(".lv4-search button");
  if(input&&button){initialSearchRan.current=true;setBottomQuery(cleanInitial);setReactInput(input,cleanInitial);window.dispatchEvent(new CustomEvent("shop:tag-search",{detail:{query:cleanInitial,tags:[],source:"deep-link"}}));requestAnimationFrame(()=>button.click());return}
  if(tries++<80)timer=window.setTimeout(run,50);
 };
 timer=window.setTimeout(run,80);
 return()=>{if(timer)window.clearTimeout(timer)};
},[cleanInitial]);
useEffect(()=>{
 let observer:MutationObserver|null=null,timer:number|undefined,idle:any;
 const start=()=>{
  brandNode(document.body);
  observer=new MutationObserver(mutations=>{const nodes:Node[]=[];for(const mutation of mutations)for(const node of mutation.addedNodes)nodes.push(node);if(!nodes.length)return;const run=()=>nodes.forEach(brandNode);const w=window as any;if(typeof w.requestIdleCallback==="function")w.requestIdleCallback(run,{timeout:700});else window.setTimeout(run,40)});
  observer.observe(document.body,{subtree:true,childList:true});
 };
 const w=window as any;
 if(typeof w.requestIdleCallback==="function")idle=w.requestIdleCallback(start,{timeout:1000});else timer=window.setTimeout(start,450);
 return()=>{observer?.disconnect();if(idle!=null&&typeof w.cancelIdleCallback==="function")w.cancelIdleCallback(idle);if(timer!=null)window.clearTimeout(timer)}
},[]);
useEffect(()=>{const w=window as any;let timer:number|undefined,idle:any;const ready=()=>setSecondaryReady(true);if(typeof w.requestIdleCallback==="function")idle=w.requestIdleCallback(ready,{timeout:850});else timer=window.setTimeout(ready,350);return()=>{if(idle!=null&&typeof w.cancelIdleCallback==="function")w.cancelIdleCallback(idle);if(timer!=null)window.clearTimeout(timer)}},[]);
useEffect(()=>{let live=true;const load=async()=>{if(!readSession()){if(live)setAccount(null);return}try{const r=await authedFetch("/api/account"),d=await r.json().catch(()=>({}));if(live&&r.ok)setAccount(d.account||null)}catch{}};void load();const ready=(e:Event)=>setAccount((e as CustomEvent<Account>).detail),auth=()=>{if(!readSession())setAccount(null);else void load()};window.addEventListener("ynot:account-ready",ready as EventListener);window.addEventListener("ynot:auth-changed",auth);return()=>{live=false;window.removeEventListener("ynot:account-ready",ready as EventListener);window.removeEventListener("ynot:auth-changed",auth)}},[]);
useEffect(()=>{const onLoading=(event:Event)=>{const detail=(event as CustomEvent<{loading?:boolean;count?:number}>).detail||{};setDiscoverLoading(Boolean(detail.loading));if(typeof detail.count==="number")setDiscoverCount(detail.count)};window.addEventListener("discover:loading",onLoading as EventListener);return()=>window.removeEventListener("discover:loading",onLoading as EventListener)},[]);
useEffect(()=>{const onTags=(event:Event)=>{const detail=(event as CustomEvent<{tags?:string[]}>).detail,tags=Array.isArray(detail?.tags)?detail.tags:[];setSelectedTags(tags);if(mode==="shop")setBottomQuery(current=>appendMissingTags(current,tags))};window.addEventListener("shop:tags-changed",onTags as EventListener);return()=>window.removeEventListener("shop:tags-changed",onTags as EventListener)},[mode]);
useEffect(()=>{if(mode!=="shop"||searchFocused||bottomQuery.trim())return;const timer=window.setInterval(()=>setAiPromptIndex(index=>(index+1)%SHOP_AI_PROMPTS.length),2500);return()=>window.clearInterval(timer)},[mode,searchFocused,bottomQuery]);
useEffect(()=>{if(!sourceOpen)return;const closeSourceMenu=(event:PointerEvent)=>{const target=event.target as Node|null;if(target&&!sourceMenuRef.current?.contains(target))setSourceOpen(false)};const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setSourceOpen(false)};document.addEventListener("pointerdown",closeSourceMenu);document.addEventListener("keydown",escape);return()=>{document.removeEventListener("pointerdown",closeSourceMenu);document.removeEventListener("keydown",escape)}},[sourceOpen]);
function openYnot(){
 setSecondaryReady(true);
 let tries=0;
 const open=()=>{const peek=document.querySelector<HTMLButtonElement>(".ynot-peek");if(peek){peek.click();return}if(tries++<40)window.setTimeout(open,35)};
 open();
}
function goHome(){document.querySelector<HTMLButtonElement>(".lv4-logo")?.click()}function toggleCompass(){document.querySelector<HTMLButtonElement>(".ynot-compass-button")?.click()}function openAccount(){window.dispatchEvent(new CustomEvent("ynot:open-auth",{detail:{mode:"signin",profile:true}}))}function openSaved(){window.dispatchEvent(new Event("ynot:open-saves"))}function openNotifications(){window.dispatchEvent(new Event("ynot:open-circle"))}
function openPartnerFinder(){window.dispatchEvent(new Event("ynot:open-partner"))}
function toggleSourceMenu(event:React.MouseEvent<HTMLButtonElement>){event.preventDefault();event.stopPropagation();setSourceOpen(open=>!open)}
function switchSource(next:Source){
 setSource(next);
 setSourceOpen(false);
 window.dispatchEvent(new CustomEvent("ynot:catalog-source",{detail:{source:next==="Shopify"?"shopify":next==="eBay"?"ebay":"etsy"}}));
}
function submitBottomSearch(e:FormEvent){e.preventDefault();if(mode==="discover"){const clean=bottomQuery.trim();if(clean.length>=2)window.dispatchEvent(new CustomEvent("discover:search",{detail:clean}));return}const clean=effectiveQuery,input=document.querySelector<HTMLInputElement>(".lv4-search input");if(clean.length<2||!input)return;setBottomQuery(clean);setReactInput(input,clean);window.dispatchEvent(new CustomEvent("shop:tag-search",{detail:{query:clean,tags:selectedTags,source:"search"}}));requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(".lv4-search button")?.click())}
const signed=Boolean(account||readSession()),etsy=source==="Etsy",shopPlaceholder=SHOP_AI_PROMPTS[aiPromptIndex];return <div className={`ynot-app-shell source-${source.toLowerCase()} ${chromeHidden?"chrome-hidden":""}`}><EntryAmbientBubbles/><EtsyCatalogBridge/><ShopIntentPlannerBridge/><header className="ynot-reference-header"><div className="ynot-reference-left"><button className="ynot-reference-brand" onClick={goHome}><b>YNOT</b></button></div><div className="ynot-reference-center"><div className="ynot-reference-topline"><nav className="ynot-top-mode"><button className={mode==="shop"?"active":""} onClick={()=>setMode("shop")}>SHOP</button><button className={mode==="discover"?"active":""} onClick={()=>setMode("discover")}>DISCOVER</button></nav>{mode==="shop"&&<div className="ynot-reference-nav-tools"><a className="ynot-reference-earn-orb" href="/earn" aria-label="Earn with YNOT" title="Earn with YNOT"><Link2 aria-hidden="true"/></a><button onClick={toggleCompass}><Compass/></button></div>}</div>{mode==="shop"&&<div className="ynot-world-controls"><div className="ynot-world-row"><button className="active">WORLD</button><button type="button" onClick={openYnot}>YNOT</button></div><div className="ynot-view-source" ref={sourceMenuRef}><button type="button" className="ynot-source-trigger-clean" data-source-only="true" onClick={toggleSourceMenu} aria-haspopup="menu" aria-expanded={sourceOpen}>{sourceDisplay(source)}<ChevronDown/></button>{sourceOpen&&<div className="ynot-source-list" role="menu"><button type="button" role="menuitem" className={source==="Shopify"?"active":""} onClick={()=>switchSource("Shopify")}>YNOT</button><button type="button" role="menuitem" className={source==="eBay"?"active":""} onClick={()=>switchSource("eBay")}>Marketplace</button><button type="button" role="menuitem" className={source==="Etsy"?"active":""} onClick={()=>switchSource("Etsy")}>Commerce</button></div>}</div></div>}</div><div className="ynot-reference-right"><button className="ynot-reference-notify" onClick={openNotifications}><Bell/><i/></button>{signed?<button className="ynot-reference-signin has-profile" onClick={openSaved}><span>Worlds</span></button>:<button className="ynot-reference-signin" onClick={openAccount}><span>Sign in</span></button>}<button className={`ynot-reference-avatar ${account?.avatar?"has-image":""}`} onClick={openAccount} aria-label={signed?"Open profile":"Open sign in"}>{account?.avatar?<img src={account.avatar} alt="Your profile"/>:<UserRound/>}</button></div></header>{mode==="discover"?<DiscoveryUniverse/>:<><LuminaWorld/><WorldCompass/></>}{mode==="shop"&&<><TaxonomyRailClean/><DesktopGlassSideControls active/></>}{mode==="discover"&&<button className="ynot-search-partner" type="button" onClick={openPartnerFinder} aria-label="Open Partner Finder">@</button>}<form className={`ynot-bottom-search ${mode}`} onSubmit={submitBottomSearch}>{mode==="shop"?<Sparkles className="ynot-ai-search-star"/>:<Search/>}<input value={bottomQuery} onChange={e=>setBottomQuery(e.target.value)} onFocus={()=>setSearchFocused(true)} onBlur={()=>setSearchFocused(false)} placeholder={mode==="discover"?"Search Instagram niches, brands or styles":shopPlaceholder}/><button className={mode==="discover"&&discoverLoading?"is-searching":""} disabled={mode==="discover"&&discoverLoading}>{mode==="discover"&&discoverLoading?<><i className="ynot-search-spinner"/>{discoverCount?`${discoverCount} found`:"Searching…"}</>:"Search"}</button></form><CircleDrawer/><ProfilePanel/><AuthGate/><WorldVisualPolish/><DesktopLatticeController/><MobileProductSwipeController/>
{secondaryReady&&<><EtsyCatalogBridge/><YnotDrawer/><UnifiedBag/><YnotBuyPolish/><YnotCloseStability/><YnotIntentBridge/><SavedNotebook/><SavesBookToast/><ProductDetailHydrator/><ProductReferenceEnhancer/><ProductCardSync/><ProductMotionPrefetch/><WorldSaveBridge/><YnotTryPricing/><CheckoutStatus/></>}
</div>}
