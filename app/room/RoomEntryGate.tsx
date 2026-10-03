'use client';
import {useEffect,useState} from 'react';

declare global{interface Window{__ynotRoomStream?:MediaStream}}
const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
async function openCamera(){
 if(!navigator.mediaDevices?.getUserMedia)throw new Error('Live camera is not available in this browser.');
 try{
  return await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:640},height:{ideal:480},frameRate:{ideal:20,max:24}}});
 }catch(error){
  if(error instanceof DOMException&&(error.name==='OverconstrainedError'||error.name==='NotFoundError'))return navigator.mediaDevices.getUserMedia({audio:false,video:true});
  throw error;
 }
}
export default function RoomEntryGate(){
 const[open,setOpen]=useState(true),[waiting,setWaiting]=useState(false),[error,setError]=useState('');
 const[ios,setIos]=useState(false);
 useEffect(()=>{setIos(isIOS())},[]);
 async function enter(){
  if(waiting)return;
  setWaiting(true);setError('');
  // Keep iOS on the native photo-capture path. Desktop requests permission here,
  // but deliberately does not mount a live <video> underneath the animated
  // onboarding. Combining both media surfaces with the heavy glass/backdrop
  // layers was the crash path after the browser permission prompt.
  if(isIOS()){setWaiting(false);setOpen(false);return}
  try{
   let stream=window.__ynotRoomStream;
   if(!stream||!stream.active){stream=await openCamera();window.__ynotRoomStream=stream}
   setOpen(false);setWaiting(false);
   // RoomLiveCamera waits until the onboarding is actually gone before it
   // attaches this already-authorized stream. No second permission request.
   window.dispatchEvent(new CustomEvent('ynot:room-camera-ready',{detail:{stream}}));
  }catch(e){setWaiting(false);setError(e instanceof Error?e.message:'Camera access could not be started.');}
 }
 if(!open)return null;
 return <div style={{position:'fixed',inset:0,zIndex:12000,display:'grid',placeItems:'center',padding:24,background:'#f4f1eb',color:'#171513'}}><div style={{width:'min(420px,100%)',textAlign:'center'}}><div style={{fontSize:11,letterSpacing:'.28em',fontWeight:800,marginBottom:18}}>YNOT ROOM</div><h1 style={{fontSize:'clamp(38px,10vw,56px)',lineHeight:.94,letterSpacing:'-.055em',margin:'0 0 18px'}}>See your space.<br/><span style={{opacity:.42}}>Shop what belongs.</span></h1><p style={{fontSize:15,lineHeight:1.55,opacity:.58,margin:'0 auto 28px',maxWidth:350}}>{ios?'Explore YNOT Room, then take a photo using your iPhone camera to find matching products.':'Enable your camera once. YNOT will keep it ready and open the live Room after the introduction.'}</p>{error&&<p role="alert" style={{fontSize:13,lineHeight:1.45,color:'#9b2c2c',margin:'0 0 16px'}}>{error}</p>}<button type="button" disabled={waiting} onClick={()=>void enter()} style={{width:'100%',height:64,border:0,borderRadius:999,background:'#191715',color:'#fff',fontSize:16,fontWeight:800}}>{waiting?'Starting…':ios?'Continue to YNOT Room':'Enable camera & continue'}</button></div></div>
}
