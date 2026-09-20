"use client";

import Image from "next/image";
import {useEffect,useRef,useState} from "react";

type EntryProduct={id:string;variantId?:string;title:string;brand:string;price:number|null;currency?:string;image:string;images?:string[];url?:string;tags?:string[];source?:string;variants?:unknown[];description?:string;checkout?:unknown};
type EntryProductGroup={key:string;products:EntryProduct[]};
type EntrySlot={groupKey:string;current:EntryProduct;revision:number};

const ENTRY_SLOT_LAYOUT=[
 {x:5,y:17,size:162,tone:"hero"},{x:18,y:9,size:112,tone:"medium"},{x:32,y:18,size:76,tone:"small"},
 {x:48,y:9,size:132,tone:"hero"},{x:66,y:17,size:98,tone:"medium"},{x:83,y:10,size:78,tone:"small"},
 {x:95,y:24,size:150,tone:"hero"},{x:7,y:39,size:92,tone:"medium"},{x:21,y:31,size:68,tone:"small"},
 {x:29,y:40,size:102,tone:"medium"},{x:71,y:25,size:82,tone:"small"},{x:80,y:35,size:112,tone:"medium"},
 {x:94,y:47,size:84,tone:"small"},{x:6,y:61,size:126,tone:"hero"},{x:20,y:57,size:84,tone:"small"},
 {x:28,y:69,size:106,tone:"medium"},{x:50,y:77,size:74,tone:"small"},{x:70,y:66,size:116,tone:"medium"},
 {x:88,y:59,size:98,tone:"medium"},{x:12,y:82,size:86,tone:"small"},{x:32,y:85,size:112,tone:"medium"},
 {x:61,y:84,size:154,tone:"hero"},{x:88,y:81,size:102,tone:"medium"},
] as const;

const entryCatalogueRequests=new Map<string,Promise<EntryProductGroup[]>>();

function shopperCountry(){
 try{const saved=JSON.parse(localStorage.getItem("ynot-region")||"null") as {country?:string}|null;return String(saved?.country||"FR").toUpperCase().slice(0,2)}catch{return"FR"}
}

function entryImageUrl(source:string){
 try{
  const url=new URL(source);
  if(url.hostname==="cdn.shopify.com")url.searchParams.set("width","360");
  return url.toString();
 }catch{return source}
}

function loadEntryCatalogue(country:string){
 const cached=entryCatalogueRequests.get(country);
 if(cached)return cached;
 const request=fetch(`/api/catalog?entry=1&country=${encodeURIComponent(country)}`,{cache:"force-cache"})
  .then(async response=>{
   if(!response.ok)throw new Error("ENTRY_CATALOG_UNAVAILABLE");
   const data=await response.json() as {groups?:EntryProductGroup[]};
   return (data.groups||[]).filter(group=>group.products?.some(product=>product.id&&product.image));
  })
  .catch(error=>{entryCatalogueRequests.delete(country);throw error});
 entryCatalogueRequests.set(country,request);
 return request;
}

const BUBBLES=[
 {x:"5%",y:"17%",s:112,d:12.5,delay:-2.4,depth:.82,blur:0},
 {x:"15%",y:"69%",s:54,d:10.8,delay:-5.1,depth:.54,blur:.2},
 {x:"28%",y:"10%",s:42,d:11.7,delay:-3.8,depth:.43,blur:.35},
 {x:"39%",y:"82%",s:88,d:15.2,delay:-8.1,depth:.7,blur:.1},
 {x:"57%",y:"88%",s:61,d:12.7,delay:-1.9,depth:.55,blur:.25},
 {x:"69%",y:"14%",s:78,d:13.5,delay:-7.2,depth:.66,blur:.12},
 {x:"84%",y:"67%",s:103,d:14.2,delay:-4.4,depth:.8,blur:0},
 {x:"92%",y:"25%",s:46,d:10.9,delay:-6.7,depth:.46,blur:.3},
 {x:"50%",y:"24%",s:31,d:9.6,delay:-4.9,depth:.36,blur:.5},
 {x:"76%",y:"45%",s:38,d:10.2,delay:-2.8,depth:.4,blur:.42},
];

const SUBCATEGORIES:Record<string,string[]>={
 "Fashion Men & Women":["Men","Women","Dresses","Streetwear","Activewear","Shoes"],
 "Fashion":["Men","Women","Dresses","Streetwear","Activewear","Shoes"],
 "Fitness & Sports":["Gym Equipment","Gym Clothing","Running","Recovery","Protein","Training"],
 "Tech & Electronics":["Phones","Audio","Gaming","Smart Home","Wearables","Accessories"],
 "Tech":["Phones","Audio","Gaming","Smart Home","Wearables","Accessories"],
 "Health & Wellness":["Recovery","Sleep","Massage","Hydration","Mobility","Wellness Tech"],
 "Beauty":["Skincare","Hair Care","Makeup","Body Care","Fragrance","Beauty Tools"],
 "Home":["Furniture","Lighting","Decor","Storage","Kitchen","Bedding"],
 "Digital Product":["AI Tools","Templates","Ebooks","Creator Tools","Video Assets","Courses"],
 "Discover":["Trending","Best Value","New","Popular","Under €50","Unexpected"],
};

const DISMISS_SELECTOR=[
 ".lv4-search button",
 ".lv4-search input",
 ".ynot-bottom-search button",
 ".ynot-bottom-search input",
 ".ynot-top-mode button",
 ".ynot-world-controls button",
 ".ynot-reference-right button",
 ".ynot-reference-left button",
 ".lv4-product",
 ".lv4-category-bubble",
 ".lv4-refine",
 ".ynot-peek",
 ".ynot-far-button",
 ".ynot-compass-button",
].join(",");

function categoryAtPoint(x:number,y:number){
 const categories=[...document.querySelectorAll<HTMLButtonElement>(".lv4-category-bubble")];
 return categories.find(button=>{
  const rect=button.getBoundingClientRect();
  const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  const radius=Math.max(rect.width,rect.height)*.52;
  return Math.hypot(x-cx,y-cy)<=radius;
 })||null;
}

function subcategoryAtPoint(x:number,y:number){
 const bubbles=[...document.querySelectorAll<HTMLElement>(".ynot-entry-subcategory")];
 return bubbles.find(button=>{
  const rect=button.getBoundingClientRect();
  const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  return Math.hypot(x-cx,y-cy)<=Math.max(rect.width,rect.height)*.58;
 })||null;
}

function submitSearch(query:string){
 const input=document.querySelector<HTMLInputElement>(".ynot-bottom-search.shop input,.ynot-bottom-search input");
 if(!input)return;
 const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
 setter?.call(input,query);
 input.dispatchEvent(new Event("input",{bubbles:true}));
 requestAnimationFrame(()=>input.closest("form")?.requestSubmit());
}

export default function EntryAmbientBubbles(){
 const[home,setHome]=useState(true);
 const[dismissed,setDismissed]=useState(false);
 const[dragging,setDragging]=useState(false);
 const[hoveredCategory,setHoveredCategory]=useState("");
 const[activeCategory,setActiveCategory]=useState("");
 const[activeCategoryCenter,setActiveCategoryCenter]=useState<{x:number;y:number}|null>(null);
 const[hoveredSubcategory,setHoveredSubcategory]=useState("");
 const[position,setPosition]=useState<{x:number;y:number}|null>(null);
 const[entryGroups,setEntryGroups]=useState<EntryProductGroup[]>([]);
 const[productSlots,setProductSlots]=useState<EntrySlot[]>([]);
 const[productInteraction,setProductInteraction]=useState(false);
 const[pageVisible,setPageVisible]=useState(true);
 const pointerId=useRef<number|null>(null);
 const lastHit=useRef<HTMLButtonElement|null>(null);
 const dwellTimer=useRef<number|null>(null);
 const activeButton=useRef<HTMLButtonElement|null>(null);

 useEffect(()=>{
  let cancelled=false;
  if(new URLSearchParams(window.location.search).has("product")){
   setDismissed(true);
   return()=>{cancelled=true};
  }
  void loadEntryCatalogue(shopperCountry()).then(groups=>{
   if(cancelled)return;
   const usable=groups.slice(0,ENTRY_SLOT_LAYOUT.length);
   setEntryGroups(usable);
   setProductSlots(usable.map(group=>({groupKey:group.key,current:group.products[0],revision:0})));
  }).catch(()=>{});
  return()=>{cancelled=true};
 },[]);

 useEffect(()=>{
  const sync=()=>setPageVisible(!document.hidden);
  document.addEventListener("visibilitychange",sync);
  return()=>document.removeEventListener("visibilitychange",sync);
 },[]);

 useEffect(()=>{
  let frame=0;
  const sync=()=>{frame=0;setHome(Boolean(document.querySelector(".lv4-shell.depth-worlds")))};
  const queue=()=>{if(frame)return;frame=requestAnimationFrame(sync)};
  const observer=new MutationObserver(queue);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});

  const dismiss=()=>setDismissed(true);
  const onPointer=(event:PointerEvent)=>{
   const target=event.target as Element|null;
   if(target?.closest(".ynot-entry-pointer,.ynot-entry-subcategory"))return;
   if(target?.closest(DISMISS_SELECTOR))dismiss();
  };
  const onSubmit=(event:Event)=>{
   const target=event.target as Element|null;
   if(target?.closest(".lv4-search,.ynot-bottom-search"))dismiss();
  };
  const onSearch=()=>dismiss();
  const onReset=()=>{setDismissed(false);setPosition(null);setActiveCategory("");setActiveCategoryCenter(null)};

  document.addEventListener("pointerdown",onPointer,true);
  document.addEventListener("submit",onSubmit,true);
  window.addEventListener("shop:tag-search",onSearch);
  window.addEventListener("discover:search",onSearch);
  window.addEventListener("ynot:open-deals",onSearch);
  window.addEventListener("ynot:open-saves",onSearch);
  window.addEventListener("ynot:open-circle",onSearch);
  window.addEventListener("ynot:open-auth",onSearch);
  window.addEventListener("ynot:open-partner",onSearch);
  window.addEventListener("ynot:world-active",onSearch);
  window.addEventListener("ynot:world-reset",onReset);

  sync();
  return()=>{
   observer.disconnect();
   if(frame)cancelAnimationFrame(frame);
   if(dwellTimer.current)window.clearTimeout(dwellTimer.current);
   document.removeEventListener("pointerdown",onPointer,true);
   document.removeEventListener("submit",onSubmit,true);
   window.removeEventListener("shop:tag-search",onSearch);
   window.removeEventListener("discover:search",onSearch);
   window.removeEventListener("ynot:open-deals",onSearch);
   window.removeEventListener("ynot:open-saves",onSearch);
   window.removeEventListener("ynot:open-circle",onSearch);
   window.removeEventListener("ynot:open-auth",onSearch);
   window.removeEventListener("ynot:open-partner",onSearch);
   window.removeEventListener("ynot:world-active",onSearch);
   window.removeEventListener("ynot:world-reset",onReset);
  };
 },[]);

 const active=home&&!dismissed;
 const subcategories=activeCategory?SUBCATEGORIES[activeCategory]||[]:[];

 useEffect(()=>{
  if(!active||dragging||productInteraction||!pageVisible||productSlots.length<3)return;
  let timer=0;
  const schedule=()=>{
   timer=window.setTimeout(()=>{
    setProductSlots(previous=>{
     const candidates=previous.map((_,index)=>index).filter(index=>(entryGroups[index]?.products.length||0)>1);
     const count=Math.min(candidates.length,3+Math.floor(Math.random()*3));
     for(let index=candidates.length-1;index>0;index--){const swap=Math.floor(Math.random()*(index+1));[candidates[index],candidates[swap]]=[candidates[swap],candidates[index]]}
     const rotating=new Set(candidates.slice(0,count));
     return previous.map((slot,index)=>{
      if(!rotating.has(index))return slot;
      const group=entryGroups[index];
      const currentIndex=group.products.findIndex(product=>product.id===slot.current.id);
      const current=group.products[(currentIndex+1)%group.products.length];
      return current.id===slot.current.id?slot:{...slot,current,revision:slot.revision+1};
     });
    });
    schedule();
   },12000+Math.floor(Math.random()*6001));
  };
  schedule();
  return()=>window.clearTimeout(timer);
 },[active,dragging,entryGroups,pageVisible,productInteraction,productSlots.length]);

 // Rest the white draggable light exactly in the visual center of the microphone.
 // Use the rendered microphone bounds instead of hard-coded viewport coordinates so
 // it stays aligned across iPhone sizes, Safari chrome changes and desktop.
 useEffect(()=>{
  if(!active||dragging||position)return;
  let frame=0;
  const centerOnMic=()=>{
   frame=0;
   const mic=document.querySelector<HTMLElement>(".ynot-voice-orb");
   if(!mic)return;
   const rect=mic.getBoundingClientRect();
   if(rect.width<1||rect.height<1)return;
   setPosition({x:rect.left+rect.width/2,y:rect.top+rect.height/2});
  };
  const queue=()=>{if(frame)return;frame=requestAnimationFrame(centerOnMic)};
  queue();
  window.addEventListener("resize",queue);
  window.addEventListener("orientationchange",queue);
  return()=>{if(frame)cancelAnimationFrame(frame);window.removeEventListener("resize",queue);window.removeEventListener("orientationchange",queue)};
 },[active,dragging,position]);

 function armCategory(button:HTMLButtonElement){
  if(activeButton.current===button||lastHit.current===button)return;
  if(dwellTimer.current)window.clearTimeout(dwellTimer.current);
  lastHit.current?.classList.remove("ynot-pointer-target");
  button.classList.add("ynot-pointer-target");
  lastHit.current=button;
  const label=button.querySelector("b")?.textContent?.trim()||"Open";
  setHoveredCategory(label);
  setHoveredSubcategory("");
  dwellTimer.current=window.setTimeout(()=>{
   if(lastHit.current!==button)return;
   const rect=button.getBoundingClientRect();
   activeButton.current=button;
   setActiveCategory(label);
   setActiveCategoryCenter({x:rect.left+rect.width/2,y:rect.top+rect.height/2});
   button.classList.add("ynot-pointer-expanded");
  },650);
 }

 function clearCategoryHover(){
  if(dwellTimer.current){window.clearTimeout(dwellTimer.current);dwellTimer.current=null}
  if(!activeCategory){
   lastHit.current?.classList.remove("ynot-pointer-target");
   lastHit.current=null;
   setHoveredCategory("");
  }
 }

 function movePointer(x:number,y:number){
  const margin=24;
  const nx=Math.max(margin,Math.min(window.innerWidth-margin,x));
  const ny=Math.max(120,Math.min(window.innerHeight-90,y));
  setPosition({x:nx,y:ny});

  const subHit=subcategoryAtPoint(nx,ny);
  if(subHit){
   setHoveredSubcategory(subHit.dataset.label||subHit.textContent?.trim()||"");
   return;
  }
  setHoveredSubcategory("");

  const hit=categoryAtPoint(nx,ny);
  if(hit){armCategory(hit);return}

  // Once a main category has expanded, keep its sub-bubbles alive while the
  // shopper moves away from the parent toward one of the surrounding children.
  if(!activeCategory)clearCategoryHover();
 }

 function startDrag(event:React.PointerEvent<HTMLButtonElement>){
  event.preventDefault();
  event.stopPropagation();
  pointerId.current=event.pointerId;
  event.currentTarget.setPointerCapture?.(event.pointerId);
  setDragging(true);
  movePointer(event.clientX,event.clientY);
 }

 function drag(event:React.PointerEvent<HTMLButtonElement>){
  if(!dragging||pointerId.current!==event.pointerId)return;
  event.preventDefault();
  event.stopPropagation();
  movePointer(event.clientX,event.clientY);
 }

 function resetTarget(){
  if(dwellTimer.current){window.clearTimeout(dwellTimer.current);dwellTimer.current=null}
  lastHit.current?.classList.remove("ynot-pointer-target","ynot-pointer-expanded");
  activeButton.current?.classList.remove("ynot-pointer-target","ynot-pointer-expanded");
  lastHit.current=null;
  activeButton.current=null;
  setHoveredCategory("");
  setHoveredSubcategory("");
  setActiveCategory("");
  setActiveCategoryCenter(null);
 }

 function endDrag(event:React.PointerEvent<HTMLButtonElement>){
  if(pointerId.current!==event.pointerId)return;
  event.preventDefault();
  event.stopPropagation();
  setDragging(false);
  pointerId.current=null;

  const subHit=subcategoryAtPoint(event.clientX,event.clientY);
  if(subHit&&activeCategory){
   const sub=subHit.dataset.label||subHit.textContent?.trim()||"";
   const query=`${activeCategory} ${sub}`.trim();
   resetTarget();
   setDismissed(true);
   // One transition only: do not open the parent category and then replace it.
   // That double-load caused the product lattice to jump/scatter on mobile.
   requestAnimationFrame(()=>submitSearch(query));
   return;
  }

  const hit=categoryAtPoint(event.clientX,event.clientY)||lastHit.current;
  if(hit){
   resetTarget();
   setDismissed(true);
   requestAnimationFrame(()=>hit.click());
   return;
  }

  resetTarget();
  setPosition(null);
 }

 function openEntryProduct(product:EntryProduct){
  setDismissed(true);
  window.dispatchEvent(new CustomEvent("ynot:open-entry-product",{detail:{product}}));
 }

 return <>
  <div className={`ynot-entry-ambient ${active?"active":""}`} aria-hidden="true">
   {BUBBLES.map((bubble,index)=><i key={index} style={{
    left:bubble.x,top:bubble.y,width:bubble.s,height:bubble.s,
    "--ynot-float-duration":`${bubble.d}s`,
    "--ynot-float-delay":`${bubble.delay}s`,
    "--ynot-depth":bubble.depth,
    "--ynot-blur":`${bubble.blur}px`,
   } as React.CSSProperties}/>)}
  </div>

  <div className={`ynot-entry-products ${active&&productSlots.length?"active":""}`} aria-label="Products from across YNOT stores">
   {productSlots.map((slot,index)=>{
    const layout=ENTRY_SLOT_LAYOUT[index];
    if(!layout)return null;
    const product=slot.current;
    return <button
     type="button"
     key={slot.groupKey}
     className={`ynot-entry-product ${layout.tone}`}
     style={{left:`${layout.x}%`,top:`${layout.y}%`,"--entry-size":`${layout.size}px`,"--entry-delay":`${(index%7)*-.7}s`} as React.CSSProperties}
     aria-label={`Open ${product.title}${product.brand?` by ${product.brand}`:""}`}
     onPointerEnter={()=>setProductInteraction(true)}
     onPointerLeave={()=>setProductInteraction(false)}
     onFocus={()=>setProductInteraction(true)}
     onBlur={()=>setProductInteraction(false)}
     onClick={()=>openEntryProduct(product)}
    >
     <span className="ynot-entry-product-depth"/>
     <span className="ynot-entry-product-image" key={`${product.id}-${slot.revision}`}>
      <Image src={entryImageUrl(product.image)} alt="" fill sizes="(max-width: 760px) 76px, 150px" unoptimized/>
     </span>
     <span className="ynot-entry-product-shine"/>
     <span className="ynot-entry-product-label"><b>{product.title}</b><small>{product.brand}</small></span>
    </button>;
   })}
  </div>

  {activeCategory&&activeCategoryCenter&&subcategories.length>0&&<div className="ynot-entry-subcategory-ring" aria-hidden="true">
   {subcategories.map((label,index)=>{
    const angle=-Math.PI/2+(index/subcategories.length)*Math.PI*2;
    const radius=Math.min(132,Math.max(98,window.innerWidth*.27));
    const left=activeCategoryCenter.x+Math.cos(angle)*radius;
    const top=activeCategoryCenter.y+Math.sin(angle)*radius;
    return <span
     key={label}
     data-label={label}
     className={`ynot-entry-subcategory ${hoveredSubcategory===label?"active":""}`}
     style={{left,top}}
    >{label}</span>
   })}
  </div>}

  {active&&<button
   type="button"
   className={`ynot-entry-pointer ${dragging?"dragging":""} ${hoveredCategory||hoveredSubcategory?"over-category":""}`}
   style={position?{left:position.x,top:position.y}:undefined}
   aria-label={hoveredSubcategory?`Release to open ${hoveredSubcategory}`:hoveredCategory?`Hold to expand ${hoveredCategory}`:"Drag to a category bubble"}
   onPointerDown={startDrag}
   onPointerMove={drag}
   onPointerUp={endDrag}
   onPointerCancel={endDrag}
  >
   <span className="ynot-entry-pointer-core"/>
   {(hoveredSubcategory||hoveredCategory)&&<em>{hoveredSubcategory||hoveredCategory}</em>}
  </button>}
 </>;
}

// deployment-sync-2026-09-18
