"use client";

import {useEffect} from "react";

export default function YnotDealsAutoOpen(){
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  if(params.get("deals")!=="1")return;
  let tries=0;
  const open=()=>{
   const button=document.querySelector<HTMLButtonElement>(".ynot-peek");
   if(button){button.click();return}
   if(tries++<30)window.setTimeout(open,100);
  };
  open();
 },[]);
 return null;
}
