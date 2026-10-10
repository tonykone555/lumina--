"use client";
import {useEffect,useState} from "react";
type Product={id:string;title:string;brand?:string};
type Hit={id:string;caption?:string;url?:string;thumbnail?:string|null};
export default function HfVideoPrivateTest({product}:{product:Product}){
 const[enabled,setEnabled]=useState(false);
 const[pass,setPass]=useState("");
 const[loading,setLoading]=useState(false);
 const[data,setData]=useState<{videos?:Hit[];candidateCount?:number;elapsedMs?:number;error?:string}|null>(null);
 useEffect(()=>{setEnabled(new URLSearchParams(window.location.search).get("hf_video_test")==="1")},[]);
 if(!enabled)return null;
 async function check(){
  setLoading(true);setData(null);
  try{
   const q=new URLSearchParams({source:"hf-private",title:product.title,brand:product.brand||""});
   const r=await fetch("/api/product-videos?"+q.toString(),{headers:{"x-ynot-hf-test-key":pass},cache:"no-store"});
   const v=await r.json();
   setData(r.ok?v:{error:v.error||"Search unavailable",videos:[]});
  }catch(e){setData({error:e instanceof Error?e.message:"Search failed",videos:[]})}
  finally{setLoading(false)}
 }
 return <section style={{padding:16,margin:"16px 0",border:"1px dashed #999",borderRadius:12,background:"#202020",color:"#fff"}}>
  <strong>Private Hugging Face video test</strong>
  <p style={{fontSize:12,opacity:.8}}>Research-only test of existing TikTok metadata. Not used for public product videos.</p>
  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
   <input type="password" aria-label="Research access key" autoComplete="off" placeholder="Private research access key" value={pass} onChange={e=>setPass(e.target.value)} style={{padding:10,flex:"1 1 130px",color:"#111"}}/>
   <button type="button" disabled={!pass||loading} onClick={()=>void check()} style={{padding:"10px 14px",background:"#fff",color:"#111",borderRadius:8}}>{loading?"Searching…":"Test Hugging Face"}</button>
  </div>
  {data&&<div style={{fontSize:12,marginTop:12}}>
   {data.error?<p>{data.error}</p>:<p>{data.candidateCount||0} records in {Math.round(data.elapsedMs||0)} ms</p>}
   {(data.videos||[]).map(v=><div key={v.id} style={{padding:"8px 0",borderTop:"1px solid #555"}}>
    <a href={v.url} target="_blank" rel="noopener noreferrer" style={{color:"#fff",textDecoration:"underline"}}>{v.caption||v.id}</a>
   </div>)}
  </div>}
 </section>
}