"use client";
import {useEffect} from "react";

export default function RoomProductImageDots(){
 useEffect(()=>{
  const style=document.createElement("style");
  style.dataset.ynotRoomImageDots="1";
  style.textContent=`
   .yr-image-dots{height:22px;display:flex;align-items:center;justify-content:center;gap:7px;margin:1px 0 3px;pointer-events:none}
   .yr-image-dot{width:5px;height:5px;border-radius:999px;background:rgba(255,255,255,.34);box-shadow:0 0 0 1px rgba(0,0,0,.04);transition:width .2s ease,height .2s ease,background .2s ease,opacity .2s ease;opacity:.75}
   .yr-image-dot.is-active{width:9px;height:9px;background:rgba(255,255,255,.96);opacity:1}
  `;
  document.head.appendChild(style);
  const states=new WeakMap<HTMLImageElement,{src:string,index:number}>();
  const render=(img:HTMLImageElement,index:number)=>{
   let dots=img.nextElementSibling as HTMLElement|null;
   if(!dots?.classList.contains("yr-image-dots")){
    dots=document.createElement("div");dots.className="yr-image-dots";dots.setAttribute("aria-hidden","true");
    for(let i=0;i<4;i++){const dot=document.createElement("i");dot.className="yr-image-dot";dots.appendChild(dot)}
    img.insertAdjacentElement("afterend",dots);
   }
   [...dots.children].forEach((dot,i)=>dot.classList.toggle("is-active",i===index%4));
  };
  const attach=(img:HTMLImageElement)=>{
   if(img.dataset.ynotDotsBound==="1")return;
   img.dataset.ynotDotsBound="1";
   states.set(img,{src:img.currentSrc||img.src,index:0});render(img,0);
   const srcObserver=new MutationObserver(()=>{
    const state=states.get(img);if(!state)return;const src=img.currentSrc||img.src;
    if(src&&src!==state.src){state.src=src;state.index=(state.index+1)%4;render(img,state.index)}
   });
   srcObserver.observe(img,{attributes:true,attributeFilter:["src","srcset"]});
   img.addEventListener("load",()=>{
    const state=states.get(img);if(!state)return;const src=img.currentSrc||img.src;
    if(src&&src!==state.src){state.src=src;state.index=(state.index+1)%4;render(img,state.index)}
   });
  };
  const scan=()=>document.querySelectorAll<HTMLImageElement>(".yr-card-img").forEach(attach);
  const observer=new MutationObserver(scan);observer.observe(document.body,{subtree:true,childList:true});scan();
  return()=>{observer.disconnect();style.remove()};
 },[]);
 return null;
}
