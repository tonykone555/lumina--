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
  @media(max-width:800px){
   html[data-ynot-viewport-bleed="true"]{
    margin:0!important;padding:0!important;
    width:100%!important;min-height:100%!important;
    -webkit-text-size-adjust:100%;
   }
   html[data-ynot-viewport-bleed="true"] body{
    margin:0!important;padding:0!important;
    width:100%!important;min-height:100dvh!important;
    overscroll-behavior-x:none;
   }
   /* The real masonry/cover tiles are the scrolling page. Do not introduce
      a fixed backdrop or a black spacer at the screen cutout. */
   html[data-ynot-viewport-bleed="true"] body .worlds{
    position:relative!important;
    width:100%!important;
    min-height:calc(100dvh + env(safe-area-inset-top,0px))!important;
    top:calc(-1 * env(safe-area-inset-top,0px))!important;
    margin-bottom:calc(-1 * env(safe-area-inset-top,0px))!important;
    border:0!important;border-radius:0!important;
   }
   html[data-ynot-viewport-bleed="true"] body .page:has(.grid),
   html[data-ynot-viewport-bleed="true"] body .page:has(.albums),
   html[data-ynot-viewport-bleed="true"] body .page:has(.products){
    position:relative!important;
    top:calc(-1 * env(safe-area-inset-top,0px))!important;
    min-height:calc(100dvh + env(safe-area-inset-top,0px))!important;
    padding-top:env(safe-area-inset-top,0px)!important;
    padding-bottom:calc(100px + env(safe-area-inset-bottom,0px))!important;
    margin-bottom:calc(-1 * env(safe-area-inset-top,0px))!important;
    border:0!important;border-radius:0!important;
   }
   /* Real cards scroll behind the navigation overlay. Keep their existing
      negative top positioning, masonry and interaction intact. */
   html[data-ynot-viewport-bleed="true"] .worldGrid,
   html[data-ynot-viewport-bleed="true"] .page .grid,
   html[data-ynot-viewport-bleed="true"] .page .albums,
   html[data-ynot-viewport-bleed="true"] .page .products{
    border-top:0!important;border-bottom:0!important;
   }
   /* Full-viewport experience for modal, Room, Studio and shop screens:
      child media itself fills the screen; browser controls are independent. */
   html[data-ynot-viewport-bleed="true"] .studio-stage,
   html[data-ynot-viewport-bleed="true"] .ynot-pv2-backdrop,
   html[data-ynot-viewport-bleed="true"] .ynot-story,
   html[data-ynot-viewport-bleed="true"] .yr-product-fullscreen{
    inset:0!important;
    border:0!important;border-radius:0!important;
    max-height:none!important;
   }
   /* Never create an additional decorative bar over content. */
   html[data-ynot-viewport-bleed="true"] .worlds:before{
    display:none!important;
   }
  }
 `}</style>;
}
