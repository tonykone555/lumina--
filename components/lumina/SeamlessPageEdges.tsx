"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";

/**
 * All YNOT pages share one edge-to-edge viewport policy. No fake image,
 * no copied blurred picture and no fixed overlay covering product cards.
 * Scrolling content moves through the actual viewport including the
 * site-controllable iOS safe areas.
 */
export default function SeamlessPageEdges(){
 const pathname=usePathname();
 useEffect(()=>{
  const root=document.documentElement;
  const browsing=pathname==="/worlds"||(pathname.startsWith("/worlds/")&&!pathname.startsWith("/worlds/studio"));
  root.setAttribute("data-ynot-viewport-bleed","true");
  if(browsing){
   root.setAttribute("data-ynot-document-scroll","true");
   // Leave scrolling to the user and Safari: no artificial scroll offset.
   return()=>{root.removeAttribute("data-ynot-document-scroll");root.removeAttribute("data-ynot-viewport-bleed")};
  }
  return()=>root.removeAttribute("data-ynot-viewport-bleed");
 },[pathname]);
 return <style jsx global>{`
 /* No top/bottom fences on YNOT's scrolling documents. Page content itself
    reaches the viewport edge. Navigation floats above the scrolling cards. */
 @media(max-width:800px){
  html[data-ynot-viewport-bleed="true"],
  html[data-ynot-viewport-bleed="true"] body{
   width:100%!important;height:auto!important;min-height:100%!important;
   margin:0!important;padding:0!important;
   overflow-x:clip!important;
  }
  html[data-ynot-document-scroll="true"],
  html[data-ynot-document-scroll="true"] body{
   overflow-y:auto!important;overscroll-behavior-y:auto!important;
   -webkit-overflow-scrolling:touch!important;
  }
  /* Do not move the whole page out of flow or reserve blank safe-area bands. */
  html[data-ynot-document-scroll="true"] body .worlds,
  html[data-ynot-document-scroll="true"] body .page:has(>.grid),
  html[data-ynot-document-scroll="true"] body .page:has(>.albums),
  html[data-ynot-document-scroll="true"] body .page:has(>.products){
   position:relative!important;top:auto!important;bottom:auto!important;
   height:auto!important;max-height:none!important;min-height:100dvh!important;
   margin-top:0!important;margin-bottom:0!important;
   padding-top:0!important;padding-bottom:0!important;
   border:0!important;border-radius:0!important;
   overflow:visible!important;touch-action:pan-y;
  }
  /* Actual scrollable masonry begins flush at the top, not behind a reserved
     56/64/110/170px zone. */
  html[data-ynot-document-scroll="true"] body .worlds .worldGrid,
  html[data-ynot-document-scroll="true"] body .page:has(>.grid)>.grid,
  html[data-ynot-document-scroll="true"] body .page:has(>.albums)>.albums,
  html[data-ynot-document-scroll="true"] body .page:has(>.products)>.products{
   position:relative!important;
   top:auto!important;bottom:auto!important;
   margin-top:0!important;margin-bottom:0!important;
   padding-top:0!important;padding-bottom:0!important;
   border-top:0!important;border-bottom:0!important;
   transform:none!important;
  }
  html[data-ynot-document-scroll="true"] body .page:has(>.products)>.chips{
   top:0!important;
  }
  html[data-ynot-document-scroll="true"] body .worlds:before{display:none!important}
  /* Keep only the interactive controls inset. The tiles themselves have no
     safe-area padding or opaque wrapper. */
  html[data-ynot-document-scroll="true"] .worldsFloat,
  html[data-ynot-document-scroll="true"] .subFloat,
  html[data-ynot-document-scroll="true"] .productFloat{
   top:calc(7px + env(safe-area-inset-top,0px))!important;
  }
  html[data-ynot-viewport-bleed="true"] .studio-stage,
  html[data-ynot-viewport-bleed="true"] .ynot-pv2-backdrop,
  html[data-ynot-viewport-bleed="true"] .yr-product-fullscreen{
   inset:0!important;border:0!important;border-radius:0!important;
  }
 }
 `}</style>;
}
