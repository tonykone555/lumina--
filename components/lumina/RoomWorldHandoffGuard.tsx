"use client";
import {useEffect} from "react";

export default function RoomWorldHandoffGuard(){
 useEffect(()=>{
  const openRoomFromDesktopDiscover=(event:MouseEvent)=>{
   if(window.innerWidth<701)return;
   const target=event.target as Element|null;
   const button=target?.closest<HTMLButtonElement>(".ynot-top-mode button");
   if(!button||button.textContent?.trim().toUpperCase()!=="DISCOVER")return;
   event.preventDefault();
   event.stopPropagation();
   event.stopImmediatePropagation();
   window.location.assign("/room");
  };
  document.addEventListener("click",openRoomFromDesktopDiscover,true);

  const params=new URLSearchParams(window.location.search);
  let handoff=params.get("from")==="room";
  try{handoff=handoff||sessionStorage.getItem("ynot-room-world-handoff")==="1"}catch{}
  if(!handoff)return()=>document.removeEventListener("click",openRoomFromDesktopDiscover,true);
  try{sessionStorage.removeItem("ynot-room-world-handoff")}catch{}
  const suppress=()=>{
   document.querySelectorAll<HTMLVideoElement>("video").forEach(video=>{
    let node:HTMLElement|null=video;
    while(node&&node!==document.body){
     const style=getComputedStyle(node);
     const rect=node.getBoundingClientRect();
     const isOverlay=(style.position==="fixed"||style.position==="absolute")&&rect.width>innerWidth*.45&&rect.height>innerHeight*.35;
     const isDialog=node.getAttribute("role")==="dialog"||node.getAttribute("aria-modal")==="true";
     if(isDialog||isOverlay){
      if(!node.closest(".lv4-detail,.ynot-unified-bag,.ynot-drawer")){video.pause();node.remove()}
      break;
     }
     node=node.parentElement;
    }
   });
  };
  suppress();
  const observer=new MutationObserver(suppress);observer.observe(document.body,{childList:true,subtree:true});
  const timer=window.setTimeout(()=>observer.disconnect(),5000);
  return()=>{document.removeEventListener("click",openRoomFromDesktopDiscover,true);observer.disconnect();window.clearTimeout(timer)};
 },[]);
 return null;
}
