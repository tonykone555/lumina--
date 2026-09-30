'use client';
import {useEffect,useState} from 'react';

declare global{interface Window{__ynotRoomStream?:MediaStream}}
export default function RoomEntryGate(){
 const[open,setOpen]=useState(true),[waiting,setWaiting]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const click=(e:MouseEvent)=>{if((e.target as Element|null)?.closest?.('.ro-go,.ro-skip'))window.dispatchEvent(new Event('ynot:room-onboarding-complete'))};document.addEventListener('click',click,true);return()=>document.removeEventListener('click',click,true)},[]);
 async function enter(){
  if(waiting)return;setWaiting(true);setError('');
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('Live camera is not available in this browser.');
   let stream=window.__ynotRoomStream;
   if(!stream||!stream.active){stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30}}});window.__ynotRoomStream=stream}
   // Permission and stream are now established directly inside Safari's button gesture.
   setOpen(false);setWaiting(false);
   window.dispatchEvent(new CustomEvent('ynot:room-camera-preview',{detail:{stream}}));
  }catch(e){setWaiting(false);setError(e instanceof Error?e.message:'Camera access could not be started.');}
 }
 if(!open)return null;
 return <div style={{position:'fixed',inset:0,zIndex:12000,display:'grid',placeItems:'center',padding:24,background:'#f4f1eb',color:'#171513'}}><div style={{width:'min(420px,100%)',textAlign:'center'}}><div style={{fontSize:11,letterSpacing:'.28em',fontWeight:800,marginBottom:18}}>YNOT ROOM</div><h1 style={{fontSize:'clamp(38px,10vw,56px)',lineHeight:.94,letterSpacing:'-.055em',margin:'0 0 18px'}}>See your space.<br/><span style={{opacity:.42}}>Shop what belongs.</span></h1><p style={{fontSize:15,lineHeight:1.55,opacity:.58,margin:'0 auto 28px',maxWidth:350}}>Enable your camera once. YNOT will keep the same live Room ready behind the introduction.</p>{error&&<p role="alert" style={{fontSize:13,lineHeight:1.45,color:'#9b2c2c',margin:'0 0 16px'}}>{error}</p>}<button type="button" disabled={waiting} onClick={enter} style={{width:'100%',height:64,border:0,borderRadius:999,background:'#191715',color:'#fff',fontSize:16,fontWeight:800}}>{waiting?'Starting camera…':'Enable camera & continue'}</button></div></div>
}
