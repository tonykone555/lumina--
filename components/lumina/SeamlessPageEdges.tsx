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
  root.setAttribute("data-ynot-viewport-bleed","true");
  return()=>root.removeAttribute("data-ynot-viewport-bleed");
 },[pathname]);
 return <style jsx global>{`
 /* Use the same geometry as a YNOT product hero: full-bleed real content,
    with floating UI inset for the iPhone safe areas. No copied photo layer. */
 @media(max-width:800px){
  html[data-ynot-viewport-bleed="true"],
  html[data-ynot-viewport-bleed="true"] body{
   margin:0!important;padding:0!important;width:100%!important;
   min-height:100dvh!important;overscroll-behavior-x:none;
  }
  html[data-ynot-viewport-bleed="true"] body .worlds{
   position:relative!important;top:0!important;margin-top:0!important;
   margin-bottom:0!important;min-height:100dvh!important;
   padding:0!important;border:0!important;border-radius:0!important;
   isolation:isolate;
  }
  html[data-ynot-viewport-bleed="true"] .worlds .worldGrid{
   position:relative!important;
   margin-top:calc(-1 * (env(safe-area-inset-top,0px) + 120px))!important;
   padding-top:0!important;
   padding-bottom:calc(110px + env(safe-area-inset-bottom,0px))!important;
  }
  html[data-ynot-viewport-bleed="true"] body .page:has(>.grid),
  html[data-ynot-viewport-bleed="true"] body .page:has(>.albums){
   position:relative!important;top:0!important;margin:0!important;
   padding-top:0!important;padding-bottom:calc(105px + env(safe-area-inset-bottom,0px))!important;
   min-height:100dvh!important;border:0!important;border-radius:0!important;
  }
  html[data-ynot-viewport-bleed="true"] body .page:has(>.grid)>.grid,
  html[data-ynot-viewport-bleed="true"] body .page:has(>.albums)>.albums{
   margin-top:calc(-1 * env(safe-area-inset-top,0px))!important;
   padding-top:0!important;
  }
  html[data-ynot-viewport-bleed="true"] body .page:has(>.products){
   position:relative!important;top:0!important;margin:0!important;
   padding-top:0!important;
   min-height:100dvh!important;border:0!important;border-radius:0!important;
  }
  html[data-ynot-viewport-bleed="true"] body .page:has(>.products)>.products{
   padding-top:0!important;
  }
  /* Underlay the fixed search/nav on top of the first real row, not
     a black placeholder; let the page keep scrolling behind it. */
  html[data-ynot-viewport-bleed="true"] .worlds:before{display:none!important}
  html[data-ynot-viewport-bleed="true"] .worldsFloat,
  html[data-ynot-viewport-bleed="true"] .subFloat,
  html[data-ynot-viewport-bleed="true"] .productFloat{
   top:calc(8px + env(safe-area-inset-top,0px))!important;
  }
  html[data-ynot-viewport-bleed="true"] .studio-stage{
   position:fixed!important;inset:0!important;width:100dvw!important;height:100dvh!important;
   border:0!important;border-radius:0!important;
  }
  html[data-ynot-viewport-bleed="true"] .ynot-pv2-backdrop,
  html[data-ynot-viewport-bleed="true"] .yr-product-fullscreen{
   inset:0!important;border:0!important;border-radius:0!important;
  }
 }
 `}</style>;
}
