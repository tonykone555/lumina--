"use client";

import {useEffect} from "react";

export default function DesktopDetailStepper(){
 useEffect(()=>{
  const clean=()=>{
   document.querySelectorAll('.ynot-detail-side,.ynot-final-save-heart').forEach(node=>node.remove());
   if(window.innerWidth<900){
    // Remove only controls rendered inside the product card. Keep the working floating/outside X.
    document.querySelectorAll('.lv4-detail>.lv4-close,.lv4-detail>button[aria-label="Close product"],.lv4-detail .lv4-save-action,.lv4-detail .ynot-save-action,.lv4-detail .ynot-detail-heart,.lv4-detail>[class*="heart"],.lv4-detail>[class*="save"]:not(.lv4-bag)').forEach(node=>node.remove());
   }
  };
  clean();
  const observer=new MutationObserver(clean);
  observer.observe(document.body,{subtree:true,childList:true});
  window.addEventListener('resize',clean,{passive:true});
  return()=>{observer.disconnect();window.removeEventListener('resize',clean)};
 },[]);
 return <style jsx global>{`
  .ynot-detail-side,.ynot-final-save-heart{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
  .lv4-detail>.lv4-close{position:absolute!important;top:12px!important;right:12px!important;left:auto!important;width:28px!important;height:28px!important;min-width:28px!important;min-height:28px!important;max-width:28px!important;max-height:28px!important;padding:0!important;margin:0!important;display:grid!important;place-items:center!important;border-radius:999px!important;font-size:15px!important;line-height:1!important;pointer-events:auto!important}
  @media(max-width:899px){
   .lv4-detail>.lv4-close,.lv4-detail>button[aria-label="Close product"],.lv4-detail .lv4-save-action,.lv4-detail .ynot-save-action,.lv4-detail .ynot-detail-heart,.lv4-detail>[class*="heart"],.lv4-detail>[class*="save"]:not(.lv4-bag){display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
   .lv4-mobile-floating-close{display:grid!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
  }
 `}</style>;
}
