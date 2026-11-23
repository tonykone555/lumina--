"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowUpRight,Bookmark,Check,ChevronDown,ChevronUp,Share2} from "lucide-react";
import "./StudioFeed.css";

type Product={id:string;title:string;brand:string;price:number;image:string;sourceUrl:string;category:string;description?:string;score?:number};
type Category="all"|"featured"|"lighting"|"chairs"|"furniture";
const tabs:{key:Category;label:string}[]=[{key:"all",label:"All pieces"},{key:"featured",label:"Best picks"},{key:"lighting",label:"Lighting"},{key:"chairs",label:"Chairs"},{key:"furniture",label:"Furniture"}];
const describe=(p:Product)=>p.category==="lighting"?"A statement light for atmospheric residential, hospitality and interior design projects.":p.category==="chairs"?"A distinctive seating piece for refined residential and contemporary commercial spaces.":"An expressive furniture piece for curated interiors and spatial compositions.";
const money=(n:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"EUR",maximumFractionDigits:2}).format(n);
const storageKey="ynot-saved-items";
const valid=(p:Product)=>Boolean(p.id&&p.title&&p.image&&p.price>0&&p.category);
export default function StudioFeed({products}:{products:Product[]}){
 const [category,setCategory]=useState<Category>("all");
 const [index,setIndex]=useState(0);
 const [saved,setSaved]=useState<string[]>([]);
 const [catalog,setCatalog]=useState<Product[]>(products);
 const [nextPage,setNextPage]=useState(0);
 const [loadingMore,setLoadingMore]=useState(false);
 const [loadError,setLoadError]=useState(false);
 const loadingRef=useRef(false);
 const nextRef=useRef(0);
 const [hasMore,setHasMore]=useState(true);
 const [toast,setToast]=useState("");
 const [scrubbing,setScrubbing]=useState(false);
 const zipper=useRef<HTMLDivElement>(null);
 const swipe=useRef<{x:number;y:number;at:number}|null>(null);
 const lastWheel=useRef(0);
 const deepLinkConsumed=useRef(false);
 const items=useMemo(()=>category==="all"?catalog:category==="featured"?catalog.filter(p=>Number(p.score||0)>=63).sort((a,b)=>Number(b.score||0)-Number(a.score||0)):catalog.filter(p=>p.category===category),[category,catalog]);
 const current=items[Math.min(index,Math.max(0,items.length-1))];
 const currentIndex=Math.min(index,Math.max(0,items.length-1));
 const setSafeIndex=useCallback((next:number)=>setIndex(Math.max(0,Math.min(items.length-1,Math.round(next)))),[items.length]);
 useEffect(()=>{try{const value=JSON.parse(localStorage.getItem(storageKey)||"[]");if(Array.isArray(value))setSaved(value.filter(x=>typeof x==="string"))}catch{}},[]);
 useEffect(()=>{setIndex(0)},[category]);
 const loadMore=useCallback(async()=>{
  if(loadingRef.current||nextRef.current>=12)return;
  loadingRef.current=true;setLoadingMore(true);setLoadError(false);
  const page=nextRef.current;
  try{
   const response=await fetch("/api/studio/catalog?page="+page,{cache:"force-cache",signal:AbortSignal.timeout(35000)});
   if(!response.ok)throw new Error("CATALOG_UNAVAILABLE");
   const data=await response.json() as {products?:Product[];hasMore?:boolean};
   const incoming=(Array.isArray(data.products)?data.products:[]).filter(valid);
   setCatalog(previous=>{const keys=new Set(previous.map(p=>p.id));const titles=new Set(previous.map(p=>(p.title+"|"+p.brand).toLowerCase().replace(/[^a-z0-9]/g,"")));const fresh=incoming.filter(p=>{const key=(p.title+"|"+p.brand).toLowerCase().replace(/[^a-z0-9]/g,"");if(keys.has(p.id)||titles.has(key))return false;keys.add(p.id);titles.add(key);return true});return [...previous,...fresh]});
   nextRef.current=page+1;setNextPage(nextRef.current);setHasMore(Boolean(data.hasMore)&&nextRef.current<12);
  }catch{setLoadError(true)}
  finally{loadingRef.current=false;setLoadingMore(false)}
 },[]);
 useEffect(()=>{void loadMore()},[loadMore]);
 useEffect(()=>{if(hasMore&&!loadingMore&&!loadError&&(items.length-currentIndex<20||(category!=="all"&&items.length<30)))void loadMore()},[items.length,currentIndex,category,hasMore,loadingMore,loadError,loadMore]);
 useEffect(()=>{if(!toast)return;const t=window.setTimeout(()=>setToast(""),2500);return()=>clearTimeout(t)},[toast]);
 useEffect(()=>{if(!current)return;const nearby=items.slice(currentIndex+1,currentIndex+5);for(const p of nearby){const image=new Image();image.src=p.image}},[items,currentIndex,current?.id]);
 const save=()=>{
  if(!current)return;
  let list:Array<Record<string,unknown>>=[];
  try{const stored=JSON.parse(localStorage.getItem(storageKey)||"[]");if(Array.isArray(stored))list=stored.filter(x=>x&&typeof x==="object")}catch{}
  const exists=list.some(p=>String(p.id)===current.id);
  const item={id:current.id,title:current.title,brand:current.brand,price:current.price,currency:"EUR",image:current.image,images:[current.image],url:current.sourceUrl,source:"shopify-global-catalog",section:"Studio",sections:["Studio"],badge:"Saved from Studio",note:"Saved from YNOT Studio interior catalogue"};
  const next=exists?list.filter(p=>String(p.id)!==current.id):[item,...list];
  try{localStorage.setItem(storageKey,JSON.stringify(next));localStorage.setItem("ynot-saved-products",JSON.stringify(next.map(p=>p.id)))}catch{}
  setSaved(next.map(p=>String(p.id)));window.dispatchEvent(new Event("ynot:saves-changed"));
  setToast(exists?"Removed from Saves":"Saved");
 };
 const share=async()=>{if(!current)return;const url=window.location.origin+"/worlds/studio?product="+encodeURIComponent(current.id);try{if(navigator.share)await navigator.share({title:current.title,url});else{await navigator.clipboard.writeText(url);setToast("Link copied")}}catch{}};
 useEffect(()=>{if(deepLinkConsumed.current)return;const params=new URLSearchParams(window.location.search);const selected=params.get("product");if(!selected){deepLinkConsumed.current=true;return}const idx=items.findIndex(p=>p.id===selected);if(idx>=0){setIndex(idx);deepLinkConsumed.current=true}},[items]);
 const selectFromPoint=(clientY:number)=>{const el=zipper.current;if(!el)return;const b=el.getBoundingClientRect();const percent=Math.min(1,Math.max(0,(clientY-b.top)/b.height));setSafeIndex(percent*(items.length-1))};
 const onZipperDown=(e:React.PointerEvent<HTMLDivElement>)=>{e.preventDefault();e.stopPropagation();setScrubbing(true);e.currentTarget.setPointerCapture(e.pointerId);selectFromPoint(e.clientY)};
 const onZipperMove=(e:React.PointerEvent<HTMLDivElement>)=>{if(scrubbing)selectFromPoint(e.clientY)};
 const onZipperUp=(e:React.PointerEvent<HTMLDivElement>)=>{setScrubbing(false);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)};
 const onStageDown=(e:React.PointerEvent<HTMLElement>)=>{if((e.target as HTMLElement).closest("button,a,input,.studio-zip,.studio-filters,.studio-project-panel"))return;swipe.current={x:e.clientX,y:e.clientY,at:Date.now()}};
 const onStageUp=(e:React.PointerEvent<HTMLElement>)=>{const start=swipe.current;swipe.current=null;if(!start)return;const dy=e.clientY-start.y;const dx=e.clientX-start.x;if(Math.abs(dy)>52&&Math.abs(dy)>Math.abs(dx))setSafeIndex(currentIndex+(dy<0?1:-1))};
 const onWheel=(e:React.WheelEvent<HTMLElement>)=>{if((e.target as HTMLElement).closest(".studio-project-panel,.studio-zip"))return;if(Math.abs(e.deltaY)<12)return;const now=Date.now();if(now-lastWheel.current<360)return;lastWheel.current=now;setSafeIndex(currentIndex+(e.deltaY>0?1:-1))};
 if(!current)return <main className="studio-empty"><Link href="/worlds">Back to Worlds</Link><p>No catalogue pieces available.</p></main>;
 const masonryCategory=current.category==="lighting"?"lighting/chandeliers":current.category==="chairs"?"living/armchairs":/sofa|couch|loveseat/i.test(current.title)?"living/sofas":/console/i.test(current.title)?"living/console-tables":"living/coffee-tables";
 const masonryParams=new URLSearchParams({studio:"1",product:current.id,title:current.title,brand:current.brand||"",image:current.image,price:String(current.price),url:current.sourceUrl||"",description:current.description||"",origin:"studio"});
 const masonryHref="/worlds/home-interiors/"+masonryCategory+"?"+masonryParams.toString();
 const progress=items.length>1?currentIndex/(items.length-1):0;
 return <main className="studio-stage" tabIndex={0} aria-label="YNOT Studio vertical interiors product feed" onPointerDown={onStageDown} onPointerUp={onStageUp} onWheel={onWheel} onKeyDown={e=>{if(e.key==="ArrowDown"){e.preventDefault();setSafeIndex(currentIndex+1)}if(e.key==="ArrowUp"){e.preventDefault();setSafeIndex(currentIndex-1)}if(e.key==="Escape")e.currentTarget.blur()}}>
  <div className="studio-backdrop" key={"bg-"+current.id} style={{backgroundImage:`url("${current.image.replaceAll('"',"%22")}")`}} aria-hidden="true"/>
  <div className="studio-hero" key={current.id}><img src={current.image} alt={current.title} fetchPriority="high"/></div>
  <div className="studio-vignette" aria-hidden="true"/>
  <header className="studio-topbar">
   <Link href="/worlds" className="studio-back" aria-label="Back to YNOT Worlds"><ArrowLeft size={18}/></Link>
   <div className="studio-wordmark"><b>YNOT</b> <span>/ STUDIO</span><small>THE INTERIORS EDIT</small></div>
   <Link className="studio-project-trigger" href="/worlds" aria-label="Explore YNOT Worlds"><span>WORLDs</span></Link>
  </header>
  <nav className="studio-filters" aria-label="Filter Studio collections">
   {tabs.map(tab=><button key={tab.key} onClick={()=>setCategory(tab.key)} className={category===tab.key?"selected":""} aria-pressed={category===tab.key}>{tab.label}</button>)}
  </nav>
  <div className="studio-counter" aria-live="off"><span>{String(currentIndex+1).padStart(3,"0")}</span><em> / {String(items.length).padStart(3,"0")}</em></div>
  <div className="studio-zip-wrap">
  
   <div className={`studio-zip ${scrubbing?"active":""}`} ref={zipper} role="slider" aria-label="Zipper: scrub through products" aria-valuemin={1} aria-valuemax={items.length} aria-valuenow={currentIndex+1} tabIndex={0} onPointerDown={onZipperDown} onPointerMove={onZipperMove} onPointerUp={onZipperUp} onPointerCancel={onZipperUp} onKeyDown={e=>{if(e.key==="ArrowDown"||e.key==="ArrowRight"){e.preventDefault();setSafeIndex(currentIndex+1)}else if(e.key==="ArrowUp"||e.key==="ArrowLeft"){e.preventDefault();setSafeIndex(currentIndex-1)}else if(e.key==="Home"){e.preventDefault();setSafeIndex(0)}else if(e.key==="End"){e.preventDefault();setSafeIndex(items.length-1)}}}>
    <span className="studio-zip-track"/><span className="studio-zip-fill" style={{height:`${progress*100}%`}}/>

    <span className="studio-zip-handle" style={{top:`${progress*100}%`}}><span className="studio-zip-bubble">{currentIndex+1}</span></span>
   </div>
   <button aria-label="Next product" className="studio-next-arrow" onClick={()=>setSafeIndex(currentIndex+1)}><ChevronDown size={21}/></button>
  </div>
  <div className="studio-bottom">
   <div className="studio-kind"><span>YNOT CURATED / {current.category.toUpperCase()}</span><span className="studio-kind-line"/></div>
   <div className="studio-text">
    <p className="studio-brand">{current.brand||"Independent designer"}</p>
    <h1>{current.title}</h1>
    <p className="studio-description">{describe(current)}</p>
    <div className="studio-price">{money(current.price)} <span>Indicative YNOT catalogue price · delivery and availability to confirm</span></div>
   </div>
   <div className="studio-actions">
    <button className={saved.includes(current.id)?"is-saved":""} onClick={save}><Bookmark size={19} fill={saved.includes(current.id)?"currentColor":"none"}/><span>{saved.includes(current.id)?"Saved":"Save"}</span></button>
    <Link href={masonryHref} onClick={()=>{try{sessionStorage.setItem("ynot-studio-product:"+current.id,JSON.stringify(current))}catch{}}}><ArrowUpRight size={19}/><span>Product details</span></Link>
    <button onClick={share} aria-label="Share current product"><Share2 size={18}/><span>Share</span></button>
   </div>
   <div className="studio-hint"><span>SWIPE UP TO DISCOVER · {catalog.length} PIECES{hasMore?"+":""}</span><ChevronUp size={15}/>{loadingMore&&<span>Finding more…</span>}{loadError&&<button className="studio-retry" onClick={()=>void loadMore()}>Retry loading</button>}</div>
  </div>
  {toast&&<div className="studio-toast" role="status"><Check size={16}/>{toast}</div>}

 </main>
}
