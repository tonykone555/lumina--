"use client";
import {useEffect,useState} from "react";
import {Clapperboard,X} from "lucide-react";
import TikTokProductSlider from "@/components/worlds/TikTokProductSlider";

export default function TikTokWorldButton(){
 const [open,setOpen]=useState(false);
 useEffect(()=>{
  if(!open)return;
  const prev=document.body.style.overflow;
  document.body.style.overflow="hidden";
  const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};
  window.addEventListener("keydown",onKey);
  return()=>{document.body.style.overflow=prev;window.removeEventListener("keydown",onKey)};
 },[open]);
 return <>
  <button type="button" className="ynTikTokWorldEntry" onClick={()=>setOpen(true)} aria-label="Open TikTok product videos"><Clapperboard size={16}/> TikTok products</button>
  {open&&<div className="ynTikTokWorldOverlay" role="dialog" aria-modal="true" aria-label="TikTok product discoveries">
   <div className="ynTikTokWorldHead"><span>YNOT / TikTok products</span><button type="button" onClick={()=>setOpen(false)} aria-label="Close TikTok products"><X size={22}/></button></div>
   <div className="ynTikTokWorldContent"><TikTokProductSlider/></div>
  </div>}
  <style jsx global>{`
  .ynTikTokWorldEntry{position:fixed!important;z-index:2147483010!important;top:calc(118px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid #ffffff75;border-radius:999px;background:rgba(20,20,25,.78);color:#fff;padding:11px 17px;font-size:12px;font-weight:650;box-shadow:0 4px 20px #0007;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);cursor:pointer;white-space:nowrap}
  .ynTikTokWorldOverlay{position:fixed!important;inset:0!important;z-index:2147483400!important;background:#090909;color:#fff;display:flex;flex-direction:column;overflow:hidden}
  .ynTikTokWorldHead{display:flex;align-items:center;justify-content:space-between;padding:calc(12px + env(safe-area-inset-top)) 16px 12px;font-size:14px;font-weight:700;flex-shrink:0;border-bottom:1px solid #ffffff25}
  .ynTikTokWorldHead button{border:1px solid #ffffff45;border-radius:50%;background:#ffffff13;color:#fff;width:42px;height:42px;display:grid;place-items:center;cursor:pointer}
  .ynTikTokWorldContent{overflow-y:auto;flex:1;min-height:0}
  .ynTikTokWorldContent .ynTikTokShelf{padding-top:22px}
  @media(max-width:650px){.ynTikTokWorldEntry{top:calc(91px + env(safe-area-inset-top));padding:10px 15px;font-size:11px}}
  `}</style>
 </>;
}
