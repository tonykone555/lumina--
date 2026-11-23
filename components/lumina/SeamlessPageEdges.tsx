"use client";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";

/**
 * Dynamic photo bleed for iPhone web browsing. Uses a duplicate of the currently
 * visible image for the page background, even above the first masonry row and
 * underneath the bottom edge. The regular cards/images are not cropped.
 */
const GROUPS=[
 ".worlds .worldGrid .world img",
 ".page .detail .hero img",
 ".page .products > button img",
 ".page .albums .album img",
 ".page .grid .card img",
 ".ynot-app-shell .ynot-studio-home-entry img",
 ".ynot-app-shell .lv4-detail img",
 ".ynot-app-shell .ynot-pv2 img",
 ".ynot-app-shell img"
];
function pickImage():string{
 const viewportHeight=window.visualViewport?.height||window.innerHeight;
 const topY=window.visualViewport?.offsetTop||0;
 for(const group of GROUPS){
  let best:{url:string;weight:number}|null=null;
  const images=document.querySelectorAll<HTMLImageElement>(group);
  for(const img of Array.from(images).slice(0,90)){
   const b=img.getBoundingClientRect(),url=img.currentSrc||img.src;
   if(!/^https?:\/\//.test(url)||b.width<85||b.height<85||b.bottom<topY-5||b.top>topY+viewportHeight+10)continue;
   // Use the largest prominent product/cover image near the visible top,
   // rather than a small thumbnail or site icon.
   const topDistance=Math.abs(Math.max(topY,b.top)-(topY+viewportHeight*.23));
   const visible=Math.min(b.bottom,topY+viewportHeight)-Math.max(b.top,topY);
   const weight=Math.min(b.width,window.innerWidth)*Math.max(0,visible)/1000-topDistance*.18;
   if(!best||weight>best.weight)best={url,weight};
  }
  if(best)return best.url;
 }
 return "";
}
export default function SeamlessPageEdges(){
 const path=usePathname();
 const enabled=path==="/"||path==="/worlds"||(path.startsWith("/worlds/")&&!path.startsWith("/worlds/studio"));
 const [image,setImage]=useState("");
 useEffect(()=>{
  if(!enabled){setImage("");return;}
  let timer=0,frame=0,live=true;
  const update=()=>{
   if(!live||frame)return;
   frame=requestAnimationFrame(()=>{
    frame=0;const url=pickImage();
    if(url)setImage(old=>old===url?old:url);
   });
  };
  const scheduled=()=>{clearTimeout(timer);timer=window.setTimeout(update,75);};
  const observer=new MutationObserver(scheduled);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["src","class","style"]});
  window.addEventListener("scroll",scheduled,{passive:true});
  window.addEventListener("resize",scheduled,{passive:true});
  window.visualViewport?.addEventListener("resize",scheduled);
  window.setTimeout(update,70);
  return()=>{live=false;observer.disconnect();window.removeEventListener("scroll",scheduled);window.removeEventListener("resize",scheduled);window.visualViewport?.removeEventListener("resize",scheduled);clearTimeout(timer);if(frame)cancelAnimationFrame(frame)};
 },[path,enabled]);
 useEffect(()=>{
  const root=document.documentElement;
  if(!enabled||!image){root.style.removeProperty("--ynot-immersive-photo");root.removeAttribute("data-ynot-immersive");return;}
  root.style.setProperty("--ynot-immersive-photo",`url("${image.replaceAll('"',"%22")}")`);
  root.setAttribute("data-ynot-immersive","on");
  return()=>{root.style.removeProperty("--ynot-immersive-photo");root.removeAttribute("data-ynot-immersive")};
 },[image,enabled]);
 if(!enabled)return null;
 return <style jsx global>{`
  /* The live photo is the full page background, not a strip laid over content.
     On pages with aggressive black !important declarations, this override wins. */
  @media(max-width:800px){
   html[data-ynot-immersive="on"],html[data-ynot-immersive="on"] body{
    background-image:var(--ynot-immersive-photo)!important;
    background-position:center 32%!important;
    background-size:cover!important;
    background-attachment:fixed!important;
    background-repeat:no-repeat!important;
   }
   html[data-ynot-immersive="on"] body .worlds,
   html[data-ynot-immersive="on"] body .page:has(.grid),
   html[data-ynot-immersive="on"] body .page:has(.albums),
   html[data-ynot-immersive="on"] body .page:has(.products){
    background-color:transparent!important;
   }
   /* A tinted, enlarged continuation sits BEHIND categories while scrolling.
      The sharp product photographs remain above it at their natural sizing. */
   html[data-ynot-immersive="on"] body .worlds:before{
    background-image:linear-gradient(180deg,rgba(0,0,0,.4),rgba(0,0,0,.1)),var(--ynot-immersive-photo)!important;
    background-position:center!important;background-size:cover!important;
    top:calc(-120px - env(safe-area-inset-top,0px))!important;
    height:calc(230px + env(safe-area-inset-top,0px))!important;
    filter:blur(20px)!important;
   }
   html[data-ynot-immersive="on"] body .page:has(.grid):before,
   html[data-ynot-immersive="on"] body .page:has(.albums):before,
   html[data-ynot-immersive="on"] body .page:has(.products):before{
    content:"";position:fixed;top:-100px;left:-45px;right:-45px;height:calc(200px + env(safe-area-inset-top,0px));
    background-image:linear-gradient(#0005,#0002),var(--ynot-immersive-photo);
    background-size:cover;background-position:center;filter:blur(26px);
    pointer-events:none;z-index:0;
   }
   html[data-ynot-immersive="on"] body .page:has(.grid)>.grid,
   html[data-ynot-immersive="on"] body .page:has(.albums)>.albums,
   html[data-ynot-immersive="on"] body .page:has(.products)>.products{position:relative;z-index:1}
  }
 `}</style>;
}
