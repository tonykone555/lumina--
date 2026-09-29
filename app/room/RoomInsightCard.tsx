"use client";
import {useEffect,useState} from "react";
import {ChevronDown,Heart,Sparkles} from "lucide-react";

type Insight={sceneTitle?:string;sceneDescription?:string;styleDescription?:string;opportunitySummary?:string;objects?:unknown[]};

export default function RoomInsightCard(){
 const[data,setData]=useState<Insight|null>(null),[open,setOpen]=useState(false),[saved,setSaved]=useState(false);
 useEffect(()=>{
  const original=window.fetch.bind(window);
  const wrapped:typeof window.fetch=async(input:any,init?:any)=>{
   const response=await original(input,init);
   const url=typeof input==="string"?input:input?.url||"";
   if(url.includes("/api/room/quick/analyze")&&response.ok){
    response.clone().json().then((d:Insight)=>{if(d?.sceneTitle){setData(d);setOpen(false);setSaved(false)}}).catch(()=>{});
   }
   return response;
  };
  window.fetch=wrapped;
  return()=>{if(window.fetch===wrapped)window.fetch=original};
 },[]);
 function saveScan(e:React.MouseEvent){
  e.stopPropagation();
  const img=document.querySelector<HTMLImageElement>(".yr-photo>img");
  if(!img?.src)return;
  try{
   const key="ynot-room-saved-scans-v1";
   const old=JSON.parse(localStorage.getItem(key)||"[]");
   const entry={id:`scan-${Date.now()}`,savedAt:new Date().toISOString(),image:img.src,analysis:data};
   localStorage.setItem(key,JSON.stringify([entry,...(Array.isArray(old)?old:[])].slice(0,30)));
   setSaved(true);
   window.dispatchEvent(new CustomEvent("ynot-room-scan-saved",{detail:entry}));
  }catch{}
 }
 if(!data)return null;
 const title=data.styleDescription||data.sceneTitle||"YNOT Read";
 const opportunity=data.opportunitySummary||`${data.objects?.length||0} shoppable things found in this image.`;
 return <div className={`yri ${open?"yri-open":""}`}>
  <style jsx global>{`
   .yri{position:fixed;z-index:79;left:50%;bottom:10px;transform:translateX(-50%);width:min(620px,calc(100vw - 20px));color:#fff;font-family:inherit;transition:.28s cubic-bezier(.2,.8,.2,1)}
   .yri-card{position:relative;border:1px solid rgba(255,255,255,.17);background:rgba(18,20,20,.38);box-shadow:inset 0 1px rgba(255,255,255,.1),0 18px 55px rgba(0,0,0,.22);backdrop-filter:blur(28px) saturate(145%);-webkit-backdrop-filter:blur(28px) saturate(145%);border-radius:24px;padding:13px 15px;text-align:left;width:100%;color:#fff}
   .yri-peek{cursor:pointer}.yri-kicker{display:flex;align-items:center;gap:6px;font-size:8px;letter-spacing:.16em;text-transform:uppercase;opacity:.5}.yri-title{font-size:13px;font-weight:720;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.yri-op{font-size:11px;line-height:1.4;opacity:.68;margin-top:5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.yri-more{display:none;margin-top:14px;padding-top:13px;border-top:1px solid rgba(255,255,255,.1)}.yri-open .yri-more{display:block}.yri-open .yri-op{display:block}.yri-label{font-size:8px;letter-spacing:.15em;text-transform:uppercase;opacity:.42;margin:12px 0 4px}.yri-copy{font-size:13px;line-height:1.5;opacity:.72;margin:0}.yri-chevron{position:absolute;right:16px;top:15px;opacity:.55;transition:.2s}.yri-open .yri-chevron{transform:rotate(180deg)}.yri-save{width:100%;margin-top:15px;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:11px 15px;background:rgba(255,255,255,.08);color:#fff;display:flex;align-items:center;justify-content:center;gap:8px;font:inherit;font-size:12px;font-weight:680;cursor:pointer;box-shadow:inset 0 1px rgba(255,255,255,.08)}.yri-save[data-saved="true"]{background:rgba(255,255,255,.94);color:#151515}.yri-save svg{transition:.2s}.yri-save[data-saved="true"] svg{fill:currentColor}
   @media(max-width:700px){.yri{bottom:9px;width:calc(100vw - 18px)}.yri-card{border-radius:22px;padding:12px 14px}.yri-open{z-index:83}}
  `}</style>
  <div className="yri-card">
   <button type="button" className="yri-peek" style={{all:"unset",display:"block",width:"100%",cursor:"pointer"}} onClick={()=>setOpen(v=>!v)} aria-expanded={open}>
    <div className="yri-kicker"><Sparkles size={11}/>YNOT READ</div><div className="yri-title">{title}</div><div className="yri-op">{opportunity}</div><ChevronDown className="yri-chevron" size={15}/>
   </button>
   <div className="yri-more"><div className="yri-label">What YNOT sees</div><p className="yri-copy">{data.sceneDescription||data.sceneTitle}</p><div className="yri-label">Opportunities</div><p className="yri-copy">{opportunity}</p><button type="button" className="yri-save" data-saved={saved} onClick={saveScan}><Heart size={16}/>{saved?"Scan saved":"Save this scan"}</button></div>
  </div>
 </div>
}
