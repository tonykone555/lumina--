"use client";
import {useRef,useState} from "react";
import {Camera,ImagePlus,LoaderCircle,Search,X} from "lucide-react";

type Detected={id:string;label:string;searchQuery:string;alternateQueries?:string[];box_2d?:number[]};
type Product={id:string;title:string;brand?:string;image?:string;price?:number;currency?:string;url?:string};

export default function MasonryScanner(){
 const input=useRef<HTMLInputElement>(null);
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[preview,setPreview]=useState(""),[objects,setObjects]=useState<Detected[]>([]),[chosen,setChosen]=useState(""),[products,setProducts]=useState<Product[]>([]);
 async function scan(file?:File){
  if(!file)return;
  setOpen(true);setBusy(true);setError("");setObjects([]);setChosen("");setProducts([]);
  const next=URL.createObjectURL(file);setPreview(old=>{if(old)URL.revokeObjectURL(old);return next});
  try{
   const fd=new FormData();fd.append("image",file);
   const response=await fetch("/api/room/quick/analyze",{method:"POST",body:fd});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(data?.detail?String(data.detail):data?.error||"Could not scan this image");
   const found:Detected[]=Array.isArray(data.objects)?data.objects:[];
   if(!found.length)throw new Error("No products were detected. Try a clearer image.");
   setObjects(found);
   await search(found[0]);
  }catch(e){setError(e instanceof Error?e.message:"Scanner unavailable")}finally{setBusy(false)}
 }
 async function search(item:Detected){
  setChosen(item.id);setProducts([]);setBusy(true);setError("");
  try{
   const terms=[item.searchQuery,item.label,...(item.alternateQueries||[])].filter(Boolean).slice(0,4);
   const groups=await Promise.all(terms.map(async q=>{try{const r=await fetch("/api/catalog?q="+encodeURIComponent(q)+"&source=all",{cache:"no-store"});const d=await r.json();return Array.isArray(d.products)?d.products:[]}catch{return[]}}));
   const seen=new Set<string>();const merged=groups.flat().filter((p:Product)=>p?.id&&p.title&&p.image&&!seen.has(p.id)&&!!seen.add(p.id));
   setProducts(merged);
   if(!merged.length)setError("No catalogue matches yet. Choose another detected item or try a clearer image.");
  }catch{setError("Could not load catalogue matches")}finally{setBusy(false)}
 }
 function close(){setOpen(false);setError("");setBusy(false);if(preview)URL.revokeObjectURL(preview);setPreview("");setObjects([]);setProducts([]);setChosen("")}
 return <>
  <button type="button" className="ynot-masonry-scan-trigger" aria-label="Scan a product image" title="Scan a product image" onClick={()=>input.current?.click()}><Camera size={18}/><span>Scan</span></button>
  <input ref={input} type="file" accept="image/*" hidden onChange={e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value="";if(f)void scan(f)}}/>
  {open&&<div className="ynot-masonry-scan-backdrop" role="dialog" aria-modal="true" aria-label="Visual product scanner">
   <section className="ynot-masonry-scan-panel">
    <header className="ynot-masonry-scan-head"><div><small>YNOT VISUAL SEARCH</small><h2>Scan anything</h2></div><button type="button" aria-label="Close scanner" onClick={close}><X size={20}/></button></header>
    {preview&&<div className="ynot-masonry-scan-preview"><img src={preview} alt="Image being scanned"/></div>}
    {busy&&<p className="ynot-masonry-scan-status"><LoaderCircle size={16} className="ynot-masonry-spin"/> {objects.length?"Finding catalogue matches…":"Identifying products…"}</p>}
    {objects.length>1&&<div className="ynot-masonry-scan-detections"><p>Detected items · tap to search</p><div>{objects.map(o=><button type="button" key={o.id} className={chosen===o.id?"active":""} onClick={()=>void search(o)}>{o.label}</button>)}</div></div>}
    {error&&<p className="ynot-masonry-scan-error">{error}</p>}
    {products.length>0&&<><div className="ynot-masonry-scan-results-title">{products.length} matches for {objects.find(o=>o.id===chosen)?.label||"your item"}</div><div className="ynot-masonry-scan-products">{products.slice(0,24).map(p=><button type="button" key={p.id} onClick={()=>{window.dispatchEvent(new CustomEvent("ynot:open-product",{detail:p}));close()}}><img src={p.image} alt="" loading="lazy"/><span>{p.title}</span>{typeof p.price==="number"&&<small>{new Intl.NumberFormat(undefined,{style:"currency",currency:p.currency||"EUR",maximumFractionDigits:2}).format(p.price)}</small>}</button>)}</div></>}
    {!busy&&<button type="button" className="ynot-masonry-scan-again" onClick={()=>input.current?.click()}><ImagePlus size={16}/> Scan another image</button>}
   </section>
  </div>}
  <style jsx global>{`
   .ynot-search-with-scanner{display:flex;align-items:center;gap:9px;width:min(560px,calc(100vw - 24px));margin-inline:auto;position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 18px);transform:translateX(-50%);z-index:110}
   .ynot-search-with-scanner>.ynot-bottom-search{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;transform:none!important;flex:1;min-width:0;width:auto!important;margin:0!important}
   .ynot-masonry-scan-trigger{flex:0 0 48px;width:48px;height:48px;border-radius:50%;border:1px solid rgba(255,255,255,.22);background:rgba(22,23,24,.9);backdrop-filter:blur(18px);color:#fff;display:flex;align-items:center;justify-content:center;gap:0;box-shadow:0 5px 24px rgba(0,0,0,.22);cursor:pointer}
   .ynot-masonry-scan-trigger span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
   .ynot-masonry-scan-backdrop{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.58);backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;padding:16px}
   .ynot-masonry-scan-panel{width:min(720px,100%);max-height:min(88dvh,900px);overflow:auto;background:#f5f4f0;color:#171717;border:1px solid rgba(255,255,255,.35);border-radius:26px;padding:18px;box-shadow:0 24px 90px rgba(0,0,0,.35)}
   .ynot-masonry-scan-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.ynot-masonry-scan-head small{font-size:9px;letter-spacing:.18em;opacity:.55}.ynot-masonry-scan-head h2{font-size:24px;letter-spacing:-.04em;margin:4px 0 0}.ynot-masonry-scan-head>button{width:38px;height:38px;border:1px solid #ddd;border-radius:50%;background:#fff;display:grid;place-items:center}
   .ynot-masonry-scan-preview{height:190px;border-radius:16px;background:#e8e7e2;overflow:hidden;display:grid;place-items:center;margin-bottom:12px}.ynot-masonry-scan-preview img{width:100%;height:100%;object-fit:contain}
   .ynot-masonry-scan-status{display:flex;align-items:center;gap:8px;font-size:13px;opacity:.7}.ynot-masonry-spin{animation:ynot-masonry-spin 1s linear infinite}@keyframes ynot-masonry-spin{to{transform:rotate(360deg)}}
   .ynot-masonry-scan-detections p{font-size:12px;opacity:.6}.ynot-masonry-scan-detections>div{display:flex;flex-wrap:wrap;gap:7px}.ynot-masonry-scan-detections button{border:1px solid #d5d4cf;border-radius:999px;background:#fff;padding:8px 12px;font-size:12px}.ynot-masonry-scan-detections button.active{background:#171717;color:#fff;border-color:#171717}
   .ynot-masonry-scan-error{font-size:13px;color:#a12a22;background:#fff0ee;padding:10px 12px;border-radius:12px}.ynot-masonry-scan-results-title{font-size:13px;font-weight:650;margin:16px 0 10px}.ynot-masonry-scan-products{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.ynot-masonry-scan-products button{min-width:0;border:1px solid #e2e1dc;border-radius:14px;background:#fff;padding:8px;text-align:left;display:flex;flex-direction:column;gap:6px;color:#171717}.ynot-masonry-scan-products img{width:100%;aspect-ratio:1;object-fit:contain;border-radius:9px;background:#f6f5f2}.ynot-masonry-scan-products span{font-size:11px;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.ynot-masonry-scan-products small{font-size:11px;opacity:.65}.ynot-masonry-scan-again{display:flex;align-items:center;gap:8px;margin-top:14px;border:1px solid #d8d7d1;background:#fff;border-radius:999px;padding:10px 14px;font-size:12px}
   @media(max-width:520px){.ynot-search-with-scanner{width:calc(100vw - 20px);gap:7px;bottom:calc(env(safe-area-inset-bottom,0px) + 12px)}.ynot-masonry-scan-trigger{width:46px;height:46px;flex-basis:46px}.ynot-masonry-scan-panel{padding:13px;border-radius:22px}.ynot-masonry-scan-products{grid-template-columns:repeat(3,minmax(0,1fr))}.ynot-masonry-scan-preview{height:150px}}
  `}</style>
 </>;
}
