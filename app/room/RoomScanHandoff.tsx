"use client";
import {useEffect} from "react";

/**
 * Bridges the full-screen live camera to the existing QuickRoomExperience.
 * QuickRoomExperience owns the actual analysis/loading/results UI. As soon as
 * its camera input receives the captured File, reveal that UI instead of
 * leaving RoomLiveCamera's local "Scanning" overlay above it.
 */
export default function RoomScanHandoff(){
 useEffect(()=>{
  const body=document.body;
  body.classList.remove("ynot-room-scan-handoff");
  const findCameraInput=()=>Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"][accept*="image"]')).find(i=>i.hasAttribute("capture"));
  const onChange=(event:Event)=>{
   const input=event.target as HTMLInputElement|null;
   if(!input?.files?.length)return;
   requestAnimationFrame(()=>body.classList.add("ynot-room-scan-handoff"));
  };
  const input=findCameraInput();
  input?.addEventListener("change",onChange);
  return()=>{input?.removeEventListener("change",onChange);body.classList.remove("ynot-room-scan-handoff")};
 },[]);
 return <style jsx global>{`
  body.ynot-room-scan-handoff .yr-live-camera{display:none!important}
 `}</style>;
}
