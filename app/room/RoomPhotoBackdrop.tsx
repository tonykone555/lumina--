"use client";
import {useEffect} from "react";

export default function RoomPhotoBackdrop(){
 useEffect(()=>{
  const style=document.createElement("style");
  style.textContent=`
    .yr{background:#171717!important}
    .yr:has(.yr-photo){background:rgba(7,8,8,.16)!important}
    .yr:before{background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
    .yr-wrap{position:relative;z-index:1}
    .yr-camera{position:relative;isolation:isolate;background:transparent!important}
    .yr-photo{position:relative;z-index:2;overflow:hidden}
    .yr-photo>img{position:relative;z-index:0}
    .yr-photo>button{z-index:4!important}
    .yr-screen-photo-backdrop{position:fixed;inset:-72px;z-index:69;background-position:center;background-size:cover;background-repeat:no-repeat;filter:blur(52px) saturate(112%);opacity:.72;transform:scale(1.12);pointer-events:none}
    .yr-screen-photo-backdrop:after{content:"";position:absolute;inset:0;background:rgba(8,9,9,.22)}
  `;
  document.head.appendChild(style);
  // Background lives OUTSIDE React's .yr tree, so React can add/remove the
  // live camera and scanned-photo nodes without removeChild reconciliation errors.
  let bg:HTMLDivElement|null=null;
  const sync=()=>{
   const img=document.querySelector<HTMLImageElement>(".yr-photo > img");
   if(!img?.src){if(bg)bg.style.display="none";return}
   if(!bg){bg=document.createElement("div");bg.className="yr-screen-photo-backdrop";document.body.appendChild(bg)}
   bg.style.display="block";
   const target=`url("${img.src.replace(/"/g,"%22")}")`;
   if(bg.style.backgroundImage!==target)bg.style.backgroundImage=target;
  };
  let frame=0;
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(sync)};
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["src"]});
  sync();
  return()=>{observer.disconnect();cancelAnimationFrame(frame);style.remove();bg?.remove()};
 },[]);
 return null;
}
