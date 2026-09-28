"use client";
import {useEffect} from "react";

export default function RoomScanLine(){
 useEffect(()=>{
  const style=document.createElement("style");
  style.dataset.ynotRoomScanLine="1";
  style.textContent=`
    .yr-photo{overflow:hidden}
    .yr-photo::after{content:"";position:absolute;z-index:24;left:5%;right:5%;top:7%;height:1px;pointer-events:none;opacity:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.38) 12%,rgba(255,255,255,.95) 50%,rgba(255,255,255,.38) 88%,transparent);box-shadow:0 0 8px rgba(255,255,255,.32),0 0 18px rgba(255,255,255,.12)}
    .yr-photo:has(.animate-spin)::after{opacity:.72;animation:ynotRoomScan 2.35s ease-in-out infinite alternate}
    @keyframes ynotRoomScan{0%{top:10%}100%{top:88%}}
    @media (prefers-reduced-motion:reduce){.yr-photo:has(.animate-spin)::after{animation:none;top:50%}}
  `;
  document.head.appendChild(style);
  return()=>style.remove();
 },[]);
 return null;
}
