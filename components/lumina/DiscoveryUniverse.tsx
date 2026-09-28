"use client";

import {useEffect} from "react";

export default function DiscoveryUniverse(){
 useEffect(()=>{
  document.querySelector(".ynot-search-partner")?.remove();
  // Discover is an explicit entry into YNOT Room, so show the Room onboarding
  // even when the visitor has seen it on a previous visit.
  try{localStorage.removeItem("ynot-room-intro-seen-v3")}catch{}
  window.location.assign("/room");
 },[]);
 return <div aria-live="polite" style={{position:"fixed",inset:0,zIndex:60,display:"grid",placeItems:"center",background:"transparent",backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",color:"white",fontSize:12,letterSpacing:1}}>OPENING YNOT ROOM…</div>;
}
