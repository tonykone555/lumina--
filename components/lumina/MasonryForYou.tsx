"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {Pause,Play,Search,X} from "lucide-react";
import {useRouter} from "next/navigation";

type Video={id:string;url:string;embedUrl:string;caption:string;hashtags:string[];onScreenText:string[];views:number;likes:number;shares:number;saves:number;country:string;language:string;searchQuery:string;jev:{relevance:string;fit:string;confidence:number}};

const CSS=".ynot-foryou-layer{position:fixed;inset:0;z-index:2147483300;background:#050505;color:#fff}.ynot-foryou-head{position:absolute;z-index:8;left:0;right:0;top:0;display:flex;align-items:center;justify-content:space-between;padding:calc(12px + env(safe-area-inset-top)) 14px 10px;pointer-events:none}.ynot-foryou-title{pointer-events:auto;display:flex;align-items:center;gap:8px;padding:9px 13px;border:1px solid #ffffff31;border-radius:999px;background:#1118;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);font-size:11px;font-weight:850}.ynot-foryou-close{pointer-events:auto;width:42px;height:42px;border:1px solid #ffffff30;border-radius:50%;background:#1119;color:#fff;display:grid;place-items:center;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}.ynot-foryou-scroll{height:100%;overflow-y:auto;scroll-snap-type:y mandatory;overscroll-behavior:contain;scrollbar-width:none}.ynot-foryou-scroll::-webkit-scrollbar{display:none}.ynot-foryou-item{position:relative;height:100%;min-height:100%;scroll-snap-align:start;background:#050505;display:grid;place-items:center}.ynot-foryou-player{position:relative;width:min(480px,100vw);height:100%;background:#000;overflow:hidden}.ynot-foryou-player iframe{width:100%;height:100%;border:0;display:block;background:#000}.ynot-foryou-glass{position:absolute;z-index:7;left:12px;right:12px;bottom:calc(18px + env(safe-area-inset-bottom));display:grid;gap:9px}.ynot-foryou-search{display:flex;align-items:center;gap:8px;height:48px;padding:0 9px 0 14px;border:1px solid #ffffff35;border-radius:999px;background:#1119;backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);box-shadow:inset 0 1px #ffffff25}.ynot-foryou-search svg{width:16px;opacity:.8}.ynot-foryou-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:#fff;font-size:13px}.ynot-foryou-search input::placeholder{color:#ffffff82}.ynot-foryou-search button{height:34px;padding:0 13px;border:0;border-radius:999px;background:#fff;color:#0a0a0a;font-size:10px;font-weight:850}.ynot-foryou-actions{display:flex;gap:8px}.ynot-foryou-actions button{min-height:44px;border:1px solid #ffffff32;border-radius:999px;background:#1119;color:#fff;padding:0 14px;font-size:10px;font-weight:850;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);display:inline-flex;align-items:center;justify-content:center;gap:6px}.ynot-foryou-actions .find{flex:1;background:#fff;color:#090909}.ynot-foryou-caption{max-width:88%;font-size:10px;line-height:1.35;color:#ffffffe0;text-shadow:0 2px 10px #000;margin:0 4px}.ynot-foryou-empty{height:100%;display:grid;place-items:center;text-align:center;padding:40px;color:#aaa;font-size:12px}@media(min-width:760px){.ynot-foryou-player{border-left:1px solid #ffffff12;border-right:1px solid #ffffff12}.ynot-foryou-head{padding-left:20px;padding-right:20px}}";

export default function MasonryForYou({open,onClose,category,subcategories,searchBasePath}:{open:boolean;onClose:()=>void;category:string;subcategories:string[];searchBasePath:string}){
 const router=useRouter();
 const[videos,setVideos]=useState<Video[]>([]);
 const[index,setIndex]=useState(0);
 const[loading,setLoading]=useState(false);
 const[error,setError]=useState("");
 const[retryKey,setRetryKey]=useState(0);
 const[query,setQuery]=useState("");
 const[paused,setPaused]=useState(false);
 const scroller=useRef<HTMLDivElement|null>(null);

 useEffect(()=>{
  if(!open)return;
  let live=true;
  const controller=new AbortController();
  setLoading(true);setError("");setVideos([]);setIndex(0);setPaused(false);setQuery("");
  const p=new URLSearchParams({mode:"feed",category,subcategories:subcategories.join(",")});
  fetch("/api/product-videos?"+p.toString(),{cache:"no-store",signal:controller.signal})
   .then(async r=>{const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(String(data?.error||`VIDEO_FEED_${r.status}`));return data})
   .then(data=>{if(live){setVideos(Array.isArray(data?.videos)?data.videos:[]);if(data?.error)setError(String(data.error))}})
   .catch(err=>{if(live&&err?.name!=="AbortError")setError(String(err?.message||"VIDEO_FEED_UNAVAILABLE"))})
   .finally(()=>{if(live)setLoading(false)});
  return()=>{live=false;controller.abort()};
 },[open,category,subcategories.join("|"),retryKey]);

 const active=videos[index]||null;
 const resolvedQuery=useMemo(()=>query.trim()||active?.searchQuery||category,[query,active?.searchQuery,category]);
 const goSearch=(q=resolvedQuery)=>{const clean=String(q||"").trim();if(!clean)return;setPaused(true);onClose();router.push(searchBasePath+"?q="+encodeURIComponent(clean))};

 useEffect(()=>{
  if(!open)return;
  const el=scroller.current;if(!el)return;
  const handler=()=>{
   const items=[...el.querySelectorAll<HTMLElement>("[data-video-index]")];
   let best=0,bestD=Infinity;
   for(const item of items){const d=Math.abs(item.getBoundingClientRect().top-el.getBoundingClientRect().top);if(d<bestD){bestD=d;best=Number(item.dataset.videoIndex||0)}}
   if(best!==index){setIndex(best);setQuery("");setPaused(false)}
  };
  el.addEventListener("scroll",handler,{passive:true});
  return()=>el.removeEventListener("scroll",handler);
 },[open,index,videos.length]);

 if(!open)return null;

 return <section className="ynot-foryou-layer" aria-label="YNOT For You product videos">
  <style>{CSS}</style>
  <div className="ynot-foryou-head">
   <div className="ynot-foryou-title">▶ For You · products only</div>
   <button className="ynot-foryou-close" type="button" onClick={onClose} aria-label="Close For You"><X size={18}/></button>
  </div>
  {loading&&!videos.length?<div className="ynot-foryou-empty">Jev is finding product videos…</div>:videos.length?<div ref={scroller} className="ynot-foryou-scroll">
   {videos.map((video,i)=><article className="ynot-foryou-item" data-video-index={i} key={video.id}>
    <div className="ynot-foryou-player">
     <iframe key={(paused&&i===index?"paused-":"play-")+video.id} src={video.embedUrl+(i===index&&!paused?"&autoplay=1":"&autoplay=0")} title={video.caption||"Product TikTok"} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen/>
     <div className="ynot-foryou-glass">
      <p className="ynot-foryou-caption">{video.caption||video.searchQuery}</p>
      <form className="ynot-foryou-search" onSubmit={e=>{e.preventDefault();goSearch()}}>
       <Search/>
       <input value={i===index?query:""} onChange={e=>{if(i===index)setQuery(e.target.value)}} placeholder={video.searchQuery||"Search this product on YNOT"} aria-label="Search YNOT from this video"/>
       <button type="submit">Search YNOT</button>
      </form>
      <div className="ynot-foryou-actions">
       <button type="button" onClick={()=>setPaused(v=>!v)}>{paused&&i===index?<><Play size={14}/> Play</>:<><Pause size={14}/> Pause</>}</button>
       <button className="find" type="button" onClick={()=>goSearch(video.searchQuery)}>Find this on YNOT</button>
      </div>
     </div>
    </div>
   </article>)}
  </div>:<div className="ynot-foryou-empty"><div><div>{error?"Video search is temporarily unavailable.":"No strong product videos were found for this category yet."}</div>{error&&<button type="button" onClick={()=>setRetryKey(v=>v+1)} style={{marginTop:14,border:"1px solid #ffffff38",borderRadius:999,padding:"10px 16px",background:"#fff",color:"#111",fontSize:11,fontWeight:850}}>Retry</button>}</div></div>}
 </section>;
}