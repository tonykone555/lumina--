"use client";

import {useEffect,useRef,useState} from "react";
import {Camera,ScanSearch,X,LoaderCircle,Search} from "lucide-react";

type Detection={id:string;label:string;category?:string;searchQuery:string;alternateQueries?:string[];confidence?:number;box_2d:number[]};
type Product={id:string;title:string;brand?:string;price?:number|null;currency?:string;image?:string;url?:string;source?:string;[key:string]:any};

export default function MasonryVisualSearch(){ const inputRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{const open=()=>inputRef.current?.click();window.addEventListener("ynot:masonry-open-camera",open);return()=>window.removeEventListener("ynot:masonry-open-camera",open)},[]);
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(""),[detections,setDetections]=useState<Detection[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[query,setQuery]=useState("");
 const reset=()=>{setFile(null);setPreview("");setDetections([]);setMessage("");setQuery("");if(inputRef.current)inputRef.current.value=""};
 const scan=async()=>{if(!file)return;setBusy(true);setMessage("Analysing image…");setDetections([]);try{const fd=new FormData();fd.append("image",file);const response=await fetch("/api/room/quick/analyze",{method:"POST",body:fd});const data=await response.json();if(!response.ok)throw new Error(data?.error||"Could not analyse this image");const found=(Array.isArray(data.objects)?data.objects:[]).filter((o:Detection)=>o?.label&&o?.searchQuery&&Array.isArray(o.box_2d)&&o.box_2d.length===4);if(!found.length)throw new Error("No clear products detected. Try a closer, brighter photo.");setDetections(found);setMessage("Tap the product in the image to find it in YNOT.");}catch(e){setMessage(e instanceof Error?e.message:"Could not analyse this image.");}finally{setBusy(false)}};
 const searchObject=async(item:Detection)=>{setBusy(true);setQuery(item.label);setMessage("Searching YNOT catalogue…");try{const terms=[item.searchQuery,item.label,...(item.alternateQueries||[])].filter(Boolean).map(x=>String(x).trim()).filter((x,i,a)=>a.indexOf(x)===i).slice(0,4);const groups=await Promise.all(terms.map(async term=>{const r=await fetch(`/api/catalog?q=${encodeURIComponent(term)}&source=all&limit=60`,{cache:"no-store"});const d=await r.json();return Array.isArray(d.products)?d.products as Product[]:[]}));const seen=new Set<string>();const products=groups.flat().filter(p=>p?.id&&p?.image&&!seen.has(String(p.id))&&!!seen.add(String(p.id)));if(!products.length){setMessage(`No matching products found for “${item.label}”. Try another detected object.`);return}window.dispatchEvent(new CustomEvent("ynot:masonry-visual-results",{detail:{query:item.label,products}}));setMessage(`Showing ${products.length} catalogue matches for “${item.label}” below.`);}catch{setMessage("Catalogue search failed. Please try again.");}finally{setBusy(false)}};
 return <section className="masonryVisualSearch" aria-label="Search Masonry with a photo">
  <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={e=>{const next=e.target.files?.[0];if(!next)return;setFile(next);setPreview(URL.createObjectURL(next));setDetections([]);setMessage("Ready to scan this image.");setQuery("");}}/>
  <div className="mvsBar"><button type="button" className="mvsCamera" onClick={()=>inputRef.current?.click()} aria-label="Choose or take a product photo"><Camera size={18}/></button><span>{query? `Product: ${query}`:file?file.name:"Search Masonry with a photo"}</span>{file&&<button type="button" className="mvsClear" onClick={reset} aria-label="Clear photo"><X size={16}/></button>}<button type="button" className="mvsScan" disabled={busy} onClick={()=>file?void scan():inputRef.current?.click()}>{busy?<LoaderCircle className="mvsSpin" size={15}/>:<ScanSearch size={15}/>}<span>{busy?"Working…":"Scan"}</span></button></div>
  {file&&<div className="mvsPreview"><img src={preview} alt="Selected image to scan"/>{detections.map((d,i)=>{const b=d.box_2d;return <button type="button" key={d.id||i} title={d.label} aria-label={`Search for ${d.label}`} disabled={busy} className={query===d.label?"chosen":""} style={{left:`${((Number(b[1])+Number(b[3]))/2)/10}%`,top:`${((Number(b[0])+Number(b[2]))/2)/10}%`}} onClick={()=>void searchObject(d)}><span>{i+1}</span></button>})}</div>}
  {detections.length>0&&<div className="mvsDetected"><b>Detected products</b>{detections.map((d,i)=><button type="button" key={d.id||i} disabled={busy} onClick={()=>void searchObject(d)}>{d.label}<Search size={13}/></button>)}</div>}
  {message&&<p className="mvsMessage" role="status">{message}</p>}
  <style jsx global>{`
   .masonryVisualSearch{position:fixed;left:50%;bottom:calc(125px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(520px,94vw);margin:0 auto;color:#fff;z-index:2147483001;pointer-events:auto}
   .masonryVisualSearch input[type=file]{display:none}
   .mvsBar{height:46px;display:flex;align-items:center;gap:9px;padding:4px 5px 4px 7px;border:1px solid #ffffff38;border-radius:999px;background:rgba(24,24,27,.82);box-shadow:0 5px 24px #0005,inset 0 1px #ffffff18;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
   .mvsBar>span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:#ffffffc9}
   .mvsCamera,.mvsClear{width:34px;height:34px;flex:none;display:grid;place-items:center;border:0;border-radius:50%;background:#ffffff12;color:#fff}
   .mvsScan{height:34px;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 14px;border:0;border-radius:999px;background:#fff;color:#111;font-size:12px;font-weight:650}
   .mvsScan:disabled{opacity:.42}.mvsSpin{animation:mvsSpin .9s linear infinite}@keyframes mvsSpin{to{transform:rotate(360deg)}}
   .mvsPreview{position:relative;width:min(100%,380px);max-height:52vh;margin:9px auto 0;border-radius:14px;overflow:hidden;background:#111;border:1px solid #ffffff25}
   .mvsPreview>img{display:block;width:100%;max-height:52vh;object-fit:contain}
   .mvsPreview>button{position:absolute;transform:translate(-50%,-50%);width:30px;height:30px;display:grid;place-items:center;border:2px solid #fff;border-radius:50%;background:#d7ff42;color:#101010;box-shadow:0 2px 12px #0009;font-size:11px;font-weight:800}
   .mvsPreview>button.chosen{background:#fff;outline:3px solid #d7ff42}.mvsPreview>button:disabled{opacity:.6}
   .mvsDetected{display:flex;gap:6px;overflow-x:auto;padding:8px 1px 2px;scrollbar-width:none;align-items:center}.mvsDetected>b{font-size:10px;color:#ffffff9e;white-space:nowrap;margin-right:2px}
   .mvsDetected>button{flex:none;display:flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid #ffffff25;border-radius:999px;background:#ffffff0c;color:#fff;font-size:11px}
   .mvsMessage{margin:6px 8px 0;font-size:11px;line-height:1.4;color:#ffffffb9;text-align:center}
   @media(max-width:650px){.masonryVisualSearch{width:94vw;bottom:calc(126px + env(safe-area-inset-bottom))}.mvsBar{height:44px}.mvsPreview{max-height:42vh}.mvsPreview>img{max-height:42vh}}
  `}</style>
 </section>;
}
