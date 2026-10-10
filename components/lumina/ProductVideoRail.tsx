"use client";

import {useEffect,useState} from "react";
import {X} from "lucide-react";
import {createPortal} from "react-dom";

type Product={id:string;title:string;brand?:string;description?:string;tags?:string[]};
type Video={id:string;url:string;embedUrl:string;thumbnail?:string;caption:string;views:number;likes:number;shares:number;saves:number;country:string;language:string;searchQuery?:string;jev:{relevance:string;fit:string;confidence:number}};

function compact(n:number){
 try{return new Intl.NumberFormat(undefined,{notation:"compact",maximumFractionDigits:1}).format(Number(n||0))}
 catch{return String(Number(n||0))}
}

const CSS=".ynot-product-videos{margin:4px 0 17px;min-width:0}.ynot-product-videos .head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}.ynot-product-videos .label{width:max-content;padding:8px 12px;border:1px solid rgba(24,26,24,.15);border-radius:999px;background:rgba(255,255,255,.52);font-weight:800;font-size:11px}.ynot-product-videos .jev{font-size:8px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;opacity:.42}.ynot-product-videos .loading{padding:12px 3px;font-size:10px;opacity:.5}.ynot-product-videos .track{display:flex;gap:10px;overflow-x:auto;padding:1px 1px 3px;scroll-snap-type:x mandatory;scrollbar-width:none}.ynot-product-videos .track::-webkit-scrollbar{display:none}.ynot-product-videos .card{flex:0 0 min(180px,48vw);scroll-snap-align:start;border:1px solid rgba(24,26,24,.13);border-radius:18px;background:rgba(255,255,255,.38);padding:7px;text-align:left;color:#1c1e1c}.ynot-product-videos .poster{aspect-ratio:9/12;border-radius:13px;background:#171917;display:grid;place-items:center;color:#fff;font-size:26px;overflow:hidden;position:relative}.ynot-product-videos .poster img{width:100%;height:100%;object-fit:cover;display:block}.ynot-product-videos .poster:after{content:\"TikTok\";position:absolute;left:8px;bottom:7px;font-size:8px;font-weight:850;letter-spacing:.08em}.ynot-product-videos .copy{display:block;padding:7px 3px 2px}.ynot-product-videos .copy b,.ynot-product-videos .copy small,.ynot-product-videos .copy em{display:block}.ynot-product-videos .copy b{font-size:9px;text-transform:uppercase;letter-spacing:.06em}.ynot-product-videos .copy small{margin-top:4px;font-size:9px;line-height:1.25;max-height:34px;overflow:hidden;color:#5d625d}.ynot-product-videos .copy em{margin-top:5px;font-size:9px;font-style:normal;font-weight:800}.ynot-product-videos.dark{color:#fff;margin:18px 0 4px}.ynot-product-videos.dark .label{background:#151515;border-color:#ffffff28;color:#fff}.ynot-product-videos.dark .jev{color:#fff}.ynot-product-videos.dark .card{background:#111;border-color:#ffffff22;color:#fff}.ynot-product-videos.dark .copy small{color:#aaa}.ynot-product-videos.dark .poster{background:#000;border:1px solid #ffffff16}";

export default function ProductVideoRail({product,maxItems=8,dark=false}:{product:Product;maxItems?:number;dark?:boolean}){
 const[videos,setVideos]=useState<Video[]>([]);
 const[loading,setLoading]=useState(false);
 const[open,setOpen]=useState<Video|null>(null);

 useEffect(()=>{
  let alive=true;
  const controller=new AbortController();
  const key="ynot-product-tiktok-v2:"+encodeURIComponent(product.id||product.title);
  const q=new URLSearchParams({title:product.title,async:"1"});
  if(product.brand)q.set("brand",product.brand);
  if(product.description)q.set("description",product.description.slice(0,500));
  if(product.tags?.length)q.set("tags",product.tags.slice(0,10).join(","));
  const base="/api/product-videos?"+q.toString();
  let timer:ReturnType<typeof setTimeout>|undefined;
  setVideos([]);setOpen(null);setLoading(true);
  let stored:{snapshot?:string;videos?:Video[];updated?:number;attempted?:number}|null=null;
  try{stored=JSON.parse(localStorage.getItem(key)||"null")}catch{}
  const now=Date.now();
  if(stored?.videos?.length&&now-Number(stored.updated||0)<24*60*60*1000){
   setVideos(stored.videos.slice(0,maxItems));setLoading(false);
   return()=>{alive=false;controller.abort()};
  }
  const save=(value:object)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
  const run=async(snapshot?:string,attempt=0):Promise<void>=>{
   if(!alive||controller.signal.aborted)return;
   try{
    const url=base+(snapshot?"&snapshot_id="+encodeURIComponent(snapshot):"");
    const response=await fetch(url,{cache:"no-store",signal:controller.signal});
    const data=await response.json();
    if(!alive)return;
    if(data.status==="pending"&&typeof data.snapshot_id==="string"&&attempt<24){
     save({snapshot:data.snapshot_id,updated:Date.now(),attempted:Date.now()});
     timer=setTimeout(()=>{void run(data.snapshot_id,attempt+1)},Math.min(16000,4000+attempt*1000));
     return;
    }
    if(data.status==="ready"){
     const found=(Array.isArray(data.videos)?data.videos:[]).slice(0,Math.max(1,Math.min(8,maxItems)));
     setVideos(found);
     save({videos:found,updated:Date.now(),attempted:Date.now()});
    }else if(data.status==="pending"){
     save({snapshot:data.snapshot_id,updated:Date.now(),attempted:Date.now()});
    }else{
     save({attempted:Date.now(),updated:Date.now()});
    }
   }catch{
    if(alive)save({snapshot,updated:Date.now(),attempted:Date.now()});
   }finally{
    if(alive&&(!timer||attempt>=24))setLoading(false);
   }
  };
  if(stored?.snapshot&&now-Number(stored.updated||0)<30*60*1000){
   void run(stored.snapshot);
  }else if(stored?.attempted&&now-stored.attempted<10*60*1000){
   setLoading(false);
  }else void run();
  return()=>{alive=false;controller.abort();if(timer)clearTimeout(timer)};
 },[product.id,product.title,product.brand,product.description,product.tags?.join("|"),maxItems]);

 if(!loading&&!videos.length)return null;

 return <section className={"ynot-product-videos"+(dark?" dark":"")}>
  <style>{CSS}</style>
  <div className="head"><div className="label">Watch in real life</div><div className="jev">Matched by Jev</div></div>
  {loading&&!videos.length?<div className="loading">Finding relevant videos…</div>:<div className="track">
   {videos.map(v=><button type="button" className="card" key={v.id} onClick={()=>setOpen(v)}>
    <div className="poster">{v.thumbnail?<img src={v.thumbnail} alt={v.caption||"TikTok product video"} loading="lazy"/>:"▶"}</div>
    <span className="copy"><b>TikTok</b><small>{v.caption||"Related product video"}</small>{v.views>0&&<em>{compact(v.views)} views</em>}</span>
   </button>)}
  </div>}
  {open&&typeof document!=="undefined"&&createPortal(
   <div style={{position:"fixed",inset:0,zIndex:2147483400,display:"grid",placeItems:"center",padding:16,background:"rgba(0,0,0,.72)"}} onClick={()=>setOpen(null)}>
    <div style={{position:"relative",width:"min(430px,94vw)",height:"min(780px,86dvh)",borderRadius:24,overflow:"hidden",background:"#000"}} onClick={e=>e.stopPropagation()}>
     <button type="button" aria-label="Close video" onClick={()=>setOpen(null)} style={{position:"absolute",right:10,top:10,zIndex:3,width:42,height:42,border:0,borderRadius:"50%",background:"rgba(0,0,0,.72)",color:"#fff",display:"grid",placeItems:"center"}}><X size={19}/></button>
     <iframe src={open.embedUrl} title={open.caption||"TikTok video"} allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen style={{width:"100%",height:"100%",border:0,display:"block"}}/>
    </div>
   </div>,document.body
  )}
 </section>;
}