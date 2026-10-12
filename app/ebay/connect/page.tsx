"use client";
import {useState} from "react";
export default function EbayConnect(){
 const [pin,setPin]=useState("");const [loading,setLoading]=useState(false);const [error,setError]=useState("");
 async function begin(){
  setError("");setLoading(true);
  try {
   const res=await fetch("/api/ebay/oauth/owner-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin})});
   if(!res.ok)throw new Error("Owner verification failed");
   window.location.assign("/api/ebay/oauth/start");
  }catch(e){setError(e instanceof Error?e.message:"Connection failed");setLoading(false)}
 }
 return <main style={{maxWidth:560,margin:"10vh auto",padding:24,fontFamily:"system-ui"}}>
  <p style={{opacity:.65}}>YNOT / eBay</p><h1>Connect eBay</h1>
  <p>Connect your existing eBay seller account without relying on the Supabase admin login.</p>
  <label>Existing eBay dashboard PIN<input type="password" autoComplete="off" value={pin} onChange={e=>setPin(e.target.value)} style={{display:"block",width:"100%",padding:12,margin:"12px 0"}}/></label>
  <button onClick={begin} disabled={!pin||loading} style={{padding:"12px 18px",borderRadius:10}}>{loading?"Connecting…":"Continue to eBay"}</button>
  {error&&<p role="alert">{error}</p>}
  <p style={{opacity:.7,marginTop:24}}>Your PIN is verified by YNOT and is not sent to eBay. Your existing seller account remains unchanged.</p>
 </main>
}
