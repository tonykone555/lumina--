"use client";

import {useEffect} from "react";

export default function RoomReturnLightMode(){
 useEffect(()=>{
  let fromRoom=false;
  try{fromRoom=sessionStorage.getItem("ynot-room-return-light")==="1"}catch{}
  if(!fromRoom)return;
  try{sessionStorage.removeItem("ynot-room-return-light");localStorage.setItem("ynot-theme","light")}catch{}
  const root=document.documentElement;
  root.dataset.theme="light";
  root.classList.remove("dark");
  root.classList.add("light");
  root.style.colorScheme="light";
  document.body.dataset.theme="light";
  document.body.classList.remove("dark");
  document.body.classList.add("light");
  window.dispatchEvent(new CustomEvent("ynot:theme-changed",{detail:{theme:"light",source:"room-return"}}));
 },[]);
 return null;
}
