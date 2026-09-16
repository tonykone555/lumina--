"use client";

import {useEffect,useRef,useState} from "react";
import {BookOpen} from "lucide-react";

function savedCount(){
 try{const value=JSON.parse(localStorage.getItem("ynot-saved-items")||"[]");return Array.isArray(value)?value.length:0}catch{return 0}
}

export default function SavesBookToast(){
 const [show,setShow]=useState(false);
 const previous=useRef(0);
 const timer=useRef<number|null>(null);
 useEffect(()=>{
  previous.current=savedCount();
  const onChanged=()=>{
   const next=savedCount();
   const added=next>previous.current;
   previous.current=next;
   if(!added)return;
   if(timer.current!=null)window.clearTimeout(timer.current);
   setShow(true);
   timer.current=window.setTimeout(()=>setShow(false),2200);
  };
  window.addEventListener("ynot:saves-changed",onChanged);
  return()=>{window.removeEventListener("ynot:saves-changed",onChanged);if(timer.current!=null)window.clearTimeout(timer.current)};
 },[]);
 return <button type="button" className={`ynot-saves-book-toast ${show?"show":""}`} aria-label="Open saved products" onClick={()=>{setShow(false);window.dispatchEvent(new Event("ynot:open-saves"))}}><BookOpen/><span>Saved</span></button>;
}
