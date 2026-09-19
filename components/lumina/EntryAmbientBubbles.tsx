"use client";

import {useEffect,useRef,useState} from "react";

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
 const pointerId=useRef<number|null>(null);
 const lastHit=useRef<HTMLButtonElement|null>(null);
 const dwellTimer=useRef<number|null>(null);
 const activeButton=useRef<HTMLButtonElement|null>(null);

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

  document.addEventListener("pointerdown",onPointer,true);
  document.addEventListener("submit",onSubmit,true);
  window.addEventListener("shop:tag-search",onSearch);
  window.addEventListener("discover:search",onSearch);
  window.addEventListener("ynot:open-deals",onSearch);
  window.addEventListener("ynot:open-saves",onSearch);
  window.addEventListener("ynot:open-circle",onSearch);
  window.addEventListener("ynot:open-auth",onSearch);
  window.addEventListener("ynot:open-partner",onSearch);

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
  };
 },[]);

 const active=home&&!dismissed;
 const subcategories=activeCategory?SUBCATEGORIES[activeCategory]||[]:[];

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
