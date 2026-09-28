"use client";
import {useEffect} from "react";

/**
 * Bridges both Room image entry paths (live shutter + photo upload) to the
 * existing QuickRoomExperience. Once either hidden image input receives a
 * File, QuickRoomExperience owns the preview, scan state and Gemini results,
 * so the live camera must stop and get out of the way.
 */
export default function RoomScanHandoff(){
 useEffect(()=>{
  const body=document.body;
  body.classList.remove("ynot-room-scan-handoff");

  const imageInputs=()=>Array.from(
   document.querySelectorAll<HTMLInputElement>('input[type="file"][accept*="image"]')
  );

  const stopLiveCamera=()=>{
   const video=document.querySelector<HTMLVideoElement>(".yr-live-camera video");
   const media=video?.srcObject;
   if(media instanceof MediaStream){
    try{media.getTracks().forEach(track=>track.stop())}catch{}
   }
   if(video){try{video.srcObject=null}catch{}}
  };

  const onChange=(event:Event)=>{
   const input=event.target as HTMLInputElement|null;
   if(!input?.files?.length)return;
   stopLiveCamera();
   requestAnimationFrame(()=>body.classList.add("ynot-room-scan-handoff"));
  };

  const inputs=imageInputs();
  inputs.forEach(input=>input.addEventListener("change",onChange));
  return()=>{
   inputs.forEach(input=>input.removeEventListener("change",onChange));
   body.classList.remove("ynot-room-scan-handoff");
  };
 },[]);

 return <style jsx global>{`
  body.ynot-room-scan-handoff .yr-live-camera{display:none!important}
 `}</style>;
}
