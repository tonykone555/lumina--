"use client";
import {useEffect} from "react";

export default function RoomExitToWorld(){
 useEffect(()=>{
  const onClick=(event:MouseEvent)=>{
   const target=event.target as Element|null;
   const exit=target?.closest<HTMLAnchorElement>('.yr-head a[href="/"]');
   if(!exit)return;
   event.preventDefault();
   event.stopPropagation();
   try{sessionStorage.setItem("ynot-room-world-handoff","1")}catch{}
   window.location.assign("/?q=furniture&from=room");
  };
  document.addEventListener("click",onClick,true);
  return()=>document.removeEventListener("click",onClick,true);
 },[]);
 return null;
}
