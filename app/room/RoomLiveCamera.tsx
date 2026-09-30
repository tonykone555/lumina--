'use client';
import {useCallback,useEffect,useRef,useState} from 'react';

export default function RoomLiveCamera(){
 const videoRef=useRef<HTMLVideoElement>(null),streamRef=useRef<MediaStream|null>(null),opening=useRef(false);
 const[active,setActive]=useState(false),[blurred,setBlurred]=useState(false),[error,setError]=useState('');
 const attach=useCallback((node:HTMLVideoElement|null)=>{videoRef.current=node;if(node&&streamRef.current){node.srcObject=streamRef.current;void node.play().catch(()=>{})}},[]);
 const start=useCallback(async(preview=false)=>{
  if(opening.current)return false;
  if(streamRef.current){setActive(true);setBlurred(preview);return true}
  opening.current=true;setError('');
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('Live camera is unavailable in this browser.');
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30}}});
   streamRef.current=stream;setActive(true);setBlurred(preview);
   requestAnimationFrame(()=>{if(videoRef.current){videoRef.current.srcObject=stream;void videoRef.current.play().catch(()=>{})}});
   window.dispatchEvent(new CustomEvent('ynot:room-camera-ready'));
   return true;
  }catch(e){setError(e instanceof Error?e.message:'Camera permission was not granted.');window.dispatchEvent(new CustomEvent('ynot:room-camera-error'));return false}
  finally{opening.current=false}
 },[]);
 useEffect(()=>{
  const preview=()=>void start(true);
  const enter=()=>{if(streamRef.current){setActive(true);setBlurred(false)}else void start(false)};
  window.addEventListener('ynot:room-camera-preview',preview);window.addEventListener('ynot:room-live-camera-open',enter);window.addEventListener('ynot:room-onboarding-complete',enter);
  return()=>{window.removeEventListener('ynot:room-camera-preview',preview);window.removeEventListener('ynot:room-live-camera-open',enter);window.removeEventListener('ynot:room-onboarding-complete',enter);streamRef.current?.getTracks().forEach(t=>t.stop())}
 },[start]);
 useEffect(()=>{
  const click=(e:MouseEvent)=>{if((e.target as Element|null)?.closest?.('.yr-shutter')){e.preventDefault();e.stopImmediatePropagation();void start(false)}};
  document.addEventListener('click',click,true);return()=>document.removeEventListener('click',click,true)
 },[start]);
 const capture=()=>{const v=videoRef.current;if(!v||v.readyState<2)return;const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d')?.drawImage(v,0,0);c.toBlob(blob=>{if(!blob)return;const input=document.querySelector<HTMLInputElement>('.yr input[type="file"][capture][accept*="image"]');if(!input)return;const dt=new DataTransfer();dt.items.add(new File([blob],`ynot-room-${Date.now()}.jpg`,{type:'image/jpeg'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}))},'image/jpeg',.82)};
 if(!active&&!error)return null;
 return <div className={`yr-live-camera${blurred?' is-preview':''}`} style={{position:'fixed',inset:0,zIndex:blurred?9997:10050,overflow:'hidden',background:'#080808',color:'#fff'}}>
  {active&&<video ref={attach} playsInline muted autoPlay style={{position:'absolute',inset:'-24px',width:'calc(100% + 48px)',height:'calc(100% + 48px)',objectFit:'cover',filter:blurred?'blur(22px) brightness(.58) saturate(.72)':'none',transform:blurred?'scale(1.06)':'none',transition:'filter .35s ease,transform .35s ease'}}/>}
  {blurred&&<div style={{position:'absolute',inset:0,background:'rgba(244,241,235,.16)',backdropFilter:'blur(2px)',WebkitBackdropFilter:'blur(2px)'}}/>}
  {!blurred&&active&&<><div style={{position:'absolute',top:'calc(22px + env(safe-area-inset-top))',left:'50%',transform:'translateX(-50%)',textAlign:'center',zIndex:2}}><b style={{letterSpacing:2,fontSize:15}}>YNOT ROOM</b><div style={{fontSize:9,letterSpacing:2,opacity:.65}}>FRAME · CAPTURE · SCAN</div></div><button type="button" aria-label="Capture" onClick={capture} style={{position:'absolute',left:'50%',bottom:'calc(30px + env(safe-area-inset-bottom))',transform:'translateX(-50%)',width:84,height:84,borderRadius:'50%',border:'6px solid white',background:'rgba(255,255,255,.16)',zIndex:3}}><span style={{display:'block',width:64,height:64,borderRadius:'50%',background:'#fff',margin:'auto'}}/></button></>}
  {error&&<div role="alert" style={{position:'absolute',left:24,right:24,top:'38%',zIndex:5,textAlign:'center',padding:18,borderRadius:20,background:'#111d'}}>{error}</div>}
 </div>
}
