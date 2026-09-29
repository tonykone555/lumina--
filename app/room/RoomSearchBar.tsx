"use client";
import {FormEvent,useEffect,useState} from "react";
import {Search} from "lucide-react";

type RoomRead={sceneTitle?:string;sceneDescription?:string;styleDescription?:string};

export default function RoomSearchBar(){
 const [query,setQuery]=useState("");
 const [read,setRead]=useState<RoomRead|null>(null);
 useEffect(()=>{
  const mount=()=>{
   const camera=document.querySelector<HTMLElement>(".yr-camera");
   const search=document.querySelector<HTMLElement>(".yr-room-search");
   if(camera&&search&&search.parentElement!==camera.parentElement)camera.insertAdjacentElement("afterend",search);
  };
  const observer=new MutationObserver(mount);observer.observe(document.body,{subtree:true,childList:true});mount();return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  const original=window.fetch.bind(window);
  const wrapped:typeof window.fetch=async(input:any,init?:any)=>{
   const response=await original(input,init);
   const url=typeof input==="string"?input:input?.url||"";
   if(url.includes("/api/room/quick/analyze")&&response.ok){
    response.clone().json().then((d:any)=>{
     const root=d?.analysis||d?.result||d?.data||d;
     const sceneTitle=root?.sceneTitle||root?.scene_title||root?.title||root?.roomTitle||root?.room_title;
     const sceneDescription=root?.sceneDescription||root?.scene_description||root?.description||root?.roomDescription||root?.room_description;
     const styleDescription=root?.styleDescription||root?.style_description||root?.style;
     if(sceneTitle||sceneDescription||styleDescription)setRead({sceneTitle,sceneDescription,styleDescription});
    }).catch(()=>{});
   }
   return response;
  };
  window.fetch=wrapped;
  return()=>{if(window.fetch===wrapped)window.fetch=original};
 },[]);
 function submit(e:FormEvent){e.preventDefault();const q=query.trim();if(!q)return;try{sessionStorage.setItem("ynot-room-skip-intro-on-world","1")}catch{}window.location.assign(`/?q=${encodeURIComponent(q)}&from=room`)}
 const title=read?.styleDescription||read?.sceneTitle;
 return <div className="yr-room-search">
  <form onSubmit={submit} className="yr-room-search-form">
   <Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search YNOT" aria-label="Search YNOT"/><button type="submit">Search</button>
  </form>
  {(title||read?.sceneDescription)&&<div className="yr-room-read">{title&&<div className="yr-room-read-title">{title}</div>}{read?.sceneDescription&&<div className="yr-room-read-description">{read.sceneDescription}</div>}</div>}
  <style jsx>{`.yr-room-search{position:relative;z-index:20;width:min(650px,calc(100vw - 32px));margin:18px auto max(28px,env(safe-area-inset-bottom));flex:0 0 auto}.yr-room-search-form{height:52px;display:flex;align-items:center;gap:10px;padding:0 9px 0 16px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(28,29,28,.32);box-shadow:inset 0 1px rgba(255,255,255,.08),0 14px 45px rgba(0,0,0,.14);backdrop-filter:blur(28px) saturate(135%);-webkit-backdrop-filter:blur(28px) saturate(135%);color:#fff}.yr-room-search-form input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#fff;font:inherit;font-size:14px}.yr-room-search-form input::placeholder{color:rgba(255,255,255,.5)}.yr-room-search-form button{border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(255,255,255,.1);color:#fff;padding:9px 15px;font-weight:600}.yr-room-read{padding:18px 7px 2px;color:#fff;text-align:left}.yr-room-read-title{max-width:620px;font-size:clamp(28px,7vw,42px);line-height:1.02;font-weight:760;letter-spacing:-.045em;text-wrap:balance}.yr-room-read-description{max-width:590px;margin-top:10px;font-size:14px;line-height:1.5;color:rgba(255,255,255,.64);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}@media(max-width:700px){.yr-room-search{margin-top:14px}.yr-room-read{padding:17px 5px 2px}.yr-room-read-title{font-size:clamp(27px,8.5vw,36px)}.yr-room-read-description{margin-top:8px;font-size:13px;line-height:1.45}}`}</style>
 </div>
}