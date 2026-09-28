"use client";
import {useEffect} from "react";

export default function RoomPhotoBackdrop(){
  useEffect(()=>{
    const style=document.createElement("style");
    style.textContent=`
      .yr-camera{position:relative;isolation:isolate;background:transparent!important}
      .yr-photo{position:relative;z-index:2;overflow:hidden}
      .yr-photo>img{position:relative;z-index:2}
      .yr-screen-photo-backdrop{position:fixed;inset:0;z-index:-1;background-position:center;background-size:cover;background-repeat:no-repeat;filter:blur(48px) saturate(115%);opacity:.42;transform:scale(1.14);pointer-events:none}
      .yr-screen-photo-backdrop:after{content:"";position:absolute;inset:0;background:rgba(8,9,9,.34)}
    `;
    document.head.appendChild(style);
    const sync=()=>{
      const photo=document.querySelector<HTMLElement>(".yr-photo");
      const img=photo?.querySelector<HTMLImageElement>(":scope > img");
      if(!photo||!img?.src)return;
      photo.querySelector(".yr-photo-backdrop")?.remove();
      let bg=document.querySelector<HTMLElement>(".yr-screen-photo-backdrop");
      if(!bg){bg=document.createElement("div");bg.className="yr-screen-photo-backdrop";(document.querySelector<HTMLElement>(".yr-camera")||document.body).prepend(bg)}
      bg.style.backgroundImage=`url("${img.src.replace(/"/g,"%22")}")`;
    };
    const observer=new MutationObserver(sync);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["src"]});
    sync();
    return()=>{observer.disconnect();style.remove();document.querySelector(".yr-screen-photo-backdrop")?.remove()};
  },[]);
  return null;
}
