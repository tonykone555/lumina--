"use client";
import {FormEvent,useEffect,useState} from "react";
import {Plus,Search,Sparkles} from "lucide-react";

type RoomItem={id?:string;label:string;searchQuery?:string};
type RoomSpot={id?:string;label:string;reason?:string;searchQuery?:string};
type RoomRead={sceneTitle?:string;sceneDescription?:string;styleDescription?:string;objects:RoomItem[];suggestionSpots:RoomSpot[]};

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
     const objects=Array.isArray(root?.objects)?root.objects.filter((x:any)=>x&&typeof x.label==="string").slice(0,10):[];
     const suggestionSpots=Array.isArray(root?.suggestionSpots)?root.suggestionSpots.filter((x:any)=>x&&typeof x.label==="string").slice(0,6):[];
     if(sceneTitle||sceneDescription||styleDescription||objects.length||suggestionSpots.length)setRead({sceneTitle,sceneDescription,styleDescription,objects,suggestionSpots});
    }).catch(()=>{});
   }
   return response;
  };
  window.fetch=wrapped;
  return()=>{if(window.fetch===wrapped)window.fetch=original};
 },[]);
 function submit(e:FormEvent){e.preventDefault();const q=query.trim();if(!q)return;try{sessionStorage.setItem("ynot-room-skip-intro-on-world","1")}catch{}window.location.assign(`/?q=${encodeURIComponent(q)}&from=room`)}
 function openDot(label:string){const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>(".yr-photo button[title]"));const target=buttons.find(b=>b.title===label)||buttons.find(b=>b.title.toLowerCase()===label.toLowerCase());if(target){target.click();target.scrollIntoView({behavior:"smooth",block:"center"})}}
 const title=read?.styleDescription||read?.sceneTitle;
 return <div className="yr-room-search">
  <form onSubmit={submit} className="yr-room-search-form"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search YNOT" aria-label="Search YNOT"/><button type="submit">Search</button></form>
  {(title||read?.sceneDescription)&&<div className="yr-room-read">{title&&<div className="yr-room-read-title">{title}</div>}{read?.sceneDescription&&<div className="yr-room-read-description">{read.sceneDescription}</div>}
   {!!read?.objects.length&&<div className="yr-read-group"><div className="yr-read-label">In your picture</div><div className="yr-read-pills">{read.objects.map((item,i)=><button key={`${item.id||item.label}-${i}`} className="yr-read-pill" onClick={()=>openDot(item.label)}><span className="yr-pill-dot"/>{item.label}</button>)}</div></div>}
   {!!read?.suggestionSpots.length&&<div className="yr-read-group opportunity"><div className="yr-read-label"><Sparkles size={11}/> Opportunities</div><div className="yr-read-pills">{read.suggestionSpots.map((spot,i)=><button key={`${spot.id||spot.label}-${i}`} className="yr-read-pill opportunity" title={spot.reason||spot.label} onClick={()=>openDot(spot.label)}><Plus size={12}/>{spot.label}</button>)}</div></div>}
  </div>}
  <style jsx>{`.yr-room-search{position:relative;z-index:20;width:min(650px,calc(100vw - 32px));margin:18px auto max(28px,env(safe-area-inset-bottom));flex:0 0 auto}.yr-room-search-form{height:52px;display:flex;align-items:center;gap:10px;padding:0 9px 0 16px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(28,29,28,.32);box-shadow:inset 0 1px rgba(255,255,255,.08),0 14px 45px rgba(0,0,0,.14);backdrop-filter:blur(28px) saturate(135%);-webkit-backdrop-filter:blur(28px) saturate(135%);color:#fff}.yr-room-search-form input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#fff;font:inherit;font-size:14px}.yr-room-search-form input::placeholder{color:rgba(255,255,255,.5)}.yr-room-search-form button{border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(255,255,255,.1);color:#fff;padding:9px 15px;font-weight:600}.yr-room-read{padding:18px 7px 2px;color:#fff;text-align:left}.yr-room-read-title{max-width:620px;font-size:clamp(28px,7vw,42px);line-height:1.02;font-weight:760;letter-spacing:-.045em;text-wrap:balance}.yr-room-read-description{max-width:590px;margin-top:10px;font-size:14px;line-height:1.5;color:rgba(255,255,255,.64)}.yr-read-group{margin-top:18px}.yr-read-label{display:flex;align-items:center;gap:5px;margin:0 0 8px 2px;font-size:9px;font-weight:720;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.45)}.yr-read-pills{display:flex;gap:7px;overflow-x:auto;padding:1px 1px 4px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.yr-read-pills::-webkit-scrollbar{display:none}.yr-read-pill{flex:0 0 auto;max-width:220px;height:35px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.055);box-shadow:inset 0 1px rgba(255,255,255,.08);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);color:#fff;display:inline-flex;align-items:center;gap:7px;font:650 11px/1 inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.yr-read-pill:active{transform:scale(.97);background:rgba(255,255,255,.13)}.yr-pill-dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.72);flex:none}.yr-read-pill.opportunity{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.2)}@media(max-width:700px){.yr-room-search{margin-top:14px}.yr-room-read{padding:17px 5px 2px}.yr-room-read-title{font-size:clamp(27px,8.5vw,36px)}.yr-room-read-description{margin-top:8px;font-size:13px;line-height:1.45}.yr-read-group{margin-top:15px}.yr-read-pill{height:34px;padding:0 11px;font-size:10.5px}}`}</style>
 </div>
}