"use client";

import {useCallback,useEffect,useState} from "react";

type EtsyStatus={
 configured:boolean;
 connected:boolean;
 persistentConnected?:boolean;
 sessionConnected?:boolean;
 apiTokenAvailable?:boolean;
 storageError?:string|null;
 userId:string|null;
 scope:string|null;
 expiresAt:string|null;
 config?:{keystringConfigured:boolean;sharedSecretConfigured:boolean;envWhitespaceTrimmed:boolean;redirectUri:string;scopes:string};
 tokenSource?:"stored"|"session"|null;
 verification?:{verified:boolean;checkedAt:string;error?:string;step?:string;status?:number;user?:{user_id:number|null;shop_id:number|null};shop?:{shop_id:number|null;shop_name:string|null;url:string|null}|null;shopError?:string|null};
};

export default function EtsyIntegrationCard(){
 const [status,setStatus]=useState<EtsyStatus|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [oauthResult,setOauthResult]=useState<{state:string;error:string;storage:string}|null>(null);
 useEffect(()=>{
  const q=new URLSearchParams(window.location.search);
  const state=q.get("etsy_oauth");
  if(state)setOauthResult({state,error:q.get("etsy_error")||"",storage:q.get("etsy_storage")||""});
 },[]);
 const load=useCallback(async(verify=false)=>{
  try{
   const r=await fetch(`/api/etsy/oauth/status?${verify?"verify=1&":""}t=${Date.now()}`,{cache:"no-store",credentials:"include"});
   const data=await r.json().catch(()=>null);
   if(!r.ok) throw new Error(data?.error||"Could not read Etsy connection status");
   setStatus(data); setError("");
  }catch(e:any){setError(e?.message||"Could not read Etsy connection status");}
 },[]);
 useEffect(()=>{void load(true); const id=window.setTimeout(()=>void load(),1200); return()=>window.clearTimeout(id);},[load]);
 const connect=()=>{window.location.assign("/api/etsy/oauth/start?returnTo=/admin/etsy");};
 const disconnect=async()=>{
  if(!confirm("Disconnect Etsy from YNOT?")) return;
  setBusy(true); setError("");
  try{
   const r=await fetch("/api/etsy/oauth/disconnect",{method:"POST",credentials:"include"});
   if(!r.ok) throw new Error("Could not disconnect Etsy");
   await load();
  }catch(e:any){setError(e?.message||"Could not disconnect Etsy");}
  finally{setBusy(false);}
 };
 const hasWrite=Boolean(status?.scope?.split(/\s+/).includes("listings_w"));
 return <section className="etsyCard">
  <div className="etsyHead"><div><span>ETSY</span><h2>Shop integration</h2></div><div className={status?.connected?"etsyStatus connected":"etsyStatus"}><i/>{status?.connected?"Connected":"Not connected"}</div></div>
  <p className="etsyCopy">Keep Etsy publishing private to YNOT Admin. OAuth tokens remain server-side and are never exposed to shoppers.</p>
  {!status ? <div className="etsyMuted">Checking Etsy connection…</div> : <>
   <div className="etsyFacts">
    <div><small>API configuration</small><strong>{status.configured?"Ready":"Missing Etsy key"}</strong></div>
    <div><small>OAuth session</small><strong>{status.sessionConnected?"Connected":status.persistentConnected?"Stored":"Not found"}</strong></div>
    <div><small>Publishing permission</small><strong>{hasWrite?"listings_w ready":status.connected?"Reconnect to grant":"—"}</strong></div>
   </div>
   {oauthResult?.state==="error"&&<div className="etsyError">Etsy authorization failed: {oauthResult.error||"unknown error"}</div>}
   {oauthResult?.storage==="session_only"&&<div className="etsyNotice">Etsy connected for this browser session only; server-side token storage failed (see status storage error).</div>}
   {status.config?.envWhitespaceTrimmed&&<div className="etsyNotice">An Etsy environment variable contains leading/trailing whitespace. YNOT trims it automatically, but please clean it up in Vercel.</div>}
   {status.config&&!status.config.sharedSecretConfigured&&<div className="etsyNotice">ETSY_SHARED_SECRET is not configured. Etsy requires x-api-key as keystring:shared_secret.</div>}
   {status.verification&&(status.verification.verified
    ?<div className="etsyNotice">Verified with Etsy ({status.tokenSource}): user {String(status.verification.user?.user_id??"?")}{status.verification.shop?<> · shop <strong>{status.verification.shop.shop_name||"?"}</strong> (#{String(status.verification.shop.shop_id??"?")})</>:status.verification.shopError?<> · shop lookup failed: {status.verification.shopError}</>:<> · no shop on this account</>}</div>
    :status.connected&&<div className="etsyError">Etsy API check failed{status.verification.step?` at ${status.verification.step}`:""}: {status.verification.status?`${status.verification.status} `:""}{status.verification.error}</div>)}
   {status.storageError&&<div className="etsyNotice">Etsy login storage: {status.storageError}. You can still reconnect; this message identifies the server-side persistence problem.</div>}
   {status.connected&&!hasWrite&&<div className="etsyNotice">Reconnect Etsy once to grant the listing write permission needed for publishing.</div>}
   <div className="etsyActions">
    <button className="etsyPrimary" onClick={connect} disabled={!status.configured||busy}>{status.connected?"Reconnect Etsy":"Connect Etsy"}</button>
    <button className="etsySecondary" onClick={()=>void load(true)} disabled={busy}>Verify with Etsy</button>
    {status.connected&&<button className="etsySecondary" onClick={disconnect} disabled={busy}>{busy?"Disconnecting…":"Disconnect"}</button>}
   </div>
  </>}
  {error&&<div className="etsyError">{error}</div>}
 </section>;
}
