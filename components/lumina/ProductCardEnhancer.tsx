"use client";

import {useEffect,useState} from "react";

const COUNTRIES=[
 ["FR","France"],["BE","Belgium"],["DE","Germany"],["ES","Spain"],["IT","Italy"],["NL","Netherlands"],["GB","United Kingdom"],["US","United States"],["CA","Canada"],["CH","Switzerland"],["AU","Australia"],["JP","Japan"]
] as const;

function region(){
 try{return JSON.parse(localStorage.getItem("ynot-region")||"null") as {country?:string}|null}catch{return null}
}

/*
 * This component used to intercept every catalogue response and immediately call
 * /api/commerce/verify for every product. Large product worlds could therefore
 * create hundreds of verification requests while bubbles were still mounting,
 * followed by repeated full-DOM decorate passes. Verification belongs on the
 * purchase/detail path, not on the visual discovery render path.
 *
 * Keep this component deliberately lightweight: it only owns the initial market
 * selection. Product rendering and interaction stay entirely independent of
 * supplier verification and FX network work.
 */
export default function ProductCardEnhancer(){
 const[showRegion,setShowRegion]=useState(false);
 useEffect(()=>{setShowRegion(!region())},[]);
 function choose(country:string){
  localStorage.setItem("ynot-region",JSON.stringify({country}));
  setShowRegion(false);
  window.dispatchEvent(new Event("ynot:region-changed"));
 }
 if(!showRegion)return null;
 return <div className="ynot-region-backdrop">
  <section className="ynot-region-card">
   <small>SHOPPING REGION</small>
   <h2>Where are we delivering?</h2>
   <p>YNOT uses your region for local currency, delivery and checkout.</p>
   <div>{COUNTRIES.map(([code,label])=><button key={code} onClick={()=>choose(code)}><b>{label}</b><span>{code}</span></button>)}</div>
  </section>
 </div>;
}
