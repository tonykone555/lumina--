"use client";

import {useEffect} from "react";

export default function DesktopDetailStepper(){
 useEffect(()=>{
  const clean=()=>{
   document.querySelectorAll('.ynot-detail-side,.ynot-final-save-heart').forEach(node=>node.remove());
   document.querySelectorAll('.lv4-detail>.lv4-close,.lv4-detail>button[aria-label="Close product"],.lv4-detail .lv4-save-action,.lv4-detail .ynot-save-action,.lv4-detail .ynot-detail-heart,.lv4-detail>[class*="heart"],.lv4-detail>[class*="save"]:not(.lv4-bag)').forEach(node=>node.remove());
  };
  clean();
  const observer=new MutationObserver(clean);
  observer.observe(document.body,{subtree:true,childList:true});
  return()=>observer.disconnect();
 },[]);
 return <style jsx global>{`
  .ynot-detail-side,.ynot-final-save-heart,.lv4-detail>.lv4-close,.lv4-detail>button[aria-label="Close product"],.lv4-detail .lv4-save-action,.lv4-detail .ynot-save-action,.lv4-detail .ynot-detail-heart,.lv4-detail>[class*="heart"],.lv4-detail>[class*="save"]:not(.lv4-bag){display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
  .lv4-mobile-floating-close{display:grid!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
 `}</style>;
}
