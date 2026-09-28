"use client";
import {FormEvent,useEffect,useState} from "react";
import {Search} from "lucide-react";

export default function RoomSearchBar(){
 const [query,setQuery]=useState("");
 useEffect(()=>{
  const mount=()=>{
   const camera=document.querySelector<HTMLElement>(".yr-camera");
   const search=document.querySelector<HTMLElement>(".yr-room-search");
   if(camera&&search&&search.parentElement!==camera.parentElement)camera.insertAdjacentElement("afterend",search);
  };
  const observer=new MutationObserver(mount);observer.observe(document.body,{subtree:true,childList:true});mount();return()=>observer.disconnect();
 },[]);
 function submit(e:FormEvent){e.preventDefault();const q=query.trim();if(!q)return;window.location.href=`/?q=${encodeURIComponent(q)}`}
 return <div className="yr-room-search">
  <form onSubmit={submit} className="yr-room-search-form">
   <Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search YNOT" aria-label="Search YNOT"/><button type="submit">Search</button>
  </form>
  <style jsx>{`.yr-room-search{position:relative;z-index:20;width:min(650px,calc(100vw - 32px));margin:18px auto max(28px,env(safe-area-inset-bottom));flex:0 0 auto}.yr-room-search-form{height:52px;display:flex;align-items:center;gap:10px;padding:0 9px 0 16px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(28,29,28,.32);box-shadow:inset 0 1px rgba(255,255,255,.08),0 14px 45px rgba(0,0,0,.14);backdrop-filter:blur(28px) saturate(135%);-webkit-backdrop-filter:blur(28px) saturate(135%);color:#fff}.yr-room-search-form input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#fff;font:inherit;font-size:14px}.yr-room-search-form input::placeholder{color:rgba(255,255,255,.5)}.yr-room-search-form button{border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(255,255,255,.1);color:#fff;padding:9px 15px;font-weight:600}`}</style>
 </div>
}