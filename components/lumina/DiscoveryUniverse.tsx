"use client";

import {useEffect} from "react";

export default function DiscoveryUniverse(){
 useEffect(()=>{window.location.assign("/room")},[]);
 return <div aria-live="polite" style={{position:"fixed",inset:0,zIndex:60,display:"grid",placeItems:"center",background:"transparent",backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",color:"white",fontSize:12,letterSpacing:1}}>OPENING YNOT ROOM…</div>;
}
