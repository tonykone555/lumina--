"use client";
import {useEffect,useRef} from "react";

export default function UnlimitedShopResults(){
 const lastRequest=useRef(0);
 useEffect(()=>{
  let timer:number|undefined;
  const requestMore=()=>{
   const now=Date.now();
   if(now-lastRequest.current<650)return;
   const products=document.querySelectorAll(".lv4-product");
   if(!products.length)return;
   const intent=document.querySelector<HTMLButtonElement>(".lv4-intent");
   if(!intent||document.querySelector(".lv4-category-status"))return;
   const doc=document.documentElement;
   const nearBottom=window.scrollY+window.innerHeight>=doc.scrollHeight-Math.max(700,window.innerHeight*1.5);
   const last=products[products.length-1] as HTMLElement|null;
   const lastRect=last?.getBoundingClientRect();
   const sparse=products.length<24||Boolean(lastRect&&lastRect.bottom<window.innerHeight*1.35);
   if(!nearBottom&&!sparse)return;
   lastRequest.current=now;
   intent.click();
  };
  const schedule=()=>{if(timer)window.clearTimeout(timer);timer=window.setTimeout(requestMore,90)};
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{subtree:true,childList:true});
  window.addEventListener("scroll",schedule,{passive:true});
  window.addEventListener("wheel",schedule,{passive:true});
  window.addEventListener("touchmove",schedule,{passive:true});
  timer=window.setTimeout(requestMore,350);
  return()=>{observer.disconnect();if(timer)window.clearTimeout(timer);window.removeEventListener("scroll",schedule);window.removeEventListener("wheel",schedule);window.removeEventListener("touchmove",schedule)};
 },[]);
 return null;
}
