"use client";

import {useEffect} from "react";

const norm=(value:string)=>String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();

export default function DesktopProductStepper():null{
 useEffect(()=>{
  let frame=0;
  let prev:HTMLButtonElement|null=null;
  let next:HTMLButtonElement|null=null;

  const cards=()=>[...document.querySelectorAll<HTMLElement>(".lv4-stage > .lv4-product")];
  const titleOf=(card:HTMLElement)=>norm(card.querySelector(".lv4-product-tooltip b,.lv4-orbmeta b")?.textContent||"");
  const activeTitle=()=>norm(document.querySelector(".lv4-detail .lv4-detailcopy h2")?.textContent||"");

  const move=(direction:number)=>{
    const list=cards();
    if(list.length<2)return;
    const current=activeTitle();
    let index=list.findIndex(card=>titleOf(card)===current);
    if(index<0)index=0;
    const target=list[(index+direction+list.length)%list.length];
    if(!target)return;
    target.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,view:window}));
    requestAnimationFrame(()=>{
      if(activeTitle()===current)target.click();
    });
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
      move(direction);
    });
    document.body.appendChild(button);
    return button;
  };

  prev=make("ynot-world-desktop-prev","Previous product",-1);
  next=make("ynot-world-desktop-next","Next product",1);

  const sync=()=>{
    frame=0;
    const show=window.innerWidth>=900&&Boolean(document.querySelector(".lv4-detail"))&&cards().length>1;
    prev?.classList.toggle("visible",show);
    next?.classList.toggle("visible",show);
    if(prev)prev.disabled=!show;
    if(next)next.disabled=!show;
  };
  const queue=()=>{
    if(frame)cancelAnimationFrame(frame);
    frame=requestAnimationFrame(sync);
  };
  const observer=new MutationObserver(mutations=>{
    if(mutations.every(m=>m.target===prev||m.target===next))return;
    queue();
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
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
