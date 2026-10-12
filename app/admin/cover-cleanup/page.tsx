"use client";
import {useState} from "react";
export default function CoverCleanupPage(){
 const [code,setCode]=useState("");
 const [preview,setPreview]=useState<any>(null);
 const [busy,setBusy]=useState(false);
 const [deleted,setDeleted]=useState(0);
 const [error,setError]=useState("");
 const call=async(method:"GET"|"POST")=>{
  const res=await fetch("/api/admin/cover-retention",{method,headers:{"Authorization":`Bearer ${code}`,"Content-Type":"application/json"},...(method==="POST"?{body:JSON.stringify({confirm:"DELETE_SURPLUS_COVERS"})}:{})});
  const data=await res.json();
  if(!res.ok)throw new Error(data.error||"Request failed");
  return data;
 };
 const inspect=async()=>{setBusy(true);setError("");try{setPreview(await call("GET"))}catch(e){setError(String(e))}finally{setBusy(false)}};
 const clean=async()=>{
  if(!window.confirm("Permanently delete surplus album covers, keeping 2 per folder?"))return;
  setBusy(true);setError("");
  try {
   for(let i=0;i<100;i++){
    const r=await call("POST");setDeleted(n=>n+r.deleted);
    if(r.done)break;
   }
   setPreview(await call("GET"));
  }catch(e){setError(String(e))}finally{setBusy(false)}
 };
 return <main style={{maxWidth:620,margin:"10vh auto",padding:24,fontFamily:"system-ui"}}>
  <h1>YNOT cover cleanup</h1>
  <p>Delete surplus Pexels album covers only. Keep two per folder. Electric and all other storage are untouched.</p>
  <label>Admin PIN or YNOT MCP token <input type="password" value={code} onChange={e=>setCode(e.target.value)} autoComplete="off" style={{display:"block",width:"100%",padding:12,margin:"12px 0 20px"}} /></label>
  <button disabled={busy||!code} onClick={inspect} style={{padding:12,marginRight:12}}>Preview cleanup</button>
  {preview&&<section style={{marginTop:24}}><p>Album covers: {preview.albumTotal} across {preview.albumFolders} folders.</p><p><strong>{preview.surplus} files eligible for deletion</strong> ({Math.round(preview.estimatedBytes/1048576)} MB estimated).</p><button disabled={busy||!preview.surplus} onClick={clean} style={{padding:12,background:"#a11",color:"white",border:0,borderRadius:8}}>Delete surplus images</button></section>}
  {deleted>0&&<p>Removed this session: {deleted} files.</p>}
  {busy&&<p>Working… keep this page open.</p>}
  {error&&<p role="alert" style={{color:"crimson"}}>{error}</p>}
 </main>;
}
