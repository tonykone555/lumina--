"use client";

import {useEffect} from "react";

export default function DesktopDetailStepper(){
 useEffect(()=>{
  const clean=()=>{
   document.querySelectorAll('.ynot-detail-side,.ynot-final-save-heart').forEach(node=>node.remove());
  };
  clean();
  const observer=new MutationObserver(clean);
  observer.observe(document.body,{subtree:true,childList:true});
  return()=>observer.disconnect();
 },[]);
 return <style jsx global>{`
  .ynot-detail-side,.ynot-final-save-heart{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
  .lv4-detail>.lv4-close{position:absolute!important;top:12px!important;right:12px!important;left:auto!important;width:28px!important;height:28px!important;min-width:28px!important;min-height:28px!important;max-width:28px!important;max-height:28px!important;padding:0!important;margin:0!important;display:grid!important;place-items:center!important;border-radius:999px!important;font-size:15px!important;line-height:1!important;pointer-events:auto!important}
  @media(max-width:899px){.lv4-detail>.lv4-close{top:9px!important;right:9px!important;width:26px!important;height:26px!important;min-width:26px!important;min-height:26px!important;max-width:26px!important;max-height:26px!important;font-size:14px!important}}
 `}</style>;
}
