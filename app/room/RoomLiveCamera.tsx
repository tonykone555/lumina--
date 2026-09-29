'use client'

import { useEffect, useRef, useState } from 'react'

type SavedScan = { id:string; image:string; createdAt:number }
const KEY='ynot-room-saved-scans'
function readSaved():SavedScan[]{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}}

export default function RoomLiveCamera(){
 const videoRef=useRef<HTMLVideoElement>(null);const canvasRef=useRef<HTMLCanvasElement>(null)
 const[stream,setStream]=useState<MediaStream|null>(null),[active,setActive]=useState(false),[shot,setShot]=useState(''),[saved,setSaved]=useState<SavedScan[]>([]),[gallery,setGallery]=useState(false),[status,setStatus]=useState('')
 useEffect(()=>{setSaved(readSaved());return()=>stream?.getTracks().forEach(t=>t.stop())},[stream])
 const start=async()=>{setShot('');setActive(true);try{let s=stream;if(!s||!s.active){s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});setStream(s)}requestAnimationFrame(()=>{if(videoRef.current&&s){videoRef.current.srcObject=s;videoRef.current.play().catch(()=>{})}})}catch{setActive(false)}}
 const close=()=>{setActive(false);setShot('')}
 const frame=()=>{const v=videoRef.current,c=canvasRef.current;if(!v||!c||!v.videoWidth||!v.videoHeight)return'';c.width=v.videoWidth;c.height=v.videoHeight;const x=c.getContext('2d');if(!x)return'';x.drawImage(v,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.92)}
 const handoff=(image:string)=>{fetch(image).then(r=>r.blob()).then(blob=>{const file=new File([blob],`ynot-room-${Date.now()}.jpg`,{type:'image/jpeg'});const input=document.querySelector<HTMLInputElement>('input[type="file"][accept*="image"][capture]');if(!input)return;const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));setActive(false)}).catch(()=>{})}
 const capture=()=>{const image=frame();if(!image)return;setShot(image);setStatus('');setTimeout(()=>handoff(image),120)}
 useEffect(()=>{const intercept=(event:MouseEvent)=>{if(active)return;const target=event.target as Element|null;if(!target?.closest?.('.yr-shutter'))return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();void start()};document.addEventListener('click',intercept,true);return()=>document.removeEventListener('click',intercept,true)},[active,stream])
 const save=(image=shot)=>{if(!image)return;const item={id:String(Date.now()),image,createdAt:Date.now()};const next=[item,...readSaved().filter(x=>x.image!==image)].slice(0,24);localStorage.setItem(KEY,JSON.stringify(next));setSaved(next);setStatus('Saved');window.dispatchEvent(new CustomEvent('ynot-room-scan-saved',{detail:item}))}
 const useScan=(s:SavedScan)=>{setShot(s.image);setGallery(false);handoff(s.image);window.dispatchEvent(new CustomEvent('ynot-room-saved-scan-selected',{detail:s}))}
 if(!active)return null
 return <div style={{position:'fixed',inset:0,zIndex:10010,overflow:'hidden',background:'#000'}}>
  {!shot?<video ref={videoRef} playsInline muted autoPlay style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<img src={shot} alt="Current scan" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}<canvas ref={canvasRef} hidden/>
  <div style={{position:'absolute',inset:0,pointerEvents:'none',background:'linear-gradient(180deg,rgba(0,0,0,.24),transparent 22%,transparent 72%,rgba(0,0,0,.34))'}}/>
  <button aria-label="Close camera" onClick={close} style={{position:'absolute',left:22,top:'calc(18px + env(safe-area-inset-top))',width:48,height:48,borderRadius:'50%',border:'1px solid #ffffff66',background:'#1118',color:'#fff',fontSize:30,zIndex:13}}>×</button>
  <div style={{position:'absolute',top:'calc(22px + env(safe-area-inset-top))',left:'50%',transform:'translateX(-50%)',color:'#fff',textAlign:'center',zIndex:12}}><b style={{letterSpacing:2,fontSize:15}}>YNOT ROOM</b><div style={{fontSize:9,letterSpacing:2,opacity:.65}}>FRAME · CAPTURE · SCAN</div></div>
  {!shot&&<button aria-label="Capture" onClick={capture} style={{position:'absolute',left:'50%',bottom:'calc(30px + env(safe-area-inset-bottom))',transform:'translateX(-50%)',width:84,height:84,borderRadius:'50%',border:'6px solid white',background:'rgba(255,255,255,.16)',boxShadow:'0 8px 28px #0005',zIndex:12}}><span style={{display:'block',width:64,height:64,borderRadius:'50%',background:'#fff',margin:'auto'}}/></button>}
  <button aria-label="Saved scans" onClick={()=>setGallery(true)} style={{position:'absolute',right:24,bottom:'calc(43px + env(safe-area-inset-bottom))',width:58,height:58,borderRadius:'50%',border:'1px solid rgba(255,255,255,.55)',background:'rgba(20,20,20,.34)',backdropFilter:'blur(16px)',color:'#fff',fontSize:29,zIndex:13}}>♡</button>
  {shot&&<div style={{position:'absolute',left:18,right:18,bottom:'calc(35px + env(safe-area-inset-bottom))',zIndex:14,display:'flex',justifyContent:'center'}}><button onClick={()=>save()} style={{border:'1px solid rgba(255,255,255,.55)',borderRadius:999,padding:'13px 22px',background:'rgba(20,20,20,.4)',backdropFilter:'blur(18px)',color:'#fff',fontSize:15,fontWeight:650}}>♡ {status||'Save this scan'}</button></div>}
  {gallery&&<div style={{position:'absolute',inset:0,zIndex:30,background:'rgba(12,12,12,.72)',backdropFilter:'blur(22px)',padding:'max(58px,env(safe-area-inset-top)) 20px 28px',overflowY:'auto'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',color:'#fff',marginBottom:20}}><strong style={{fontSize:24}}>Saved scans</strong><button onClick={()=>setGallery(false)} style={{width:44,height:44,borderRadius:'50%',border:'1px solid #ffffff55',background:'#ffffff16',color:'#fff',fontSize:24}}>×</button></div>{saved.length?<div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12}}>{saved.map(s=><button key={s.id} onClick={()=>useScan(s)} style={{padding:0,border:0,borderRadius:20,overflow:'hidden',background:'#fff1'}}><img src={s.image} alt="Saved scan" style={{display:'block',width:'100%',aspectRatio:'1/1.2',objectFit:'cover'}}/></button>)}</div>:<div style={{color:'#fffb',textAlign:'center',paddingTop:80}}>Saved scans will appear here.</div>}</div>}
 </div>
}
