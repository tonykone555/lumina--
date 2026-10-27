"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {Clapperboard,ChevronUp,LoaderCircle,ShoppingBag,Shuffle,X} from "lucide-react";
type Video={id:string;caption:string;embedUrl:string;url:string;thumbnail?:string;searchQuery?:string;username?:string};
const CATEGORIES=["home decor","fashion accessories","kitchen gadgets","pet products","fitness equipment","beauty products","travel accessories","smart home","baby products","desk accessories","home renovation","sports equipment"];
function shuffle<T>(arr:T[]){const out=[...arr];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
const ynotLink=(v:Video)=>"/worlds?q="+encodeURIComponent((v.searchQuery||v.caption||"product").slice(0,150));
export default function WorldProductReels(){
 const[open,setOpen]=useState(false),[items,setItems]=useState<Video[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(""),[active,setActive]=useState(0);
 const seen=useRef(new Set<string>()),loadLock=useRef(false),rail=useRef<HTMLDivElement>(null),batchNo=useRef(0);
 const load=useCallback(async()=>{
  if(loadLock.current)return;
  loadLock.current=true;setLoading(true);setError("");
  const categories=shuffle(CATEGORIES).slice(0,3);
  try{
   const results=await Promise.allSettled(categories.map(async category=>{
    const res=await fetch("/api/product-videos?mode=feed&category="+encodeURIComponent(category),{cache:"default"});
    if(!res.ok)throw Error("Video source unavailable");
    const data=await res.json();
    return (Array.isArray(data.videos)?data.videos:[]) as Video[];
   }));
   const videos=shuffle(results.flatMap(r=>r.status==="fulfilled"?r.value:[])).filter(v=>/^\\d{10,20}$/.test(String(v.id))&&typeof v.embedUrl==="string"&&v.embedUrl.startsWith("https://www.tiktok.com/player/")).filter(v=>{if(seen.current.has(v.id))return false;seen.current.add(v.id);return true});
   if(videos.length)setItems(previous=>[...previous,...videos]);
   else if(!items.length)setError("No verified TikTok product videos available right now. Try again.");
  }catch{setError("TikTok videos are temporarily unavailable. Try again.")}
  finally{loadLock.current=false;setLoading(false);batchNo.current++}
 },[items.length]);
 useEffect(()=>{void load()},[]);
 useEffect(()=>{if(!open)return;const prev=document.body.style.overflow;document.body.style.overflow="hidden";const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")setOpen(false);if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();const n=Math.max(0,Math.min(items.length-1,active+(e.key==="ArrowDown"?1:-1)));rail.current?.children[n]?.scrollIntoView({behavior:"smooth"});setActive(n)}};window.addEventListener("keydown",onKey);return()=>{document.body.style.overflow=prev;window.removeEventListener("keydown",onKey)}},[open,items.length,active]);
 const onScroll=()=>{const el=rail.current;if(!el)return;const n=Math.max(0,Math.round(el.scrollTop/Math.max(1,el.clientHeight)));setActive(n);if(items.length>0&&n>=items.length-3&&!loading)void load()};
 const next=()=>{const n=active+1;if(n<items.length)rail.current?.children[n]?.scrollIntoView({behavior:"smooth"});else void load()};
 return <><button type="button" className="ynReelBubble" aria-label="Discover TikTok product videos" onClick={()=>setOpen(true)}><Clapperboard size={21}/><span>Discover</span></button>
 {open&&<div className="ynReelOverlay" role="dialog" aria-modal="true" aria-label="Discover products swipe feed">
  <header className="ynReelHeader"><span><b>YNOT</b> / DISCOVER</span><button type="button" onClick={()=>setOpen(false)} aria-label="Close Discover"><X size={22}/></button></header>
  <div className="ynReelRail" ref={rail} onScroll={onScroll}>
   {items.map((v,i)=><article key={v.id} className="ynReelSlide">
    {Math.abs(i-active)<=1?<iframe key={v.id} className="ynReelMedia" src={v.embedUrl} title={"TikTok product video "+v.id} loading={i===active?"eager":"lazy"} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:v.thumbnail?<img className="ynReelImage" src={v.thumbnail} alt="Product video preview" loading="lazy"/>:null}
    <div className="ynReelShade"/>
    <div className="ynReelDetails"><small>TIKTOK PRODUCT DISCOVERY</small><h2>{v.caption||"Discover this product"}</h2><a href={ynotLink(v)}><ShoppingBag size={17}/> Find on YNOT</a></div>
    <aside className="ynReelSide"><button onClick={()=>{void navigator.clipboard?.writeText?.(v.id)?.catch(()=>{})}} aria-label="Copy TikTok video code"><Shuffle size={19}/><span>Code</span></button><button onClick={next} aria-label="Next video"><ChevronUp size={23} style={{transform:"rotate(180deg)"}}/><span>Next</span></button></aside>
    <div className="ynReelCount">{i+1} / {items.length}</div>
   </article>)}
   {loading&&<div className="ynReelStatus"><LoaderCircle className="ynReelSpin" size={22}/> Loading TikTok product videos…</div>}
   {!loading&&error&&<div className="ynReelStatus">{error}<button type="button" onClick={()=>void load()}>Retry</button></div>}
  </div>
 </div>}
 <style jsx global>{`
 .ynReelBubble{position:fixed;bottom:calc(26px + env(safe-area-inset-bottom));left:calc(50% + 78px);z-index:2147483002;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;width:69px;height:69px;border-radius:50%;border:1px solid #ffffff70;background:radial-gradient(circle at 28% 18%,#ffffff58,transparent 34%),linear-gradient(150deg,#484b58a0,#11121bcf 65%,#686e7699);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:inset 0 2px 12px #ffffff25,0 12px 30px #000b;color:#fff;cursor:pointer}
 .ynReelBubble span{font-size:9px;font-weight:700;letter-spacing:.01em}
 .ynReelOverlay{position:fixed;inset:0;z-index:2147483600;background:#09090c;color:#fff}
 .ynReelHeader{position:absolute;z-index:12;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:calc(15px + env(safe-area-inset-top)) 18px 12px;pointer-events:none;text-shadow:0 2px 10px #000}
 .ynReelHeader span{font-size:12px;letter-spacing:.14em}.ynReelHeader button{pointer-events:auto;color:#fff;border:1px solid #ffffff55;background:#19191d88;border-radius:50%;height:42px;width:42px;display:grid;place-items:center}
 .ynReelOverlay:after{content:"";position:absolute;z-index:7;inset:0;pointer-events:none;background:linear-gradient(to bottom,#09090c 0%,transparent 14%,transparent 83%,#09090c 100%);opacity:.55}
 .ynReelRail{width:100%;height:100dvh;overflow-y:auto;scroll-snap-type:y mandatory;scrollbar-width:none;overscroll-behavior:contain}.ynReelRail::-webkit-scrollbar{display:none}
 .ynReelSlide{height:100dvh;width:100%;position:relative;scroll-snap-align:start;scroll-snap-stop:always;overflow:hidden;background:#17171c}
 .ynReelImage,.ynReelMedia{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:radial-gradient(ellipse at center,#37373f 0,#121217 74%)}
 .ynReelMedia{z-index:2;border:0}.ynReelShade{position:absolute;z-index:3;inset:30% 0 0;background:linear-gradient(transparent 20%,#0008 65%,#000e)}
 .ynReelDetails{position:absolute;z-index:5;left:max(20px,calc((100vw - 650px)/2));right:max(90px,calc((100vw - 650px)/2 + 66px));bottom:calc(45px + env(safe-area-inset-bottom));text-shadow:0 2px 9px #000}
 .ynReelDetails small{font-size:11px;opacity:.85;text-transform:uppercase;letter-spacing:.11em}.ynReelDetails h2{margin:8px 0;font-size:clamp(21px,4.8vw,31px);line-height:1.07;max-width:540px}.ynReelDetails strong{font-size:18px}.ynReelDetails p{font-size:10px;opacity:.72;overflow-wrap:anywhere}.ynReelDetails a{display:inline-flex;align-items:center;gap:8px;color:#111;background:#fff;padding:12px 17px;text-shadow:none;border-radius:999px;text-decoration:none;font-size:13px;font-weight:700;margin-top:10px}
 .ynReelSide{position:absolute;z-index:6;bottom:calc(105px + env(safe-area-inset-bottom));right:max(13px,calc((100vw - 650px)/2));display:flex;flex-direction:column;gap:18px}.ynReelSide button{width:58px;min-height:56px;display:flex;flex-direction:column;align-items:center;gap:3px;border:0;background:#0008;color:#fff;border-radius:24px;padding:10px 4px}.ynReelSide span{font-size:10px}
 .ynReelCount{position:absolute;right:16px;top:calc(85px + env(safe-area-inset-top));font-size:11px;z-index:5;opacity:.65}.ynReelStatus{height:100dvh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;color:#fff9;font-size:14px}.ynReelStatus button{background:#fff;color:#111;border:0;border-radius:99px;padding:10px 16px}.ynReelSpin{animation:ynReelRotate 1s linear infinite}@keyframes ynReelRotate{to{transform:rotate(360deg)}}
 @media(max-width:650px){.ynReelBubble{width:62px;height:62px;bottom:calc(26px + env(safe-area-inset-bottom));left:calc(50% + 70px)}.ynReelDetails{left:19px;right:86px;bottom:calc(32px + env(safe-area-inset-bottom))}.ynReelSide{right:11px}}
 `}</style>
 </>;
}
