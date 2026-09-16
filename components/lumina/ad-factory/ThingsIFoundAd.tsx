"use client";

import {AbsoluteFill,Img,Easing,interpolate,useCurrentFrame,useVideoConfig} from "remotion";

export type AdProduct={id:string;title:string;brand?:string;price?:number|null;currency?:string;image?:string;images?:string[]};
export type ThingsIFoundProps={products:AdProduct[];hook:string;headline:string;cta?:string};

function money(product:AdProduct){if(product.price==null||!Number.isFinite(Number(product.price)))return"";const currency=product.currency||"EUR";try{return new Intl.NumberFormat("en",{style:"currency",currency,maximumFractionDigits:0}).format(Number(product.price))}catch{return `${currency} ${Number(product.price).toFixed(0)}`}}

export function ThingsIFoundAd({products,hook,headline,cta="Shop the edit on YNOT"}:ThingsIFoundProps){
 const frame=useCurrentFrame();const {fps,width,height}=useVideoConfig();
 const safeProducts=(products||[]).filter(p=>p?.image).slice(0,6);
 const sceneFrames=Math.max(45,Math.floor((12*fps-120)/Math.max(1,safeProducts.length)));
 const productIndex=Math.min(Math.max(0,safeProducts.length-1),Math.max(0,Math.floor(Math.max(0,frame-72)/sceneFrames)));
 const product=safeProducts[productIndex]||safeProducts[0];
 const local=Math.max(0,frame-72-productIndex*sceneFrames);
 const introOpacity=interpolate(frame,[0,12,58,72],[0,1,1,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp",easing:Easing.bezier(.16,1,.3,1)});
 const outroStart=12*fps-80;
 const isOutro=frame>=outroStart;
 const productOpacity=isOutro?interpolate(frame,[outroStart,outroStart+14],[1,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp"}):interpolate(local,[0,10,sceneFrames-10,sceneFrames],[0,1,1,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp",easing:Easing.bezier(.16,1,.3,1)});
 const imageScale=interpolate(local,[0,sceneFrames],[1.02,1.12],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
 const cardTranslate=interpolate(local,[0,12],["0px 80px","0px 0px"],{extrapolateLeft:"clamp",extrapolateRight:"clamp",easing:Easing.bezier(.16,1,.3,1)});
 const outroOpacity=interpolate(frame,[outroStart,outroStart+16],[0,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
 const compact=width<800;
 return <AbsoluteFill style={{backgroundColor:"#080a0b",color:"white",fontFamily:"Inter,Arial,sans-serif",overflow:"hidden"}}>
  <AbsoluteFill style={{background:"radial-gradient(circle at 50% 22%, rgba(136,226,126,.16), rgba(8,10,11,0) 44%)"}}/>
  <div style={{position:"absolute",left:compact?56:80,top:compact?62:92,fontSize:compact?22:28,fontWeight:800,letterSpacing:".14em",color:"#9BEA92"}}>YNOT</div>
  <div style={{position:"absolute",left:compact?56:80,right:compact?56:80,top:height*.27,opacity:introOpacity}}>
   <div style={{fontSize:compact?62:88,lineHeight:.95,fontWeight:850,letterSpacing:"-.055em",maxWidth:width*.82}}>{hook}</div>
   <div style={{marginTop:28,fontSize:compact?22:30,color:"rgba(255,255,255,.62)"}}>Curated from the live YNOT catalogue</div>
  </div>
  {product&&<div style={{position:"absolute",inset:0,opacity:productOpacity}}>
   <div style={{position:"absolute",left:compact?44:70,right:compact?44:70,top:height*.12,bottom:height*.19,borderRadius:compact?42:54,overflow:"hidden",backgroundColor:"#121516"}}>
    <Img src={product.image||""} style={{width:"100%",height:"100%",objectFit:"cover",scale:imageScale}}/>
    <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(0,0,0,.02) 52%,rgba(0,0,0,.78) 100%)"}}/>
   </div>
   <div style={{position:"absolute",left:compact?70:98,right:compact?70:98,bottom:height*.095,translate:cardTranslate}}>
    <div style={{fontSize:compact?25:34,fontWeight:820,lineHeight:1.05,letterSpacing:"-.03em"}}>{product.title}</div>
    <div style={{display:"flex",justifyContent:"space-between",gap:20,alignItems:"baseline",marginTop:12}}><span style={{fontSize:compact?16:20,color:"rgba(255,255,255,.6)"}}>{product.brand||`Find ${productIndex+1}`}</span><span style={{fontSize:compact?22:28,fontWeight:800}}>{money(product)}</span></div>
   </div>
   <div style={{position:"absolute",right:compact?58:86,top:compact?66:98,fontSize:compact?14:17,fontWeight:750,color:"rgba(255,255,255,.72)"}}>{productIndex+1}/{safeProducts.length}</div>
  </div>}
  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",opacity:outroOpacity,padding:compact?56:86,textAlign:"center"}}>
   <div><div style={{fontSize:compact?56:82,lineHeight:.94,fontWeight:860,letterSpacing:"-.055em"}}>{headline}</div><div style={{marginTop:30,display:"inline-flex",padding:compact?"18px 26px":"22px 32px",borderRadius:999,backgroundColor:"#9BEA92",color:"#071007",fontSize:compact?18:23,fontWeight:850}}>{cta}</div></div>
  </div>
 </AbsoluteFill>
}
