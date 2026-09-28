"use client";
import {FormEvent,useEffect,useRef,useState} from "react";
import {Search} from "lucide-react";

export default function RoomSearchBar(){
 const [query,setQuery]=useState("");
 const [revealed,setRevealed]=useState(false);
 const startY=useRef(0);
 useEffect(()=>{
  const down=(e:TouchEvent)=>{startY.current=e.touches[0]?.clientY||0};
  const up=(e:TouchEvent)=>{const y=e.changedTouches[0]?.clientY||0;if(startY.current-y>32)setRevealed(true);if(y-startY.current>55)setRevealed(false)};
  window.addEventListener("touchstart",down,{passive:true});window.addEventListener("touchend",up,{passive:true});
  return()=>{window.removeEventListener("touchstart",down);window.removeEventListener("touchend",up)};
 },[]);
 function submit(e:FormEvent){e.preventDefault();const q=query.trim();if(!q)return;window.location.href=`/?q=${encodeURIComponent(q)}`}
 return <div className={`yr-room-search ${revealed?"is-revealed":""}`}>
  <div className="yr-room-search-handle" aria-hidden="true"/>
  <form onSubmit={submit} className="yr-room-search-form">
   <Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search YNOT" aria-label="Search YNOT"/><button type="submit">Search</button>
  </form>
  <style jsx>{`.yr-room-search{position:fixed;z-index:72;left:50%;bottom:max(10px,env(safe-area-inset-bottom));width:min(650px,calc(100vw - 32px));transform:translate(-50%,calc(100% - 17px));transition:transform .26s ease;pointer-events:auto}.yr-room-search.is-revealed,.yr-room-search:focus-within{transform:translate(-50%,0)}.yr-room-search-handle{width:42px;height:4px;border-radius:999px;background:rgba(255,255,255,.42);margin:0 auto 8px;box-shadow:0 0 14px rgba(255,255,255,.08)}.yr-room-search-form{height:52px;display:flex;align-items:center;gap:10px;padding:0 9px 0 16px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(28,29,28,.34);box-shadow:inset 0 1px rgba(255,255,255,.08),0 14px 45px rgba(0,0,0,.16);backdrop-filter:blur(28px) saturate(135%);-webkit-backdrop-filter:blur(28px) saturate(135%);color:#fff}.yr-room-search-form input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#fff;font:inherit;font-size:14px}.yr-room-search-form input::placeholder{color:rgba(255,255,255,.5)}.yr-room-search-form button{border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(255,255,255,.1);color:#fff;padding:9px 15px;font-weight:600}@media(min-width:701px){.yr-room-search{bottom:18px;transform:translate(-50%,0)}.yr-room-search-handle{display:none}}`}</style>
 </div>
}