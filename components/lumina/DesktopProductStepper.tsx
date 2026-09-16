"use client";

import {useEffect} from "react";

const norm=(value:string)=>String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();

function parseCamera(stage:HTMLElement){
 const raw=stage.style.transform||getComputedStyle(stage).transform||"";
 const direct=raw.match(/translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)\s*scale\(\s*([\d.]+)\s*\)/i);
 if(direct)return{panX:Number(direct[1]),panY:Number(direct[2]),zoom:Number(direct[3])||1};
 const matrix=raw.match(/matrix\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/i);
 if(matrix)return{panX:Number(matrix[5]),panY:Number(matrix[6]),zoom:Math.max(.001,Math.abs(Number(matrix[1])))};
 return{panX:0,panY:0,zoom:1};
}

export default function DesktopProductStepper():null{
 useEffect(()=>{
  let frame=0;
  let prev:HTMLButtonElement|null=null;
  let next:HTMLButtonElement|null=null;

  const cards=()=>[...document.querySelectorAll<HTMLElement>(".lv4-stage > .lv4-product")];
  const titleOf=(card:HTMLElement)=>norm(card.querySelector(".lv4-product-tooltip b,.lv4-orbmeta b")?.textContent||card.getAttribute("aria-label")||"");
  const activeTitle=()=>norm(document.querySelector(".lv4-detail .lv4-detailcopy h2")?.textContent||"");
  const drawerOpen=()=>Boolean(document.querySelector(".ynot-drawer.open"));

  const moveProduct=(direction:number)=>{
    const list=cards();
    if(list.length<2)return;
    const current=activeTitle();
    let index=list.findIndex(card=>titleOf(card)===current);
    if(index<0)index=0;
    const target=list[(index+direction+list.length)%list.length];
    if(!target)return;
    document.querySelector<HTMLButtonElement>(".lv4-detail .lv4-close")?.click();
    requestAnimationFrame(()=>requestAnimationFrame(()=>target.click()));
  };

  const panBoard=(direction:number)=>{
    const stage=document.querySelector<HTMLElement>(".lv4-stage");
    if(!stage)return;
    const camera=parseCamera(stage);
    const amount=Math.max(440,window.innerWidth*.46);
    const panX=camera.panX-direction*amount;
    stage.style.setProperty("transform",`translate(${panX}px, ${camera.panY}px) scale(${camera.zoom})`,`important`);
    stage.style.setProperty("transition","transform .34s cubic-bezier(.22,.86,.24,1)","important");
    window.setTimeout(()=>stage.style.removeProperty("transition"),380);
    window.dispatchEvent(new Event("pointerup"));
    window.dispatchEvent(new CustomEvent("ynot:world-focus",{detail:{direction:direction>0?"right":"left",panX}}));
  };

  const activate=(direction:number)=>{
    if(drawerOpen())return;
    if(document.querySelector(".lv4-detail"))moveProduct(direction);
    else panBoard(direction);
  };

  const make=(cls:string,label:string,direction:number)=>{
    const button=document.createElement("button");
    button.type="button";
    button.className=cls;
    button.setAttribute("aria-label",label);
    button.innerHTML="<span></span>";
    button.addEventListener("click",event=>{
      event.preventDefault();
      event.stopPropagation();
      activate(direction);
    });
    document.body.appendChild(button);
    return button;
  };

  prev=make("ynot-world-desktop-prev","Move left / previous product",-1);
  next=make("ynot-world-desktop-next","Move right / next product",1);

  const sync=()=>{
    frame=0;
    const desktop=window.innerWidth>=900;
    const detail=Boolean(document.querySelector(".lv4-detail"));
    const drawer=drawerOpen();
    const board=desktop&&!detail&&!drawer&&cards().length>0;
    const show=desktop&&!drawer&&(detail?cards().length>1:board);
    prev?.classList.toggle("visible",show);
    next?.classList.toggle("visible",show);
    prev?.classList.toggle("board-mode",board);
    next?.classList.toggle("board-mode",board);
    if(prev)prev.disabled=!show;
    if(next)next.disabled=!show;
  };
  const queue=()=>{
    if(frame)cancelAnimationFrame(frame);
    frame=requestAnimationFrame(sync);
  };
  const observer=new MutationObserver(queue);
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class"]});
  window.addEventListener("resize",queue);
  queue();
  return()=>{
    observer.disconnect();
    if(frame)cancelAnimationFrame(frame);
    window.removeEventListener("resize",queue);
    prev?.remove();
    next?.remove();
  };
 },[]);
 return null;
}
