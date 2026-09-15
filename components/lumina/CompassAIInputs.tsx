"use client";

import {useEffect,useRef,useState} from "react";
import {Camera,ImagePlus,Mic,Square,UserRound,X} from "lucide-react";

type Mode="inspiration"|"self"|"room"|null;

function setReactInput(input:HTMLInputElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}))}
function createWorld(text:string){const clean=text.trim();if(!clean)return;const tags=clean.split(/[,\n]/).map(v=>v.trim()).filter(Boolean).slice(0,10);window.dispatchEvent(new CustomEvent("shop:tags-changed",{detail:{tags}}));const input=document.querySelector<HTMLInputElement>(".lv4-search input");if(input){setReactInput(input,tags.join(" "));requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(".lv4-search button")?.click())}}

export default function CompassAIInputs(){
 const [mode,setMode]=useState<Mode>(null),[preview,setPreview]=useState(""),[notes,setNotes]=useState(""),[recording,setRecording]=useState(false),fileRef=useRef<HTMLInputElement>(null),mediaRef=useRef<MediaRecorder|null>(null),chunks=useRef<Blob[]>([]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
 async function chooseFile(file?:File){if(!file)return;if(preview)URL.revokeObjectURL(preview);setPreview(URL.createObjectURL(file));setNotes(mode==="room"?"room style, furniture, decor, lighting":mode==="self"?"personal style, colors, clothing, accessories, beauty":"visual style, colors, materials, silhouette");}
 async function toggleRecord(){if(recording){mediaRef.current?.stop();setRecording(false);return}try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const rec=new MediaRecorder(stream);chunks.current=[];rec.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data)};rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());setNotes(v=>v?`${v}, voice preferences`:"voice preferences")};rec.start();mediaRef.current=rec;setRecording(true)}catch{setNotes("Microphone permission is needed. You can type your request here instead.")}}
 if(!document?.querySelector(".ynot-compass-map"))return null;
 return <div className="ynot-ai-compass-slot">
  <div className="ynot-ai-compass-actions">
   <button onClick={()=>{setMode("inspiration");setTimeout(()=>fileRef.current?.click(),0)}}><ImagePlus/>Upload inspiration</button>
   <button onClick={()=>{setMode("self");setTimeout(()=>fileRef.current?.click(),0)}}><UserRound/>Upload yourself</button>
   <button onClick={()=>{setMode("room");setTimeout(()=>fileRef.current?.click(),0)}}><Camera/>Upload room</button>
   <button className={recording?"active":""} onClick={toggleRecord}>{recording?<Square/>:<Mic/>}{recording?"Stop":"Record search"}</button>
  </div>
  <input ref={fileRef} hidden type="file" accept="image/*" onChange={e=>chooseFile(e.target.files?.[0])}/>
  {(mode||notes)&&<div className="ynot-ai-analysis-card">
   <button className="ynot-ai-close" onClick={()=>{setMode(null);setPreview("");setNotes("")}}><X/></button>
   {preview&&<img src={preview} alt="AI input preview"/>}
   <div><small>AI DISCOVERY</small><b>{mode==="room"?"Build a world for this room":mode==="self"?"Find what suits you":"Shop this inspiration"}</b><p>Review or change the attributes before searching. YNOT uses them as world tags.</p><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Describe what you want, or edit the detected attributes…"/><button className="ynot-ai-create" onClick={()=>createWorld(notes)}>Create world ✦</button></div>
  </div>}
 </div>;
}
