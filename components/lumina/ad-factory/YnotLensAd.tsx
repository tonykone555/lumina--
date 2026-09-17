"use client";

import React from "react";
import {AbsoluteFill,Img,interpolate,spring,useCurrentFrame,useVideoConfig} from "remotion";

type Product={id?:string;title?:string;price?:number|null;currency?:string;image?:string};
type Props={products:Product[];hook?:string;headline?:string;cta?:string};

export function YnotLensAd({products=[],hook="Whatever you're into, YNOT finds the world around it",headline="One world. Endless products.",cta="Explore on YNOT"}:Props){
 const frame=useCurrentFrame();const{fps}=useVideoConfig();const list=products.filter(p=>p?.image).slice(0,6);const index=list.length?Math.floor(frame/(fps*1.6))%list.length:0;const product=list[index]||list[0];
 const enter=spring({frame:frame%(Math.round(fps*1.6)),fps,config:{damping:16,stiffness:110}});const scale=interpolate(enter,[0,1],[.94,1]);
 return <AbsoluteFill style={{background:"#050706",color:"white",fontFamily:"Inter,Arial,sans-serif",overflow:"hidden"}}>
  <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 40%,rgba(133,255,117,.12),transparent 38%)"}}/>
  <div style={{position:"absolute",top:44,left:44,right:44,height:66,border:"1px solid rgba(255,255,255,.16)",borderRadius:34,background:"rgba(10,14,11,.78)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 26px",backdropFilter:"blur(18px)"}}>
   <b style={{fontSize:20,letterSpacing:1.2}}>YNOT</b><span style={{fontSize:14,opacity:.62}}>SHOP · DISCOVER</span><span style={{fontSize:18}}>⌖</span>
  </div>
  <div style={{position:"absolute",top:145,left:56,right:56,textAlign:"center"}}><div style={{fontSize:22,opacity:.72,marginBottom:10}}>{hook}</div><div style={{fontSize:54,fontWeight:850,letterSpacing:-2,lineHeight:1.02}}>{headline}</div></div>
  <div style={{position:"absolute",top:"36%",left:"50%",width:"64%",height:"46%",transform:`translateX(-50%) scale(${scale})`,borderRadius:"50%",overflow:"hidden",border:"1px solid rgba(255,255,255,.18)",boxShadow:"0 30px 120px rgba(0,0,0,.55),0 0 80px rgba(137,255,123,.08)",background:"#111"}}>
   {product?.image?<Img src={product.image} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{display:"grid",placeItems:"center",height:"100%",fontSize:34,opacity:.35}}>YNOT</div>}
   <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,transparent 55%,rgba(0,0,0,.8))"}}/>
   <div style={{position:"absolute",left:34,right:34,bottom:30}}><div style={{fontSize:28,fontWeight:760,lineHeight:1.05}}>{product?.title||"Discover something new"}</div>{Number(product?.price)>0&&<div style={{fontSize:22,marginTop:9,opacity:.84}}>{product?.currency||"EUR"} {Number(product?.price).toFixed(2)}</div>}</div>
  </div>
  <div style={{position:"absolute",left:56,right:56,bottom:52,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}><div style={{display:"flex",gap:8}}>{list.map((_,i)=><span key={i} style={{width:i===index?30:8,height:8,borderRadius:9,background:i===index?"#9af390":"rgba(255,255,255,.28)"}}/>)}</div><div style={{padding:"16px 24px",borderRadius:28,background:"#9af390",color:"#071007",fontWeight:850,fontSize:18}}>{cta}</div></div>
 </AbsoluteFill>
}
