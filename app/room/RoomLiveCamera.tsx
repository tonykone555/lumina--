'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
type SavedScan={id:string;image:string;createdAt:number};
const KEY='ynot-room-saved-scans';
function readSaved():SavedScan[]{try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch{return []}}
export default function RoomLiveCamera(){
 const videoRef=useRef<HTMLVideoElement>(null),canvasRef=useRef<HTMLCanvasElement>(null),streamRef=useRef<MediaStream|null>(null),starting=useRef(false),openRef=useRef(false);
 const[active,setActive]=useState(false),[shot,setShot]=useState(''),[saved,setSaved]=useState<SavedScan[]>([]),[gallery,setGallery]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState('');
 const stop=useCallback(()=>{streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;starting.current=false;const v=videoRef.current;if(v)try{v.srcObject=null}catch{}},[]);
 useEffect(()=>{setSaved(readSaved());return()=>{openRef.current=false;stop()}},[stop]);
 // Keep the live stream attached even if React renders the video after permission resolves.
 useEffect(()=>{if(!active)return;const v=videoRef.current,s=streamRef.current;if(v&&s){v.srcObject=s;void v.play().catch(()=>{})}},[active,error,shot]);
 const start=useCallback(async()=>{
  if(starting.current||openRef.current)return;
  if(!navigator.mediaDevices?.getUserMedia){setError('Live camera is unavailable in this browser. Use your phone camera instead.');setActive(true);openRef.current=true;return}
  starting.current=true;openRef.current=true;setShot('');setGallery(false);setError('');setActive(true);
  try{
   // Only invoked by an explicit user click. No camera streams are opened for onboarding.
   const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
   if(!openRef.current){stream.getTracks().forEach(t=>t.stop());return}
   streamRef.current=stream;
   const attach=()=>{if(!openRef.current)return;const v=videoRef.current;if(v){v.srcObject=stream;void v.play().catch(()=>setError('Tap to enable camera preview.'))}else requestAnimationFrame(attach)};
   requestAnimationFrame(attach);
  }catch(e){setError(e instanceof Error?`Camera unavailable: ${e.message}`:'Unable to open camera. Try your phone camera instead.')}finally{starting.current=false}
 },[]);
 const close=()=>{openRef.current=false;stop();setActive(false);setShot('');setError('')};
 const fallback=()=>{close();document.querySelector<HTMLInputElement>('input[type="file"][capture][accept*="image"]')?.click()};
 const frame=()=>{const v=videoRef.current,c=canvasRef.current;if(!v||!c||!v.videoWidth||!v.videoHeight)return'';const scale=Math.min(1,1280/v.videoWidth);c.width=Math.round(v.videoWidth*scale);c.height=Math.round(v.videoHeight*scale);const x=c.getContext('2d');if(!x)return'';x.drawImage(v,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.8)};
 const handoff=async(image:string)=>{try{const blob=await(await fetch(image)).blob();const input=document.querySelector<HTMLInputElement>('input[type="file"][capture][accept*="image"]');if(!input)return;const file=new File([blob],`ynot-room-${Date.now()}.jpg`,{type:'image/jpeg'});const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;close();input.dispatchEvent(new Event('change',{bubbles:true}))}catch{setError('Could not process the photo. Please try again.')}};
 const capture=()=>{const image=frame();if(!image){setError('Camera is starting. Please try again.');return}setShot(image);setStatus('');void handoff(image)};
 useEffect(()=>{const onOpen=()=>void start();window.addEventListener('ynot:room-live-camera-open',onOpen);return()=>window.removeEventListener('ynot:room-live-camera-open',onOpen)},[start]);
 useEffect(()=>{const onClick=(e:MouseEvent)=>{if(openRef.current)return;const el=e.target as Element|null;if(!el?.closest?.('.yr-shutter'))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();void start()};document.addEventListener('click',onClick,true);return()=>document.removeEventListener('click',onClick,true)},[start]);
 const save=(image=shot)=>{if(!image)return;const next=[{id:String(Date.now()),image,createdAt:Date.now()},...readSaved().filter(x=>x.image!==image)].slice(0,5);try{localStorage.setItem(KEY,JSON.stringify(next));setSaved(next);setStatus('Saved')}catch{setStatus('Storage full');return}window.dispatchEvent(new CustomEvent('ynot-room-scan-saved',{detail:next[0]}))};
 const useScan=(s:SavedScan)=>{setGallery(false);void handoff(s.image);window.dispatchEvent(new CustomEvent('ynot-room-saved-scan-selected',{detail:s}))};
 if(!active)return null;
 return <div style={{position:'fixed',inset:0,zIndex:10050,overflow:'hidden',background:'#080808',isolation:'isolate',color:'#fff'}}>
  {!shot&&!error&&<video ref={videoRef} playsInline muted autoPlay style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>}
  {shot&&<img src={shot} alt="Current scan" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>}
  <canvas ref={canvasRef} hidden/>
  <button type="button" aria-label="Close camera" onClick={close} style={{position:'absolute',left:22,top:'calc(18px + env(safe-area-inset-top))',width:48,height:48,borderRadius:50,border:'1px solid #ffffff66',background:'#1119',color:'#fff',fontSize:30,zIndex:13}}>×</button>
  <div style={{position:'absolute',top:'calc(22px + env(safe-area-inset-top))',left:'50%',transform:'translateX(-50%)',textAlign:'center',zIndex:12}}><b style={{letterSpacing:2,fontSize:15}}>YNOT ROOM</b><div style={{fontSize:9,letterSpacing:2,opacity:.65}}>FRAME · CAPTURE · SCAN</div></div>
  {error&&<div role="alert" style={{position:'absolute',left:24,right:24,top:'35%',textAlign:'center',lineHeight:1.6}}>{error}<br/><button type="button" onClick={fallback} style={{marginTop:20,padding:'14px 22px',border:0,borderRadius:99,background:'#fff',color:'#111',fontWeight:700}}>Open phone camera</button></div>}
  {!shot&&!error&&<button type="button" aria-label="Capture" onClick={capture} style={{position:'absolute',left:'50%',bottom:'calc(30px + env(safe-area-inset-bottom))',transform:'translateX(-50%)',width:84,height:84,borderRadius:50,border:'6px solid white',background:'rgba(255,255,255,.16)',zIndex:12}}><span style={{display:'block',width:64,height:64,borderRadius:50,background:'#fff',margin:'auto'}}/></button>}
  <button type="button" aria-label="Saved scans" onClick={()=>setGallery(true)} style={{position:'absolute',right:24,bottom:'calc(43px + env(safe-area-inset-bottom))',width:58,height:58,borderRadius:50,border:'1px solid #ffffff77',background:'#1118',color:'#fff',fontSize:29,zIndex:13}}>♡</button>
  {shot&&<button type="button" onClick={()=>save()} style={{position:'absolute',bottom:36,left:20,right:20,padding:14,borderRadius:40,color:'#fff',background:'#2229'}}>♡ {status||'Save this scan'}</button>}
  {gallery&&<div style={{position:'absolute',inset:0,zIndex:30,background:'#101010',padding:'max(58px,env(safe-area-inset-top)) 20px 28px',overflowY:'auto'}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}><strong>Saved scans</strong><button onClick={()=>setGallery(false)} style={{color:'#fff',background:'none',border:0,fontSize:26}}>×</button></div>{saved.length?<div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12}}>{saved.map(s=><button key={s.id} onClick={()=>useScan(s)} style={{padding:0,border:0,background:'none'}}><img src={s.image} alt="Saved scan" style={{width:'100%',aspectRatio:'1/1.2',objectFit:'cover',borderRadius:20}}/></button>)}</div>:<p>No saved scans yet.</p>}</div>}
 </div>
}
