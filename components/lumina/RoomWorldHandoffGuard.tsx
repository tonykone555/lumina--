"use client";
import {useEffect} from "react";

export default function RoomWorldHandoffGuard(){
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  let handoff=params.get("from")==="room";
  try{handoff=handoff||sessionStorage.getItem("ynot-room-world-handoff")==="1"}catch{}
  if(!handoff)return;
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
  return()=>{observer.disconnect();window.clearTimeout(timer)};
 },[]);
 return null;
}
