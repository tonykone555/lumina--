"use client";

import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";

/**
 * Visual continuity at the edges of full-screen browsing pages.
 * The blurred image follows the first prominently visible catalogue image,
 * instead of falling back to a flat black strip while scrolling.
 * Browser-owned Safari controls remain under iOS control.
 */
const PAGE_IMAGE_SELECTORS=[
 ".worlds .worldGrid .world img",
 ".page .detail .hero img",
 ".page .products>button img",
 ".page .grid .card img",
 ".ynot-app-shell .ynot-pv2-gallery img",
 ".ynot-app-shell .lv4-detail img",
 ".ynot-app-shell .ynot-studio-home-entry img",
 ".ynot-app-shell img"
];
function source(){
 const visible: Array<{src:string;distance:number;area:number}>=[];
 for(const selector of PAGE_IMAGE_SELECTORS){
  const images=document.querySelectorAll<HTMLImageElement>(selector);
  for(const img of Array.from(images).slice(0,42)){
   const r=img.getBoundingClientRect();
   if(r.width<95||r.height<95||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)continue;
   const src=img.currentSrc||img.src;
   if(!/^https?:\/\//.test(src))continue;
   const topDistance=Math.abs(Math.max(r.top,0)-Math.max(0,innerHeight*.2));
   const area=Math.min(r.width* r.height,1e6);
   visible.push({src,distance:topDistance,area});
  }
  if(visible.length)break;
 }
 visible.sort((a,b)=>a.distance-b.distance||b.area-a.area);
 return visible[0]?.src||"";
}
export default function SeamlessPageEdges(){
 const pathname=usePathname();
 const active=pathname==="/"||pathname==="/worlds"||(pathname.startsWith("/worlds/")&&!pathname.startsWith("/worlds/studio")&&!pathname.includes("/product/"));
 const [image,setImage]=useState("");
 useEffect(()=>{
  if(!active){setImage("");return}
  let raf=0,timeout=0;
  const update=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const next=source();if(next)setImage(v=>v===next?v:next)})};
  const onScroll=()=>{clearTimeout(timeout);timeout=window.setTimeout(update,110)};
  const observer=new MutationObserver(()=>{clearTimeout(timeout);timeout=window.setTimeout(update,240)});
  observer.observe(document.body,{subtree:true,childList:true,attributes:false});
  window.addEventListener("scroll",onScroll,{passive:true});
  window.addEventListener("resize",update,{passive:true});
  update();
  return()=>{observer.disconnect();window.removeEventListener("scroll",onScroll);window.removeEventListener("resize",update);if(raf)cancelAnimationFrame(raf);clearTimeout(timeout)};
 },[pathname,active]);
 useEffect(()=>{
  if(!active)return;
  let meta=document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"][data-ynot-edge="true"]');
  if(!meta){meta=document.createElement("meta");meta.name="theme-color";meta.dataset.ynotEdge="true";document.head.appendChild(meta)}
  meta.content="#282623";
  return()=>{meta?.remove()};
 },[active]);
 if(!active||!image)return null;
 return <div className="ynot-page-edge-fill" aria-hidden="true" style={{backgroundImage:`url("${image.replaceAll('"',"%22")}")`}}>
  <style jsx global>{`
   .ynot-page-edge-fill{display:none}
   @media(max-width:800px){
    .ynot-page-edge-fill{
      display:block;position:fixed;inset:-34px;z-index:100;
      pointer-events:none;user-select:none;background-position:center 30%;background-size:cover;
      filter:blur(29px) brightness(.72) saturate(.8);
      -webkit-mask-image:linear-gradient(to bottom,#000 0, #000 11%,transparent 18%,transparent 87%,#000 97%,#000 100%);
      mask-image:linear-gradient(to bottom,#000 0, #000 11%,transparent 18%,transparent 87%,#000 97%,#000 100%);
      opacity:.94;transition:background-image .3s ease;
    }
    body:has(.ynot-pv2-backdrop) .ynot-page-edge-fill,
    body:has(.lv4-detail-backdrop) .ynot-page-edge-fill,
    body:has(.ynot-selected) .ynot-page-edge-fill,
    body:has(.page .detail) .ynot-page-edge-fill{display:none}
   }
  `}</style>
 </div>;
}
