"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {Camera,ImagePlus,Upload} from "lucide-react";

// Decorative preview only; no camera permission or stream in onboarding.
const PREVIEW="https://iycxkwoxbkanfyraohge.supabase.co/storage/v1/object/public/ad-creatives/IMG_6763.jpeg";
type Box={top:number;left:number;width:number;height:number};
const imageInput=()=>document.querySelector<HTMLInputElement>('.yr input[type="file"][accept*="image"]:not([capture])');
export default function RoomOnboardingEntryChoices(){
 const[box,setBox]=useState<Box|null>(null);
 const[visible,setVisible]=useState(true);
 useEffect(()=>{
  let alive=true,raf=0,previous="";
  const sync=()=>{
   if(!alive)return;
   const el=document.querySelector<HTMLElement>(".ro-video-shell");
   const r=el?.getBoundingClientRect();
   const key=r?`${Math.round(r.top)}:${Math.round(r.left)}:${Math.round(r.width)}:${Math.round(r.height)}`:"";
   if(key!==previous){previous=key;setBox(r&&r.width&&r.height?{top:r.top,left:r.left,width:r.width,height:r.height}:null)}
  };
  const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(sync)};
  sync();window.addEventListener("scroll",schedule,true);window.addEventListener("resize",schedule);
  return()=>{alive=false;cancelAnimationFrame(raf);window.removeEventListener("scroll",schedule,true);window.removeEventListener("resize",schedule)};
 },[]);
 const dismiss=()=>{setVisible(false);document.querySelector<HTMLButtonElement>(".ro-skip")?.click()};
 const camera=()=>{
  // Call the already mounted camera component synchronously in the actual tap.
  // It requests getUserMedia, then React can safely close the onboarding.
  window.dispatchEvent(new Event("ynot:room-live-camera-open"));
  dismiss();
 };
 const upload=()=>{const input=imageInput();input?.click();dismiss()};
 const explore=()=>{dismiss();window.setTimeout(()=>window.dispatchEvent(new CustomEvent("ynot:room-inspiration",{detail:{source:"onboarding"}})),0)};
 if(!visible||!box||typeof document==="undefined")return null;
 return createPortal(<><style>{`.ro-source{padding-top:162px!important}@media(min-width:700px){.ro-source{padding-top:160px!important}}`}</style><div className="roe" style={{position:"fixed",left:box.left,top:box.top+box.height+8,width:box.width,zIndex:10000,pointerEvents:box.top+box.height+8>window.innerHeight||box.top+box.height+158<0?"none":"auto"}}><style jsx>{`.roe{height:142px;position:relative;border-radius:24px;overflow:hidden;background:#292725;color:#fff;box-shadow:0 10px 30px rgba(45,38,31,.12)}.roe-camera{position:absolute;inset:-18px;width:calc(100% + 36px);height:calc(100% + 36px);object-fit:cover;filter:blur(18px) saturate(.6) brightness(.45)}.roe-frost{position:absolute;inset:0;background:linear-gradient(100deg,rgba(10,10,10,.45),rgba(10,10,10,.14))}.roe-copy{position:relative;z-index:1;text-align:center;padding:11px 8px 0}.roe-copy small{font-size:9px;letter-spacing:.22em;text-transform:uppercase;opacity:.75}.roe-actions{position:absolute;z-index:2;left:9px;right:9px;bottom:9px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.roe-action{min-width:0;height:78px;border-radius:16px;border:1px solid rgba(255,255,255,.24);background:rgba(18,18,18,.5);color:#fff;padding:7px 4px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;font-size:9px;font-weight:750;line-height:1.1}.roe-action:first-child{background:rgba(255,255,255,.91);color:#161412}`}</style><img src={PREVIEW} className="roe-camera" alt="" aria-hidden="true"/><div className="roe-frost"/><div className="roe-copy"><small>Three ways to start</small></div><div className="roe-actions"><button type="button" className="roe-action" onClick={camera}><Camera size={20}/>Point at your space</button><button type="button" className="roe-action" onClick={upload}><Upload size={20}/>Upload inspiration</button><button type="button" className="roe-action" onClick={explore}><ImagePlus size={20}/>Explore interiors</button></div></div></>,document.body);
}
