"use client";

import {useEffect,useState} from "react";

const BUBBLES=[
 {x:"7%",y:"22%",s:82,d:10,delay:-2.4},
 {x:"18%",y:"72%",s:44,d:8.5,delay:-5.1},
 {x:"30%",y:"13%",s:34,d:9.8,delay:-3.8},
 {x:"73%",y:"19%",s:58,d:11.5,delay:-7.2},
 {x:"87%",y:"63%",s:76,d:12.2,delay:-4.4},
 {x:"94%",y:"29%",s:36,d:8.9,delay:-6.7},
 {x:"58%",y:"84%",s:48,d:10.7,delay:-1.9},
 {x:"39%",y:"89%",s:66,d:13.2,delay:-8.1},
];

export default function EntryAmbientBubbles(){
 const[home,setHome]=useState(false);
 useEffect(()=>{
  let frame=0;
  const sync=()=>{frame=0;setHome(Boolean(document.querySelector(".lv4-shell.depth-worlds")))};
  const queue=()=>{if(frame)return;frame=requestAnimationFrame(sync)};
  const observer=new MutationObserver(queue);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
  sync();
  return()=>{observer.disconnect();if(frame)cancelAnimationFrame(frame)};
 },[]);
 return <div className={`ynot-entry-ambient ${home?"active":""}`} aria-hidden="true">{BUBBLES.map((bubble,index)=><i key={index} style={{left:bubble.x,top:bubble.y,width:bubble.s,height:bubble.s,"--ynot-float-duration":`${bubble.d}s`,"--ynot-float-delay":`${bubble.delay}s`} as React.CSSProperties}/>)}</div>
}
