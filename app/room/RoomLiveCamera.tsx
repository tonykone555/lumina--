'use client'

import { useEffect, useRef, useState } from 'react'

type SavedScan = { id:string; image:string; createdAt:number }
const KEY='ynot-room-saved-scans'

function readSaved():SavedScan[]{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}}

export default function RoomLiveCamera(){
 const videoRef=useRef<HTMLVideoElement>(null); const canvasRef=useRef<HTMLCanvasElement>(null)
 const [stream,setStream]=useState<MediaStream|null>(null); const [shot,setShot]=useState(''); const [saved,setSaved]=useState<SavedScan[]>([]); const [gallery,setGallery]=useState(false); const [status,setStatus]=useState('')
 useEffect(()=>{setSaved(readSaved()); let live:MediaStream; navigator.mediaDevices?.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false}).then(s=>{live=s;setStream(s);if(videoRef.current){videoRef.current.srcObject=s;videoRef.current.play().catch(()=>{})}}).catch(()=>{}); return()=>live?.getTracks().forEach(t=>t.stop())},[])
 const capture=()=>{const v=videoRef.current,c=canvasRef.current;if(!v||!c)return;c.width=v.videoWidth||1080;c.height=v.videoHeight||1440;const x=c.getContext('2d');if(!x)return;x.drawImage(v,0,0,c.width,c.height);setShot(c.toDataURL('image/jpeg',.9));setStatus('')}
 const save=(image=shot)=>{if(!image)return;const item={id:String(Date.now()),image,createdAt:Date.now()};const next=[item,...readSaved().filter(x=>x.image!==image)].slice(0,24);localStorage.setItem(KEY,JSON.stringify(next));setSaved(next);setStatus('Saved');window.dispatchEvent(new CustomEvent('ynot-room-scan-saved',{detail:item}))}
 const useScan=(s:SavedScan)=>{setShot(s.image);setGallery(false);window.dispatchEvent(new CustomEvent('ynot-room-saved-scan-selected',{detail:s}))}
 return <div className="yr-live-camera" style={{position:'relative',width:'100%',height:'100%',overflow:'hidden',background:'#111'}}>
  {!shot?<video ref={videoRef} playsInline muted autoPlay style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<img src={shot} alt="Current scan" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
  <canvas ref={canvasRef} hidden/>
  <button aria-label="Capture" onClick={capture} style={{position:'absolute',left:'50%',bottom:'max(22px,env(safe-area-inset-bottom))',transform:'translateX(-50%)',width:82,height:82,borderRadius:'50%',border:'5px solid white',background:'rgba(255,255,255,.18)',boxShadow:'0 8px 28px #0005',zIndex:12}}/>
  <button aria-label="Saved scans" onClick={()=>setGallery(true)} style={{position:'absolute',right:24,bottom:'calc(max(22px,env(safe-area-inset-bottom)) + 12px)',width:58,height:58,borderRadius:'50%',border:'1px solid rgba(255,255,255,.55)',background:'rgba(20,20,20,.34)',backdropFilter:'blur(16px)',color:'#fff',fontSize:29,zIndex:13}}>♡</button>
  {shot&&<div style={{position:'absolute',left:18,right:18,bottom:'calc(max(22px,env(safe-area-inset-bottom)) + 116px)',zIndex:14,display:'flex',justifyContent:'center'}}><button onClick={()=>save()} style={{border:'1px solid rgba(255,255,255,.55)',borderRadius:999,padding:'13px 22px',background:'rgba(20,20,20,.4)',backdropFilter:'blur(18px)',color:'#fff',fontSize:15,fontWeight:650}}>♡ {status||'Save this scan'}</button></div>}
  {gallery&&<div style={{position:'absolute',inset:0,zIndex:30,background:'rgba(12,12,12,.72)',backdropFilter:'blur(22px)',padding:'max(58px,env(safe-area-inset-top)) 20px 28px',overflowY:'auto'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',color:'#fff',marginBottom:20}}><strong style={{fontSize:24}}>Saved scans</strong><button onClick={()=>setGallery(false)} style={{width:44,height:44,borderRadius:'50%',border:'1px solid #ffffff55',background:'#ffffff16',color:'#fff',fontSize:24}}>×</button></div>{saved.length?<div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12}}>{saved.map(s=><button key={s.id} onClick={()=>useScan(s)} style={{padding:0,border:0,borderRadius:20,overflow:'hidden',background:'#fff1'}}><img src={s.image} alt="Saved scan" style={{display:'block',width:'100%',aspectRatio:'1/1.2',objectFit:'cover'}}/></button>)}</div>:<div style={{color:'#fffb',textAlign:'center',paddingTop:80}}>Saved scans will appear here.</div>}</div>}
 </div>
}
