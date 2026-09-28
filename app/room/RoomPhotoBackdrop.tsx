"use client";
import {useEffect} from "react";

export default function RoomPhotoBackdrop(){
  useEffect(()=>{
    const style=document.createElement("style");
    style.textContent=`
      .yr-camera{isolation:isolate}
      .yr-photo{position:relative;z-index:1}
      .yr-photo-backdrop{position:absolute;inset:-42px;z-index:-1;background-position:center;background-size:cover;background-repeat:no-repeat;filter:blur(32px) saturate(115%);opacity:.48;transform:scale(1.12);pointer-events:none}
      .yr-photo-backdrop:after{content:"";position:absolute;inset:0;background:rgba(8,9,9,.18)}
      .yr-photo>img{position:relative;z-index:1}
    `;
    document.head.appendChild(style);
    const sync=()=>{
      const photo=document.querySelector<HTMLElement>(".yr-photo");
      const img=photo?.querySelector<HTMLImageElement>(":scope > img");
      if(!photo||!img?.src)return;
      let bg=photo.querySelector<HTMLElement>(".yr-photo-backdrop");
      if(!bg){bg=document.createElement("div");bg.className="yr-photo-backdrop";photo.prepend(bg)}
      bg.style.backgroundImage=`url("${img.src.replace(/"/g,"%22")}")`;
    };
    const observer=new MutationObserver(sync);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["src"]});
    sync();
    return()=>{observer.disconnect();style.remove()};
  },[]);
  return null;
}
