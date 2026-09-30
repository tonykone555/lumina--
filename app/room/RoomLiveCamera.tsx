'use client';
import {useCallback,useEffect,useRef,useState} from 'react';

type SavedScan={id:string;image:string;createdAt:number};
const KEY='ynot-room-saved-scans';
function readSaved():SavedScan[]{try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(value)?value:[]}catch{return []}}
export default function RoomLiveCamera(){
 const videoRef=useRef<HTMLVideoElement>(null);
 const streamRef=useRef<MediaStream|null>(null);
 const openingRef=useRef(false);
 const activeRef=useRef(false);
 const[active,setActive]=useState(false);
 const[error,setError]=useState('');
 const[busy,setBusy]=useState(false);
 const[shot,setShot]=useState('');
 const[shotBlob,setShotBlob]=useState<Blob|null>(null);
 const[saved,setSaved]=useState<SavedScan[]>([]);
 const[gallery,setGallery]=useState(false);
 const[status,setStatus]=useState('');
 const stopStream=useCallback(()=>{
  const stream=streamRef.current;streamRef.current=null;
  if(stream){for(const track of stream.getTracks()){try{track.stop()}catch{}}}
  if(videoRef.current){try{videoRef.current.pause();videoRef.current.srcObject=null}catch{}}
 },[]);
 useEffect(()=>{setSaved(readSaved());return()=>{activeRef.current=false;stopStream()}},[stopStream]);
 const attachVideo=useCallback((node:HTMLVideoElement|null)=>{
  videoRef.current=node;
  if(node&&streamRef.current){
   try{node.srcObject=streamRef.current;void node.play().catch(()=>setError('Tap to resume the camera preview.'))}catch{setError('Unable to display the live camera.')}
  }
 },[]);
 const start=useCallback(async()=>{
  if(openingRef.current||activeRef.current)return;
  openingRef.current=true;activeRef.current=true;
  setError('');setShot('');setShotBlob(null);setGallery(false);setBusy(false);setStatus('');
  // The onboarding plays a separate promotional video; pause it before camera permission.
  document.querySelectorAll<HTMLVideoElement>('.ro-video, .yri video, .yr-inspo-strip video').forEach(video=>{try{video.pause()}catch{}});
  setActive(true);
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('This browser does not support live camera access.');
   // Request in the user's click event; use modest resolution to avoid iOS Safari memory spikes.
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:960},height:{ideal:540},frameRate:{ideal:24,max:30}}});
   if(!activeRef.current){stream.getTracks().forEach(track=>track.stop());return}
   streamRef.current=stream;
   if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play().catch(()=>setError('Tap to resume the camera preview.'))}
  }catch(err){if(activeRef.current)setError(err instanceof Error?err.message:'Camera unavailable. Check Safari camera permissions.')}finally{openingRef.current=false}
 },[]);
 const close=()=>{activeRef.current=false;stopStream();setActive(false);setShot('');setShotBlob(null);setError('');setBusy(false)};
 const fallback=()=>{const input=document.querySelector<HTMLInputElement>('.yr input[type="file"][capture][accept*="image"]');close();input?.click()};
 const capture=()=>{
  if(busy)return;
  const video=videoRef.current;
  if(!video||video.readyState<2||!video.videoWidth){setError('Camera is still starting. Please try again.');return}
  setBusy(true);
  try{
   const canvas=document.createElement('canvas');
   const scale=Math.min(1,960/video.videoWidth);
   canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
   const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Could not capture the image.');
   ctx.drawImage(video,0,0,canvas.width,canvas.height);
   canvas.toBlob(blob=>{
    canvas.width=0;canvas.height=0;
    if(!activeRef.current)return;
    if(!blob){setError('Could not capture the image.');setBusy(false);return}
    const src=URL.createObjectURL(blob);
    setShot(src);setShotBlob(blob);setBusy(false);stopStream();
   },'image/jpeg',0.78);
  }catch(err){setBusy(false);setError(err instanceof Error?err.message:'Could not capture the image.')}
 };
 useEffect(()=>()=>{if(shot)URL.revokeObjectURL(shot)},[shot]);
 const handoff=(blob:Blob)=>{
  try{
   const input=document.querySelector<HTMLInputElement>('.yr input[type="file"][capture][accept*="image"]');
   if(!input){setError('Room scanner is unavailable. Please try again.');return}
   const file=new File([blob],`ynot-room-${Date.now()}.jpg`,{type:'image/jpeg'});
   const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;
   close();input.dispatchEvent(new Event('change',{bubbles:true}));
  }catch{setError('Could not pass this photo to the scanner. Please retry.')}
 };
 useEffect(()=>{
  const onOpen=()=>{void start()};
  window.addEventListener('ynot:room-live-camera-open',onOpen);
  return()=>window.removeEventListener('ynot:room-live-camera-open',onOpen);
 },[start]);
 useEffect(()=>{
  const onClick=(event:MouseEvent)=>{
   if(activeRef.current)return;
   const target=event.target as Element|null;
   if(!target?.closest?.('.yr-shutter'))return;
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
   void start();
  };
  document.addEventListener('click',onClick,true);
  return()=>document.removeEventListener('click',onClick,true);
 },[start]);
 const save=()=>{
  if(!shot)return;
  try{
   const item={id:String(Date.now()),image:shot,createdAt:Date.now()};
   // Blob URLs do not survive reload; a saved scan must fit local storage.
   if(!shotBlob)return;
   const reader=new FileReader();
   reader.onload=()=>{
    try{const image=String(reader.result||'');const savedItem={...item,image};const next=[savedItem,...readSaved().filter(x=>x.image!==image)].slice(0,5);localStorage.setItem(KEY,JSON.stringify(next));setSaved(next);setStatus('Saved');window.dispatchEvent(new CustomEvent('ynot-room-scan-saved',{detail:savedItem}))}catch{setStatus('Storage is full')}
   };
   reader.readAsDataURL(shotBlob);
  }catch{setStatus('Unable to save')}
 };
 const useScan=async(scan:SavedScan)=>{
  try{const blob=await(await fetch(scan.image)).blob();setGallery(false);handoff(blob);window.dispatchEvent(new CustomEvent('ynot-room-saved-scan-selected',{detail:scan}))}catch{setError('Could not load the saved scan.')}
 };
 if(!active)return null;
 return <div className="yr-live-camera" style={{position:'fixed',inset:0,zIndex:10050,overflow:'hidden',background:'#080808',isolation:'isolate',color:'#fff'}}>
  {!shot&&<video ref={attachVideo} playsInline muted autoPlay={false} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',background:'#080808'}}/>}
  {shot&&<img src={shot} alt="Captured room" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>}
  <button type="button" aria-label="Close camera" onClick={close} style={{position:'absolute',left:22,top:'calc(18px + env(safe-area-inset-top))',width:48,height:48,borderRadius:50,border:'1px solid #ffffff66',background:'#1119',color:'#fff',fontSize:30,zIndex:13}}>×</button>
  <div style={{position:'absolute',top:'calc(22px + env(safe-area-inset-top))',left:'50%',transform:'translateX(-50%)',textAlign:'center',zIndex:12}}><b style={{letterSpacing:2,fontSize:15}}>YNOT ROOM</b><div style={{fontSize:9,letterSpacing:2,opacity:.65}}>FRAME · CAPTURE · SCAN</div></div>
  {error&&<div role="alert" style={{position:'absolute',left:24,right:24,top:'33%',textAlign:'center',lineHeight:1.6,background:'#111b',borderRadius:18,padding:16,zIndex:15}}>{error}<div style={{display:'flex',justifyContent:'center',gap:9,marginTop:16}}>{streamRef.current&&<button onClick={()=>{setError('');void videoRef.current?.play()}} style={{padding:12,borderRadius:99,background:'#fff',color:'#111'}}>Resume</button>}<button type="button" onClick={fallback} style={{padding:'12px 16px',border:0,borderRadius:99,background:'#fff',color:'#111',fontWeight:700}}>Use phone camera</button></div></div>}
  {!shot&&!error&&<button type="button" aria-label="Capture" onClick={capture} disabled={busy} style={{position:'absolute',left:'50%',bottom:'calc(30px + env(safe-area-inset-bottom))',transform:'translateX(-50%)',width:84,height:84,borderRadius:50,border:'6px solid white',background:'rgba(255,255,255,.16)',zIndex:12}}><span style={{display:'block',width:64,height:64,borderRadius:50,background:'#fff',margin:'auto'}}/></button>}
  {shot&&<div style={{position:'absolute',left:18,right:18,bottom:'calc(28px + env(safe-area-inset-bottom))',display:'flex',gap:10,zIndex:14}}><button type="button" onClick={()=>{setShot('');setShotBlob(null);activeRef.current=false;setActive(false);window.setTimeout(()=>void start(),0)}} style={{flex:1,borderRadius:99,border:'1px solid #fff8',background:'#1119',color:'#fff',padding:14}}>Retake</button><button type="button" onClick={save} style={{flex:1,borderRadius:99,border:'1px solid #fff8',background:'#1119',color:'#fff',padding:14}}>{status||'Save'}</button><button type="button" onClick={()=>shotBlob&&handoff(shotBlob)} style={{flex:1,borderRadius:99,border:0,background:'#fff',color:'#111',padding:14,fontWeight:700}}>Scan</button></div>}
  {!shot&&<button type="button" aria-label="Saved scans" onClick={()=>setGallery(true)} style={{position:'absolute',right:24,bottom:'calc(43px + env(safe-area-inset-bottom))',width:58,height:58,borderRadius:50,border:'1px solid #ffffff77',background:'#1118',color:'#fff',fontSize:29,zIndex:13}}>♡</button>}
  {gallery&&<div style={{position:'absolute',inset:0,zIndex:30,background:'#101010',padding:'max(58px,env(safe-area-inset-top)) 20px 28px',overflowY:'auto'}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}><strong>Saved scans</strong><button type="button" onClick={()=>setGallery(false)} style={{color:'#fff',background:'none',border:0,fontSize:26}}>×</button></div>{saved.length?<div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12}}>{saved.map(scan=><button key={scan.id} onClick={()=>void useScan(scan)} style={{padding:0,border:0,background:'none'}}><img src={scan.image} alt="Saved scan" style={{width:'100%',aspectRatio:'1/1.2',objectFit:'cover',borderRadius:20}}/></button>)}</div>:<p>No saved scans yet.</p>}</div>}
 </div>;
}
