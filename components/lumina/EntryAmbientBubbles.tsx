"use client";

import {useEffect,useMemo,useState} from "react";

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

const COLOURS=[
 {key:"silver",label:"Silver",rgb:"205 211 214",glow:"245 248 250"},
 {key:"ice",label:"Ice",rgb:"121 190 255",glow:"198 230 255"},
 {key:"violet",label:"Violet",rgb:"163 129 255",glow:"221 209 255"},
 {key:"pink",label:"Pink",rgb:"255 118 186",glow:"255 207 231"},
 {key:"amber",label:"Amber",rgb:"255 173 82",glow:"255 224 183"},
 {key:"brown",label:"Brown",rgb:"139 92 62",glow:"215 177 145"},
 {key:"emerald",label:"Emerald",rgb:"77 215 164",glow:"191 255 232"},
 {key:"red",label:"Red",rgb:"255 92 92",glow:"255 204 204"},
] as const;

const QUICK_SEARCHES=[
 {label:"Fashion",query:"fashion clothes shoes accessories"},
 {label:"Home",query:"home furniture decor lighting"},
 {label:"Fitness",query:"fitness gym gear activewear"},
 {label:"Beauty",query:"beauty skincare hair care"},
 {label:"Tech",query:"tech gadgets audio accessories"},
 {label:"Gifts",query:"gift ideas trending products"},
] as const;

const DISMISS_SELECTOR=[
 ".lv4-category-bubble",
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

export default function EntryAmbientBubbles(){
 const[home,setHome]=useState(true);
 const[dismissed,setDismissed]=useState(false);
 const[paletteOpen,setPaletteOpen]=useState(false);
 const[quickQuery,setQuickQuery]=useState("");
 const[colourKey,setColourKey]=useState<(typeof COLOURS)[number]["key"]>("silver");
 const colour=useMemo(()=>COLOURS.find(item=>item.key===colourKey)||COLOURS[0],[colourKey]);

 useEffect(()=>{
  try{
   const saved=localStorage.getItem("ynot-entry-bubble-colour") as (typeof COLOURS)[number]["key"]|null;
   if(saved&&COLOURS.some(item=>item.key===saved))setColourKey(saved);
  }catch{}
 },[]);

 useEffect(()=>{
  let frame=0;
  const sync=()=>{
   frame=0;
   const landing=Boolean(document.querySelector(".lv4-shell.depth-worlds"));
   setHome(landing);
  };
  const queue=()=>{if(frame)return;frame=requestAnimationFrame(sync)};
  const observer=new MutationObserver(queue);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});

  const dismiss=()=>{setDismissed(true);setPaletteOpen(false)};
  const onPointer=(event:PointerEvent)=>{
   const target=event.target as Element|null;
   if(target?.closest(".ynot-entry-color-control"))return;
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
 const chooseColour=(key:(typeof COLOURS)[number]["key"])=>{
  setColourKey(key);
  try{localStorage.setItem("ynot-entry-bubble-colour",key)}catch{}
 };

 const runSearch=(value:string)=>{
  const clean=value.trim();
  if(clean.length<2)return;
  const input=document.querySelector<HTMLInputElement>(".ynot-bottom-search.shop input,.ynot-bottom-search input");
  const form=input?.closest("form");
  if(input){
   const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
   setter?.call(input,clean);
   input.dispatchEvent(new Event("input",{bubbles:true}));
  }
  setQuickQuery("");
  setPaletteOpen(false);
  if(form)form.requestSubmit();
  else window.dispatchEvent(new CustomEvent("shop:tag-search",{detail:{query:clean,tags:[]}}));
 };

 return <>
  <div
   className={`ynot-entry-ambient ${active?"active":""}`}
   aria-hidden="true"
   style={{
    "--ynot-bubble-rgb":colour.rgb,
    "--ynot-bubble-glow-rgb":colour.glow,
   } as React.CSSProperties}
  >
   {BUBBLES.map((bubble,index)=><i key={index} style={{
    left:bubble.x,
    top:bubble.y,
    width:bubble.s,
    height:bubble.s,
    "--ynot-float-duration":`${bubble.d}s`,
    "--ynot-float-delay":`${bubble.delay}s`,
    "--ynot-depth":bubble.depth,
    "--ynot-blur":`${bubble.blur}px`,
   } as React.CSSProperties}/>)}
  </div>

  {active&&<div
   className={`ynot-entry-color-control ${paletteOpen?"open":""}`}
   style={{
    "--ynot-bubble-rgb":colour.rgb,
    "--ynot-bubble-glow-rgb":colour.glow,
   } as React.CSSProperties}
  >
   {paletteOpen&&<div className="ynot-entry-quick-panel">
    <form className="ynot-entry-quick-search" onSubmit={event=>{event.preventDefault();runSearch(quickQuery)}}>
     <span aria-hidden="true">⌕</span>
     <input value={quickQuery} onChange={event=>setQuickQuery(event.target.value)} placeholder="What are you looking for?" autoFocus/>
     <button type="submit" disabled={quickQuery.trim().length<2}>Go</button>
    </form>
    <div className="ynot-entry-quick-chips" aria-label="Quick searches">
     {QUICK_SEARCHES.map(item=><button key={item.label} type="button" onClick={()=>runSearch(item.query)}>{item.label}</button>)}
    </div>
    <div className="ynot-entry-color-slider" role="listbox" aria-label="Bubble colour">
     {COLOURS.map(item=><button
      key={item.key}
      type="button"
      className={item.key===colourKey?"active":""}
      onClick={()=>chooseColour(item.key)}
      aria-label={item.label}
      aria-selected={item.key===colourKey}
      role="option"
      style={{"--swatch-rgb":item.rgb} as React.CSSProperties}
     />)}
    </div>
   </div>}
   <button
    type="button"
    className="ynot-entry-color-trigger"
    aria-label="Open quick search and bubble colour"
    aria-expanded={paletteOpen}
    onClick={()=>setPaletteOpen(open=>!open)}
   ><span/></button>
  </div>}
 </>;
}
