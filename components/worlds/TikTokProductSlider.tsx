"use client";

import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {ChevronLeft,ChevronRight,Play,Search,X} from "lucide-react";

type Video={
 id:string;url:string;embedUrl:string;thumbnail?:string;caption:string;
 searchQuery?:string;hashtags?:string[];views?:number;
 jev?:{relevance:string;fit:string;confidence:number};
};
const CATEGORIES=[
 {label:"For you",search:"product discovery home decor fashion beauty kitchen gadgets"},
 {label:"Home",search:"home decor furniture organization"},
 {label:"Fashion",search:"fashion outfit clothing accessories"},
 {label:"Beauty",search:"beauty skincare hair products"},
 {label:"Kitchen",search:"kitchen coffee cooking tools"},
 {label:"Fitness",search:"fitness gym equipment"},
 {label:"Tech",search:"electronics tech accessories"}
];
const cache=new Map<string,Video[]>();
function valid(v:Video){
 return /^\d{10,20}$/.test(String(v?.id||""))&&/^https:\/\/www\.tiktok\.com\/player\/v1\/\d{10,20}(?:[?]|$)/.test(String(v.embedUrl||""));
}
function productTerms(v:Video){
 const q=String(v.searchQuery||"").trim();
 if(q)return q;
 return String(v.caption||"").replace(/#(fyp|viral|trending|tiktok|foryoupage)\b/gi,"").slice(0,120).trim();
}
export default function TikTokProductSlider(){
 const router=useRouter();
 const [category,setCategory]=useState(0);
 const [videos,setVideos]=useState<Video[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [active,setActive]=useState<Video|null>(null);
 const [playerFailed,setPlayerFailed]=useState(false);
 const rail=useRef<HTMLDivElement>(null);
 const [visible,setVisible]=useState(false);
 const anchor=useRef<HTMLElement>(null);
 useEffect(()=>{
  const node=anchor.current;if(!node)return;
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect()}},{rootMargin:"500px"});
  observer.observe(node);return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  if(!visible)return;
  const query=CATEGORIES[category].search;
  const stored=cache.get(query);
  if(stored){setVideos(stored);setError(stored.length?"":"No verified product videos available yet.");setLoading(false);return;}
  const controller=new AbortController();
  setVideos([]);setLoading(true);setError("");
  fetch("/api/product-videos?"+new URLSearchParams({mode:"feed",category:query}),{signal:controller.signal})
   .then(async response=>{const data=await response.json();if(!response.ok)throw Error(String(data.error||"Video search unavailable"));return data})
   .then(data=>{
    const found=(Array.isArray(data.videos)?data.videos:[]).filter(valid).slice(0,10);
    cache.set(query,found);setVideos(found);
    if(!found.length)setError("No verified product videos available for this category yet.");
   })
   .catch(err=>{if(!controller.signal.aborted)setError(err instanceof Error?err.message:"Video search unavailable")})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>controller.abort();
 },[visible,category]);
 useEffect(()=>{if(!active)return;setPlayerFailed(false);const timer=setTimeout(()=>setPlayerFailed(true),9000);return()=>clearTimeout(timer)},[active?.id]);
 const search=(v:Video)=>{
  const q=productTerms(v);
  if(!q)return;
  setActive(null);
  router.push("/?q="+encodeURIComponent(q));
 };
 return <section className="ynTikTokShelf" ref={anchor} aria-label="TikTok product discovery">
  <div className="ynTikTokTop"><div><span className="ynTikTokEyebrow">YNOT DISCOVER</span><h2>Products on TikTok</h2><p>Watch real videos. Find the products inside YNOT.</p></div>
   <div className="ynTikTokArrows"><button type="button" aria-label="Previous videos" onClick={()=>rail.current?.scrollBy({left:-460,behavior:"smooth"})}><ChevronLeft size={18}/></button><button type="button" aria-label="Next videos" onClick={()=>rail.current?.scrollBy({left:460,behavior:"smooth"})}><ChevronRight size={18}/></button></div></div>
  <nav className="ynTikTokCategories" aria-label="Product video categories">{CATEGORIES.map((c,i)=><button key={c.label} type="button" className={i===category?"selected":""} aria-pressed={i===category} onClick={()=>{setCategory(i);rail.current?.scrollTo({left:0})}}>{c.label}</button>)}</nav>
  {loading?<div className="ynTikTokMessage" role="status">Finding verified product videos…</div>:videos.length?<div className="ynTikTokRail" ref={rail}>{videos.map(v=><article key={v.id} className="ynTikTokCard">
   <button type="button" className="ynTikTokPoster" onClick={()=>setActive(v)} aria-label={"Play TikTok video: "+(v.caption||"Product video")}>
    {v.thumbnail?<img src={v.thumbnail} alt={v.caption||"Product video"} loading="lazy"/>:<div className="ynTikTokPosterFallback">TikTok</div>}
    <span className="ynTikTokPlay"><Play size={18} fill="currentColor"/></span><span className="ynTikTokTag">PRODUCT VIDEO</span>
   </button>
   <p>{v.caption||"Discover this product"}</p>
   <button type="button" className="ynTikTokFind" onClick={()=>search(v)}><Search size={14}/> Find on YNOT</button>
  </article>)}</div>:<div className="ynTikTokMessage" role="status">{error||"Browse a category to discover product videos."}<button type="button" onClick={()=>{cache.delete(CATEGORIES[category].search);setVisible(false);requestAnimationFrame(()=>setVisible(true))}}>Retry</button></div>}
  {active&&<div className="ynTikTokBackdrop" role="presentation" onClick={()=>setActive(null)}><div className="ynTikTokPlayer" role="dialog" aria-modal="true" aria-label="TikTok product video" onClick={e=>e.stopPropagation()}>
   <button className="ynTikTokClose" type="button" aria-label="Close video" onClick={()=>setActive(null)}><X size={20}/></button>
   <iframe src={active.embedUrl} title={active.caption||"TikTok product video"} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen onLoad={()=>setPlayerFailed(false)} onError={()=>setPlayerFailed(true)}/>
   {playerFailed&&<div className="ynTikTokPlayerHelp">If this video does not play, <a href={active.url} target="_blank" rel="noopener noreferrer">watch on TikTok</a>.</div>}
   <button className="ynTikTokPlayerFind" type="button" onClick={()=>search(active)}><Search size={16}/> Find product on YNOT</button>
  </div></div>}
  <style jsx global>{`
.ynTikTokShelf{position:relative;z-index:1;max-width:1700px;margin:0 auto;padding:27px 20px 130px;color:#fff;background:#000}.ynTikTokTop{display:flex;justify-content:space-between;align-items:end;gap:16px}.ynTikTokEyebrow{font-size:9px;letter-spacing:.18em;color:#aaa}.ynTikTokTop h2{margin:5px 0;font-size:clamp(23px,3vw,37px);font-weight:650;letter-spacing:-.045em}.ynTikTokTop p{color:#aaa;font-size:12px;margin:0}.ynTikTokArrows{display:flex;gap:7px}.ynTikTokArrows button{width:36px;height:36px;border:1px solid #ffffff45;background:#161616;color:white;border-radius:50%;display:grid;place-items:center;cursor:pointer}.ynTikTokCategories{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:20px 0 16px}.ynTikTokCategories button{flex-shrink:0;padding:10px 16px;border:1px solid #ffffff29;border-radius:999px;background:#181818;color:#bbb;font-size:12px;cursor:pointer}.ynTikTokCategories button.selected{background:#fff;color:#111}.ynTikTokRail{display:flex;gap:12px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;scrollbar-width:none;padding:0 0 8px}.ynTikTokRail::-webkit-scrollbar,.ynTikTokCategories::-webkit-scrollbar{display:none}.ynTikTokCard{flex:0 0 clamp(180px,21vw,250px);scroll-snap-align:start;min-width:0;border:1px solid #ffffff1c;background:#131313;border-radius:20px;overflow:hidden;padding:7px}.ynTikTokPoster{width:100%;aspect-ratio:9/13;position:relative;border:0;border-radius:14px;background:#242424;overflow:hidden;color:white;cursor:pointer;padding:0}.ynTikTokPoster img{width:100%;height:100%;object-fit:cover}.ynTikTokPosterFallback{display:grid;place-items:center;height:100%;font-size:20px;font-weight:700;letter-spacing:-.04em}.ynTikTokPlay{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:#0008;border:1px solid #fff8}.ynTikTokTag{position:absolute;bottom:10px;left:10px;background:#000a;border:1px solid #fff4;border-radius:20px;padding:5px 8px;font-size:8px;letter-spacing:.09em}.ynTikTokCard p{height:35px;overflow:hidden;margin:10px 6px;color:#ddd;font-size:11px;line-height:1.5}.ynTikTokFind{width:calc(100% - 12px);margin:0 6px 7px;display:flex;align-items:center;justify-content:center;gap:7px;border:1px solid #ffffff45;border-radius:999px;background:#ffffff17;color:#fff;padding:10px;font-size:11px;cursor:pointer}.ynTikTokMessage{padding:30px 8px;color:#aaa;font-size:12px;min-height:135px}.ynTikTokMessage button{margin-left:12px;background:transparent;border:1px solid #fff5;color:white;padding:7px 12px;border-radius:20px;cursor:pointer}.ynTikTokBackdrop{position:fixed;inset:0;z-index:2147483500;background:#000c;display:grid;place-items:center;padding:16px}.ynTikTokPlayer{position:relative;width:min(430px,95vw);height:min(770px,88dvh);background:#000;border-radius:18px;overflow:hidden}.ynTikTokPlayer iframe{width:100%;height:calc(100% - 60px);border:0}.ynTikTokClose{position:absolute;top:10px;right:10px;width:40px;height:40px;border:0;border-radius:50%;background:#000c;color:white;z-index:2;display:grid;place-items:center;cursor:pointer}.ynTikTokPlayerFind{display:flex;justify-content:center;align-items:center;gap:8px;width:100%;height:60px;border:0;background:white;color:#111;font-weight:700;cursor:pointer}@media(max-width:650px){.ynTikTokShelf{padding:25px 12px 145px}.ynTikTokCard{flex-basis:62vw}.ynTikTokTop p{font-size:11px}.ynTikTokArrows button{width:32px;height:32px}}
`}</style>
 </section>;
}
