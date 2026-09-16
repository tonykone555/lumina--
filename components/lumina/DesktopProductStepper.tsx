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
  let prev:HTMLButtonElement|null=null,next:HTMLButtonElement|null=null;
  let dealPrev:HTMLButtonElement|null=null,dealNext:HTMLButtonElement|null=null;

  const cards=()=>[...document.querySelectorAll<HTMLElement>(".lv4-stage > .lv4-product")];
  const dealCards=()=>[...document.querySelectorAll<HTMLElement>(".ynot-drawer.open .ynot-grid .ynot-orb")];
  const titleOf=(card:HTMLElement)=>norm(card.querySelector(".lv4-product-tooltip b,.lv4-orbmeta b")?.textContent||card.getAttribute("aria-label")||"");
  const dealTitleOf=(card:HTMLElement)=>norm(card.querySelector(".ynot-orb-copy b")?.textContent||card.getAttribute("aria-label")||"");
  const activeTitle=()=>norm(document.querySelector(".lv4-detail .lv4-detailcopy h2")?.textContent||"");
  const activeDealTitle=()=>norm(document.querySelector(".ynot-selected .ynot-selected-copy h3")?.textContent||"");
  const drawerOpen=()=>Boolean(document.querySelector(".ynot-drawer.open"));

  const warmDirection=(direction:number)=>{
    const list=cards(),ordered=direction>0?list:[...list].reverse();
    ordered.slice(0,100).forEach(card=>{const image=card.querySelector<HTMLImageElement>("img");if(!image)return;image.loading="eager";image.setAttribute("fetchpriority","high");void image.decode?.().catch(()=>{})});
  };

  const moveProduct=(direction:number)=>{
    const list=cards();if(list.length<2)return;
    const current=activeTitle();let index=list.findIndex(card=>titleOf(card)===current);if(index<0)index=0;
    const target=list[(index+direction+list.length)%list.length];if(!target)return;
    document.documentElement.classList.add("ynot-step-switching");warmDirection(direction);target.click();
    window.setTimeout(()=>document.documentElement.classList.remove("ynot-step-switching"),180);
  };

  const moveDeal=(direction:number)=>{
    const list=dealCards();if(list.length<2)return;
    const current=activeDealTitle();let index=list.findIndex(card=>dealTitleOf(card)===current);if(index<0)index=0;
    const target=list[(index+direction+list.length)%list.length];if(!target)return;
    const image=target.querySelector<HTMLImageElement>("img");if(image){image.loading="eager";void image.decode?.().catch(()=>{})}
    target.click();
  };

  const panBoard=(direction:number)=>{
    const stage=document.querySelector<HTMLElement>(".lv4-stage");if(!stage)return;
    warmDirection(direction);const camera=parseCamera(stage),amount=Math.max(520,window.innerWidth*.52),panX=camera.panX-direction*amount;
    stage.style.setProperty("transform",`translate(${panX}px, ${camera.panY}px) scale(${camera.zoom})`,`important`);
    stage.style.setProperty("transition","transform .26s cubic-bezier(.22,.86,.24,1)","important");
    window.setTimeout(()=>stage.style.removeProperty("transition"),300);
    window.dispatchEvent(new CustomEvent("ynot:world-focus",{detail:{direction:direction>0?"right":"left",panX,prefetch:true}}));
  };

  const make=(cls:string,label:string,direction:number,handler:(d:number)=>void)=>{
    document.querySelectorAll(`.${cls}`).forEach(node=>node.remove());
    const button=document.createElement("button");button.type="button";button.className=`${cls} ynot-stepper-owned`;button.setAttribute("aria-label",label);button.innerHTML="<span></span>";
    button.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();handler(direction)});document.body.appendChild(button);return button;
  };

  prev=make("ynot-world-desktop-prev","Move left / previous product",-1,d=>{if(drawerOpen())return;document.querySelector(".lv4-detail")?moveProduct(d):panBoard(d)});
  next=make("ynot-world-desktop-next","Move right / next product",1,d=>{if(drawerOpen())return;document.querySelector(".lv4-detail")?moveProduct(d):panBoard(d)});
  dealPrev=make("ynot-deal-desktop-prev","Previous YNOT Deal product",-1,moveDeal);
  dealNext=make("ynot-deal-desktop-next","Next YNOT Deal product",1,moveDeal);

  const force=(button:HTMLButtonElement|null,show:boolean,board=false)=>{
    if(!button)return;
    button.classList.toggle("visible",show);button.classList.toggle("board-mode",board);button.disabled=!show;
    button.style.setProperty("display",show?"grid":"none","important");
    button.style.setProperty("pointer-events",show?"auto":"none","important");
    button.style.setProperty("visibility",show?"visible":"hidden","important");
    button.style.setProperty("opacity",show?(board?".72":"1"):"0","important");
  };

  const sync=()=>{
    frame=0;
    const desktop=window.innerWidth>=900,detail=Boolean(document.querySelector(".lv4-detail")),drawer=drawerOpen(),dealOpen=drawer&&Boolean(document.querySelector(".ynot-selected"));
    const board=desktop&&!detail&&!drawer&&cards().length>0;
    const worldShow=desktop&&!drawer&&(detail?cards().length>1:board);
    const dealShow=desktop&&dealOpen&&dealCards().length>1;
    force(prev,worldShow,board);force(next,worldShow,board);force(dealPrev,dealShow);force(dealNext,dealShow);
  };
  const queue=()=>{if(frame)cancelAnimationFrame(frame);frame=requestAnimationFrame(sync)};
  const observer=new MutationObserver(queue);observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class"]});window.addEventListener("resize",queue);queue();
  const watchdog=window.setInterval(sync,350);
  return()=>{observer.disconnect();window.clearInterval(watchdog);if(frame)cancelAnimationFrame(frame);window.removeEventListener("resize",queue);document.documentElement.classList.remove("ynot-step-switching");prev?.remove();next?.remove();dealPrev?.remove();dealNext?.remove()};
 },[]);
 return null;
}
