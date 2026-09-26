"use client";

import {Suspense,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {Canvas} from "@react-three/fiber";
import {Environment,OrbitControls,useGLTF} from "@react-three/drei";
import {ArrowLeft,Camera,Check,Home,ImagePlus,LoaderCircle,Sparkles,X} from "lucide-react";

const MAX_PHOTOS=8;
const MAX_EDGE=1600;
const JPEG_QUALITY=.82;

type QaReport={
  status?:string;
  averageScore?:number;
  viewReports?:Array<Record<string,unknown>>;
  blockers?:Array<Record<string,unknown>>;
  canPublish?:boolean;
};

type RoomJob={
  id?:string;
  status?:string;
  stage?:string;
  sceneUrl?:string;
  previewUrl?:string;
  message?:string;
  releaseStatus?:string;
  referenceCoverage?:number;
  matchedCameraCount?:number;
  matchedViews?:string[];
  qa?:QaReport;
};

async function compressImage(file:File){
  const objectUrl=URL.createObjectURL(file);
  try{
    const image=await new Promise<HTMLImageElement>((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error(`Could not read ${file.name}`));
      img.src=objectUrl;
    });
    const longest=Math.max(image.naturalWidth,image.naturalHeight);
    const scale=Math.min(1,MAX_EDGE/Math.max(1,longest));
    const width=Math.max(1,Math.round(image.naturalWidth*scale));
    const height=Math.max(1,Math.round(image.naturalHeight*scale));
    const canvas=document.createElement("canvas");
    canvas.width=width;
    canvas.height=height;
    const ctx=canvas.getContext("2d");
    if(!ctx)throw new Error("Image compression is unavailable in this browser");
    ctx.drawImage(image,0,0,width,height);
    const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",JPEG_QUALITY));
    if(!blob)throw new Error(`Could not prepare ${file.name}`);
    const clean=file.name.replace(/\.[^.]+$/,"").replace(/[^a-z0-9-_]+/gi,"-").slice(0,64)||"room-photo";
    return new File([blob],`${clean}.jpg`,{type:"image/jpeg",lastModified:Date.now()});
  }finally{
    URL.revokeObjectURL(objectUrl);
  }
}

function GeneratedScene({url}:{url:string}){
  const model=useGLTF(url);
  return <primitive object={model.scene} />;
}

function PlaceholderRoom(){
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-1.25,0]} receiveShadow>
      <planeGeometry args={[9,9]}/><meshStandardMaterial color="#d8d3c9" roughness={.9}/>
    </mesh>
    <mesh position={[0,1.25,-4]} receiveShadow><boxGeometry args={[9,5,.14]}/><meshStandardMaterial color="#ede9e0"/></mesh>
    <mesh position={[-4.43,1.25,0]} receiveShadow><boxGeometry args={[.14,5,8]}/><meshStandardMaterial color="#e6e1d8"/></mesh>
    <mesh position={[0,-.55,-.9]} castShadow><boxGeometry args={[3.4,.85,1.45]}/><meshStandardMaterial color="#706d69" roughness={.78}/></mesh>
    <mesh position={[0,-.05,-1.45]} castShadow><boxGeometry args={[3.5,.7,.28]}/><meshStandardMaterial color="#7f7b76" roughness={.78}/></mesh>
    <mesh position={[0,-.92,1.05]} castShadow><cylinderGeometry args={[.78,.78,.3,48]}/><meshStandardMaterial color="#443f3a" roughness={.72}/></mesh>
    <mesh position={[2.35,-.74,-.2]} castShadow><boxGeometry args={[1.1,1.05,1.1]}/><meshStandardMaterial color="#b4aa98" roughness={.8}/></mesh>
    <ambientLight intensity={1.25}/>
    <directionalLight position={[4,7,4]} intensity={2.2} castShadow/>
  </group>;
}

function RoomViewer({sceneUrl}:{sceneUrl?:string}){
  return <div style={{height:"100%",minHeight:420,borderRadius:28,overflow:"hidden",background:"radial-gradient(circle at 50% 0%,#313331 0%,#141515 58%,#0a0b0b 100%)",border:"1px solid rgba(255,255,255,.12)"}}>
    <Canvas camera={{position:[6,4.2,6],fov:42}} shadows dpr={[1,1.6]}>
      <Suspense fallback={null}>{sceneUrl?<><GeneratedScene url={sceneUrl}/><Environment preset="apartment"/></>:<PlaceholderRoom/>}</Suspense>
      <OrbitControls makeDefault enablePan target={[0,-.1,0]} minDistance={1} maxDistance={18}/>
    </Canvas>
  </div>;
}

function releaseLabel(value?:string){
  if(value==="publishable")return "Publishable";
  if(value==="review_required")return "Review required";
  if(value==="processing")return "Draft";
  return "Draft";
}

export default function RoomExperience(){
  const[files,setFiles]=useState<File[]>([]);
  const[style,setStyle]=useState("modern");
  const[budget,setBudget]=useState("2500");
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");
  const[job,setJob]=useState<RoomJob|null>(null);
  const previews=useMemo(()=>files.map(file=>({file,url:URL.createObjectURL(file)})),[files]);

  useEffect(()=>()=>previews.forEach(preview=>URL.revokeObjectURL(preview.url)),[previews]);

  useEffect(()=>{
    const qaComplete=job?.qa?.status==="complete";
    if(!job?.id||job.status==="failed"||(job.status==="ready"&&qaComplete))return;
    let cancelled=false;
    const poll=async()=>{
      try{
        const response=await fetch(`/api/room/jobs?id=${encodeURIComponent(job.id!)}`,{cache:"no-store"});
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data?.error||"Could not read reconstruction status");
        if(!cancelled)setJob(current=>current?.id===job.id?{...current,...data}:current);
      }catch(err){
        if(!cancelled)console.warn("[ynot-room] status poll",err);
      }
    };
    poll();
    const timer=window.setInterval(poll,3000);
    return()=>{cancelled=true;window.clearInterval(timer)};
  },[job?.id,job?.status,job?.qa?.status]);

  useEffect(()=>{
    if(job?.status==="failed")setError(job.message||"Room reconstruction failed. Try another set of photos.");
  },[job?.status,job?.message]);

  function addFiles(list:FileList|null){
    if(!list)return;
    const next=[...files,...Array.from(list).filter(file=>file.type.startsWith("image/"))].slice(0,MAX_PHOTOS);
    setFiles(next);setError("");
  }
  function removeFile(index:number){setFiles(current=>current.filter((_,i)=>i!==index));setJob(null)}
  async function createRoom(){
    if(files.length<3){setError("Add at least 3 room photos so YNOT has enough viewpoints.");return}
    setLoading(true);setError("");setJob(null);
    try{
      const prepared=await Promise.all(files.map(compressImage));
      const body=new FormData();
      prepared.forEach(file=>body.append("photos",file,file.name));
      body.set("style",style);
      body.set("budget",budget);
      body.set("roomType","living_room");
      const response=await fetch("/api/room/jobs",{method:"POST",body});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data?.error||data?.message||"Could not start room generation");
      setJob(data);
    }catch(err){setError(err instanceof Error?err.message:"Could not start room generation")}finally{setLoading(false)}
  }

  const reconstructing=Boolean(job?.id&&job.status!=="ready"&&job.status!=="failed");
  const ready=job?.status==="ready"&&Boolean(job.sceneUrl);
  const qaRunning=ready&&job?.qa?.status!=="complete";
  const qaScore=typeof job?.qa?.averageScore==="number"?Math.round(job.qa.averageScore*100):null;
  const coverage=typeof job?.referenceCoverage==="number"?Math.round(job.referenceCoverage*100):null;
  const blockerCount=job?.qa?.blockers?.length||0;

  return <main style={{minHeight:"100vh",background:"#080909",color:"#f5f5ef",fontFamily:"ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif"}}>
    <header style={{height:72,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 clamp(18px,4vw,52px)",borderBottom:"1px solid rgba(255,255,255,.08)",position:"sticky",top:0,zIndex:20,backdropFilter:"blur(22px)",background:"rgba(8,9,9,.82)"}}>
      <Link href="/" style={{display:"inline-flex",alignItems:"center",gap:10,color:"inherit",textDecoration:"none",fontWeight:800,letterSpacing:"-.04em"}}><ArrowLeft size={18}/>YNOT</Link>
      <div style={{display:"flex",alignItems:"center",gap:8,fontSize:13,opacity:.72}}><Home size={15}/> ROOM <span style={{opacity:.45}}>BETA</span></div>
      <Link href="/" style={{color:"inherit",textDecoration:"none",fontSize:13,opacity:.68}}>Shop</Link>
    </header>

    <section style={{maxWidth:1320,margin:"0 auto",padding:"clamp(34px,6vw,78px) clamp(18px,4vw,52px) 72px"}}>
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,.9fr) minmax(420px,1.1fr)",gap:"clamp(26px,5vw,72px)",alignItems:"start"}} className="ynot-room-grid">
        <div>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"7px 11px",borderRadius:999,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.05)",fontSize:12,letterSpacing:".04em",marginBottom:20}}><Sparkles size={14}/>YNOT ROOM</div>
          <h1 style={{fontSize:"clamp(42px,6vw,78px)",lineHeight:.96,letterSpacing:"-.065em",margin:"0 0 22px",maxWidth:680}}>Turn your room into a shoppable world.</h1>
          <p style={{fontSize:"clamp(16px,2vw,20px)",lineHeight:1.55,opacity:.65,maxWidth:620,margin:"0 0 34px"}}>Photograph the room from several angles. YNOT reconstructs the room, aligns the recovered cameras, then checks the generated scene against your original reference views before it is considered ready for release.</p>

          <div style={{display:"grid",gap:14}}>
            <label style={{display:"grid",placeItems:"center",minHeight:156,border:"1px dashed rgba(255,255,255,.23)",borderRadius:24,background:"rgba(255,255,255,.035)",cursor:"pointer",padding:24,textAlign:"center"}}>
              <input type="file" accept="image/*" multiple onChange={event=>{addFiles(event.target.files);event.currentTarget.value=""}} style={{display:"none"}}/>
              <ImagePlus size={25}/><strong style={{marginTop:10,fontSize:15}}>Add 3–8 room photos</strong><span style={{fontSize:13,opacity:.5,marginTop:5}}>Front, left, right and opposite corners work best.</span>
            </label>

            {previews.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:9}}>{previews.map(({file,url},index)=><div key={`${file.name}-${file.lastModified}-${index}`} style={{position:"relative",aspectRatio:"1.25",borderRadius:15,overflow:"hidden",background:"#171818",border:"1px solid rgba(255,255,255,.1)"}}><img src={url} alt={`Room view ${index+1}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/><button type="button" onClick={()=>removeFile(index)} aria-label={`Remove room view ${index+1}`} style={{position:"absolute",right:6,top:6,width:26,height:26,borderRadius:999,border:"1px solid rgba(255,255,255,.16)",background:"rgba(0,0,0,.64)",color:"white",display:"grid",placeItems:"center",cursor:"pointer"}}><X size={13}/></button></div>)}</div>}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <label style={{display:"grid",gap:7,fontSize:12,opacity:.72}}>Style<select value={style} onChange={e=>setStyle(e.target.value)} style={{height:48,borderRadius:14,border:"1px solid rgba(255,255,255,.12)",background:"#111212",color:"#f5f5ef",padding:"0 13px",fontSize:14}}><option value="modern">Modern</option><option value="japandi">Japandi</option><option value="minimal">Minimal</option><option value="warm">Warm</option><option value="luxury">Luxury</option></select></label>
              <label style={{display:"grid",gap:7,fontSize:12,opacity:.72}}>Target budget<input inputMode="numeric" value={budget} onChange={e=>setBudget(e.target.value.replace(/[^0-9]/g,""))} style={{height:46,borderRadius:14,border:"1px solid rgba(255,255,255,.12)",background:"#111212",color:"#f5f5ef",padding:"0 13px",fontSize:14}} placeholder="2500"/></label>
            </div>

            <button type="button" onClick={createRoom} disabled={loading||reconstructing||files.length<3} style={{height:54,borderRadius:999,border:0,background:files.length>=3?"#f4f3ed":"#434442",color:files.length>=3?"#0a0b0b":"#92938f",fontWeight:750,fontSize:15,cursor:files.length>=3&&!loading&&!reconstructing?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",gap:9}}>{loading||reconstructing?<><LoaderCircle size={18} className="ynot-room-spin"/>{job?.stage==="reconstructing"?"Building 3D room…":"Preparing room…"}</>:qaRunning?<><LoaderCircle size={18} className="ynot-room-spin"/>Checking reference views…</>:ready?<><Check size={18}/>Room reconstructed</>:<><Camera size={18}/>Create my room</>}</button>
            {error&&<p style={{margin:0,color:"#ffb1a8",fontSize:13,lineHeight:1.45}}>{error}</p>}
            {job&&<div style={{padding:"14px 16px",borderRadius:16,border:"1px solid rgba(132,255,174,.18)",background:"rgba(80,177,111,.09)",fontSize:13,lineHeight:1.5}}>
              <strong style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:5}}>
                <span style={{display:"flex",alignItems:"center",gap:7}}>{reconstructing||qaRunning?<LoaderCircle size={15} className="ynot-room-spin"/>:<Check size={15}/>} {ready?"3D room":reconstructing?"Reconstructing room":"Room job"}</span>
                <span style={{padding:"4px 8px",borderRadius:999,border:"1px solid rgba(255,255,255,.13)",background:"rgba(255,255,255,.06)",fontSize:11,letterSpacing:".03em"}}>{releaseLabel(job.releaseStatus)}</span>
              </strong>
              <span style={{opacity:.72}}>{qaRunning?"Comparing the reconstructed room with the recovered reference cameras…":job.message||`Status: ${job.status||"queued"}`}</span>
              {job.qa?.status==="complete"&&<div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:9,fontSize:11,opacity:.7}}>
                {job.matchedCameraCount!==undefined&&<span>{job.matchedCameraCount} matched cameras</span>}
                {coverage!==null&&<span>· {coverage}% reference coverage</span>}
                {qaScore!==null&&<span>· QA {qaScore}%</span>}
                <span>· {blockerCount} blocker{blockerCount===1?"":"s"}</span>
              </div>}
              {job.id&&<div style={{opacity:.42,marginTop:3}}>Job {job.id}</div>}
            </div>}
          </div>
        </div>

        <div style={{position:"sticky",top:96,height:"min(70vh,700px)"}}>
          <RoomViewer sceneUrl={job?.sceneUrl}/>
          <div style={{position:"absolute",left:18,right:18,bottom:18,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:18,background:"rgba(10,11,11,.7)",backdropFilter:"blur(18px)",border:"1px solid rgba(255,255,255,.1)",fontSize:12,pointerEvents:"none"}}><span style={{opacity:.62}}>{qaRunning?"Matched-camera QA in progress":ready?`${releaseLabel(job?.releaseStatus)} room surface`:reconstructing?"GPU reconstruction in progress":"Interactive preview shell"}</span><span style={{opacity:.45}}>Drag to orbit · pinch/scroll to zoom</span></div>
        </div>
      </div>
    </section>

    <style jsx global>{`
      .ynot-room-spin{animation:ynot-room-spin .9s linear infinite}
      @keyframes ynot-room-spin{to{transform:rotate(360deg)}}
      @media(max-width:900px){.ynot-room-grid{grid-template-columns:1fr!important}.ynot-room-grid>div:last-child{position:relative!important;top:auto!important;height:480px!important}}
      @media(max-width:560px){.ynot-room-grid>div:first-child>div:nth-of-type(2) div[style*="repeat(4"]{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
    `}</style>
  </main>;
}
