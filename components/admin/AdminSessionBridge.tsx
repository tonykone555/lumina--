"use client";

import {useEffect} from "react";
import {authedFetch,readSession} from "@/lib/ynot/supabase-browser";

export default function AdminSessionBridge(){
 useEffect(()=>{
  let alive=true;
  const sync=async()=>{if(!readSession())return;try{await authedFetch("/api/admin/me",{cache:"no-store"})}catch{} };
  void sync();
  const onAuth=()=>{if(alive)void sync()};
  window.addEventListener("ynot:auth-changed",onAuth);
  const timer=window.setInterval(()=>{if(alive&&readSession())void sync()},15*60*1000);
  return()=>{alive=false;window.removeEventListener("ynot:auth-changed",onAuth);window.clearInterval(timer)};
 },[]);
 return null;
}
