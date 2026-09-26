"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,CheckCircle2,ExternalLink,LoaderCircle,TriangleAlert} from "lucide-react";

type Assets={render?:string;heatmap?:string;edges?:string};
type ViewReport={view?:string;viewKey?:string;score?:number;coverageScore?:number;structureScore?:number;photometricScore?:number;status?:string;blockers?:string[];assets?:Assets};
type RoomStatus={id?:string;status?:string;releaseStatus?:string;referenceCoverage?:number;matchedCameraCount?:number;qa?:{status?:string;averageScore?:number;blockers?:Array<{view?:string;code?:string;severity?:string}>;canPublish?:boolean;viewReports?:ViewReport[]}};

function pct(value?:number){return typeof value==="number"?`${Math.round(value*100)}%`:"—"}
function label(value?:string){if(value==="publishable")return"Publishable";if(value==="review_required")return"Review required";return"Draft"}

export default function ReviewClient({id}:{id:string}){
  const[data,setData]=useState<RoomStatus|null>(null);
  const[error,setError]=useState("");
  useEffect(()=>{
    let cancelled=false;
    const run=async()=>{
      try{
        const response=await fetch(`/api/room/jobs?id=${encodeURIComponent(id)}`,{cache:"no-store"});
        const body=await response.json();
        if(!response.ok)throw new Error(body?.error||"Could not load room QA");
        if(!cancelled)setData(body);
      }catch(err){if(!cancelled)setError(err instanceof Error?err.message:"Could not load room QA")}
    };
    run();
    return()=>{cancelled=true};
  },[id]);

  if(error)return <main style={{minHeight:"100vh",background:"#080909",color:"#fff",padding:40}}><Link href="/room" style={{color:"inherit"}}>← Room</Link><p>{error}</p></main>;
  if(!data)return <main style={{minHeight:"100vh",background:"#080909",color:"#fff",display:"grid",placeItems:"center"}}><LoaderCircle className="qa-spin"/></main>;

  const reports=data.qa?.viewReports||[];
  const blockers=data.qa?.blockers||[];
  return <main style={{minHeight:"100vh",background:"#080909",color:"#f5f5ef",fontFamily:"ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif"}}>
    <header style={{height:72,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 clamp(18px,4vw,52px)",borderBottom:"1px solid rgba(255,255,255,.08)",position:"sticky",top:0,zIndex:20,background:"rgba(8,9,9,.9)",backdropFilter:"blur(20px)"}}>
      <Link href="/room" style={{display:"inline-flex",alignItems:"center",gap:8,color:"inherit",textDecoration:"none",fontWeight:750}}><ArrowLeft size={17}/>YNOT Room</Link>
      <span style={{fontSize:12,opacity:.55}}>QA EVIDENCE</span>
      <span style={{fontSize:12,padding:"6px 10px",borderRadius:999,border:"1px solid rgba(255,255,255,.12)"}}>{label(data.releaseStatus)}</span>
    </header>
    <section style={{maxWidth:1280,margin:"0 auto",padding:"44px clamp(18px,4vw,52px) 80px"}}>
      <h1 style={{fontSize:"clamp(34px,5vw,64px)",letterSpacing:"-.055em",margin:"0 0 10px"}}>Room evidence</h1>
      <p style={{margin:"0 0 28px",opacity:.55,maxWidth:720,lineHeight:1.5}}>Each reconstructed camera is rendered back against its source image. Green edges are reference edges, red are reconstructed edges, and yellow marks overlap.</p>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:34}}>
        {[`QA ${pct(data.qa?.averageScore)}`,`${data.matchedCameraCount||0} matched cameras`,`Coverage ${pct(data.referenceCoverage)}`,`${blockers.length} blocker${blockers.length===1?"":"s"}`].map(item=><span key={item} style={{padding:"8px 11px",borderRadius:999,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.09)",fontSize:12}}>{item}</span>)}
      </div>

      <div style={{display:"grid",gap:22}}>
        {reports.map((report,index)=>{
          const assets=report.assets||{};
          const blocked=(report.blockers||[]).length>0;
          return <article key={report.view||index} style={{border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.03)",borderRadius:24,padding:16}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:14}}>
              <div><strong style={{display:"flex",alignItems:"center",gap:7}}>{blocked?<TriangleAlert size={16}/>:<CheckCircle2 size={16}/>} {report.view||`View ${index+1}`}</strong><div style={{fontSize:12,opacity:.5,marginTop:4}}>Score {pct(report.score)} · Structure {pct(report.structureScore)} · Coverage {pct(report.coverageScore)}</div></div>
              <span style={{fontSize:11,opacity:.6}}>{blocked?"Review required":"Passed"}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10}} className="qa-grid">
              {([['render','Matched render'],['heatmap','Mismatch heatmap'],['edges','Edge overlay']] as const).map(([kind,title])=>assets[kind]?<a key={kind} href={assets[kind]} target="_blank" rel="noreferrer" style={{color:"inherit",textDecoration:"none",borderRadius:16,overflow:"hidden",border:"1px solid rgba(255,255,255,.08)",background:"#111"}}><img src={assets[kind]} alt={`${title} ${report.view||""}`} style={{display:"block",width:"100%",aspectRatio:"4/3",objectFit:"cover"}}/><span style={{height:38,padding:"0 11px",display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:11,opacity:.7}}>{title}<ExternalLink size={12}/></span></a>:null)}
            </div>
            {blocked&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:12}}>{(report.blockers||[]).map(code=><span key={code} style={{fontSize:10,padding:"5px 8px",borderRadius:999,background:"rgba(255,172,120,.09)",border:"1px solid rgba(255,172,120,.15)"}}>{code.replaceAll("_"," ")}</span>)}</div>}
          </article>;
        })}
      </div>
    </section>
    <style jsx global>{`.qa-spin{animation:qa-spin .9s linear infinite}@keyframes qa-spin{to{transform:rotate(360deg)}}@media(max-width:760px){.qa-grid{grid-template-columns:1fr!important}}`}</style>
  </main>;
}
