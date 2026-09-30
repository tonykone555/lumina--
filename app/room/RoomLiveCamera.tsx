'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
declare global{interface Window{__ynotRoomStream?:MediaStream}}
const ios=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
export default function RoomLiveCamera(){
 const videoRef=useRef<HTMLVideoElement>(null),streamRef=useRef<MediaStream|null>(null),opening=useRef(false);
 const[active,setActive]=useState(false),[blurred,setBlurred]=useState(false),[error,setError]=useState('');
 const attach=useCallback((node:HTMLVideoElement|null)=>{videoRef.current=node;if(node&&streamRef.current){node.srcObject=streamRef.current;void node.play().catch(()=>{})}},[]);
 const adopt=useCallback((stream:MediaStream,preview:boolean)=>{if(ios())return;streamRef.current=stream;window.__ynotRoomStream=stream;setError('');setActive(true);setBlurred(preview);requestAnimationFrame(()=>{if(videoRef.current){videoRef.current.srcObject=stream;void videoRef.current.play().catch(()=>{})}})},[]);
 const start=useCallback(async(preview=false)=>{
  if(ios())return false;
  const existing=streamRef.current?.active?streamRef.current:(window.__ynotRoomStream?.active?window.__ynotRoomStream:null);
  if(existing){adopt(existing,preview);return true}if(opening.current)return false;opening.current=true;setError('');
  try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('Live camera is unavailable in this browser.');const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:640},height:{ideal:480},frameRate:{ideal:20,max:24}}});adopt(stream,preview);return true}catch(e){setError(e instanceof Error?e.message:'Camera permission was not granted.');return false}finally{opening.current=false}
 },[adopt]);
 useEffect(()=>{
  if(ios())return;
  const preview=(e:Event)=>{const stream=(e as CustomEvent<{stream?:MediaStream}>).detail?.stream;if(stream?.active)adopt(stream,true);else void start(true)};
  const enter=()=>void start(false);
  window.addEventListener('ynot:room-camera-preview',preview);window.addEventListener('ynot:room-live-camera-open',enter);window.addEventListener('ynot:room-onboarding-complete',enter);
  return()=>{window.removeEventListener('ynot:room-camera-preview',preview);window.removeEventListener('ynot:room-live-camera-open',enter);window.removeEventListener('ynot:room-onboarding-complete',enter)};
 },[start,adopt]);
 useEffect(()=>{
  if(ios())return;
  const click=(e:MouseEvent)=>{if((e.target as Element|null)?.closest?.('.yr-shutter')){e.preventDefault();e.stopImmediatePropagation();void start(false)}};
  document.addEventListener('click',click,true);return()=>document.removeEventListener('click',click,true)
 },[start]);
 const capture=()=>{const v=videoRef.current;if(!v||v.readyState<2)return;const c=document.createElement('canvas');const scale=Math.min(1,960/v.videoWidth);c.width=Math.round(v.videoWidth*scale);c.height=Math.round(v.videoHeight*scale);c.getContext('2d')?.drawImage(v,0,0,c.width,c.height);c.toBlob(blob=>{c.width=0;c.height=0;if(!blob)return;const input=document.querySelector<HTMLInputElement>('.yr input[type="file"][capture][accept*="image"]');if(!input)return;const dt=new DataTransfer();dt.items.add(new File([blob],`ynot-room-${Date.now()}.jpg`,{type:'image/jpeg'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}))},'image/jpeg',.78)};
 if(!active&&!error)return null;
 return <div className={`yr-live-camera${blurred?' is-preview':''}`} style={{position:'fixed',inset:0,zIndex:blurred?9997:10050,overflow:'hidden',background:'#080808',color:'#fff'}}>{active&&<video ref={attach} playsInline muted autoPlay style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',filter:blurred?'blur(12px) brightness(.62)':'none'}}/>}{blurred&&<div style={{position:'absolute',inset:0,background:'rgba(244,241,235,.12)'}}/>}{!blurred&&active&&<><div style={{position:'absolute',top:'calc(22px + env(safe-area-inset-top))',left:'50%',transform:'translateX(-50%)',textAlign:'center',zIndex:2}}><b style={{letterSpacing:2,fontSize:15}}>YNOT ROOM</b><div style={{fontSize:9,letterSpacing:2,opacity:.65}}>FRAME · CAPTURE · SCAN</div></div><button type="button" aria-label="Capture" onClick={capture} style={{position:'absolute',left:'50%',bottom:'calc(30px + env(safe-area-inset-bottom))',transform:'translateX(-50%)',width:84,height:84,borderRadius:'50%',border:'6px solid white',background:'rgba(255,255,255,.16)',zIndex:3}}><span style={{display:'block',width:64,height:64,borderRadius:'50%',background:'#fff',margin:'auto'}}/></button></>}{error&&<div role="alert" style={{position:'absolute',left:24,right:24,top:'38%',zIndex:5,textAlign:'center',padding:18,borderRadius:20,background:'#111d'}}>{error}</div>}</div>
}
