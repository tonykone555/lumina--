"use client";
import {useEffect} from "react";

export default function RoomPhotoBackdrop(){
  useEffect(()=>{
    const style=document.createElement("style");
    style.textContent=`
      .yr{background:rgba(7,8,8,.16)!important}
      .yr:before{background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
      .yr-wrap{position:relative;z-index:1}
      .yr-camera{position:relative;isolation:isolate;background:transparent!important}
      .yr-photo{position:relative;z-index:2;overflow:hidden}
      .yr-photo>img{position:relative;z-index:0}
      .yr-photo>button{z-index:4!important}
      .yr-screen-photo-backdrop{position:fixed;inset:-72px;z-index:0;background-position:center;background-size:cover;background-repeat:no-repeat;filter:blur(52px) saturate(112%);opacity:.72;transform:scale(1.12);pointer-events:none}
      .yr-screen-photo-backdrop:after{content:"";position:absolute;inset:0;background:rgba(8,9,9,.22)}
    `;
    document.head.appendChild(style);
    const sync=()=>{
      const root=document.querySelector<HTMLElement>(".yr");
      const photo=document.querySelector<HTMLElement>(".yr-photo");
      const img=photo?.querySelector<HTMLImageElement>(":scope > img");
      if(!root||!photo||!img?.src)return;
      photo.querySelector(".yr-photo-backdrop")?.remove();
      let bg=root.querySelector<HTMLElement>(":scope > .yr-screen-photo-backdrop");
      if(!bg){bg=document.createElement("div");bg.className="yr-screen-photo-backdrop";root.prepend(bg)}
      bg.style.backgroundImage=`url("${img.src.replace(/"/g,"%22")}")`;
    };
    const observer=new MutationObserver(sync);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["src"]});
    sync();
    return()=>{observer.disconnect();style.remove();document.querySelector(".yr-screen-photo-backdrop")?.remove()};
  },[]);
  return null;
}
