"use client";

import {useEffect,useState} from "react";

type Product={id:string;title:string;image:string;source?:string;tags?:string[]};
type VideoState={status:string;video_url?:string|null};
const sent=new Set<string>();

/** Only mounted by the opened product detail, not by search results. */
export default function ProductAiMotion({product}:{product:Product}){
 const [video,setVideo]=useState<string|null>(null);
 const [showVideo,setShowVideo]=useState(true);
 useEffect(()=>{
  const id=String(product.id||"").trim(),image=String(product.image||"").trim();
  setVideo(null);setShowVideo(true);
  if(!id||!/^https:\/\//i.test(image))return;
  const key=id+"|"+image;
  let cancelled=false,timer:ReturnType<typeof setTimeout>|undefined,attempt=0;
  const details={id,title:product.title,image,category:(product.tags||[]).join(" ")};
  const check=async()=>{
   if(cancelled)return;
   try{
    const r=await fetch("/api/catalog/video/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({product_ids:[id]}),cache:"no-store"});
    const data=await r.json().catch(()=>null);
    if(cancelled||!r.ok)return;
    const state:VideoState|undefined=data?.jobs?.[id];
    if(state?.status==="ready"&&state.video_url){setVideo(state.video_url);return}
    if(state?.status==="failed"||!data?.configured)return;
    if(++attempt<90)timer=setTimeout(check,5000);
   }catch{if(!cancelled&&++attempt<20)timer=setTimeout(check,7000)}
  };
  const begin=async()=>{
   try{
    const r=await fetch("/api/catalog/video/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({products:[details],source:"product"}),cache:"no-store"});
    const data=await r.json().catch(()=>null);
    if(cancelled||!r.ok||!data?.configured)return;
    const state:VideoState|undefined=data?.jobs?.[id];
    if(state?.status==="ready"&&state.video_url){setVideo(state.video_url);return}
    if(state?.status==="queued"||state?.status==="processing")timer=setTimeout(check,3500);
   }catch{}
  };
  // React remounts, reopens and rapid switches must not submit duplicate jobs.
  if(!sent.has(key)){sent.add(key);void begin()}
  else void check();
  return()=>{cancelled=true;if(timer)clearTimeout(timer)};
 },[product.id,product.image,product.title,product.tags?.join("|")]);
 if(!video)return null;
 return <span style={{position:"absolute",inset:0,display:"block",pointerEvents:"none"}}>
  {showVideo&&<video src={video} poster={product.image} autoPlay muted loop playsInline preload="metadata"
    onError={()=>setShowVideo(false)} aria-label="AI-generated product motion preview"
    style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain",background:"transparent"}}/>}
  <span style={{position:"absolute",bottom:14,left:14,padding:"5px 9px",borderRadius:999,background:"rgba(0,0,0,.55)",color:"white",fontSize:10,letterSpacing:".04em"}}>
    {showVideo?"AI motion preview":"Product photo"}
  </span>
 </span>;
}
