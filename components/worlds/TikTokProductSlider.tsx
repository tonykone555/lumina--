"use client";

import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {Play,Search,ExternalLink} from "lucide-react";

type Video={id:string;url:string;embedUrl:string;thumbnail?:string;caption:string;searchQuery?:string;hashtags?:string[]};
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
const CACHE_TTL=6*60*60*1000;
function readCache(query:string):Video[]{
 const inMemory=cache.get(query);if(inMemory?.length)return inMemory;
 try{
  const raw=localStorage.getItem("ynot:tiktok-feed:v3:"+query);
  if(!raw)return[];
  const payload=JSON.parse(raw);
  if(!payload||Date.now()-Number(payload.savedAt)>CACHE_TTL)return[];
  const seen=new Set<string>();
  const found=(Array.isArray(payload.videos)?payload.videos:[]).filter((v:Video)=>valid(v)&&!seen.has(v.id)&&(seen.add(v.id),true)).slice(0,40);
  if(found.length)cache.set(query,found);
  return found;
 }catch{return[]}
}
function saveCache(query:string,found:Video[]){
 cache.set(query,found);
 try{localStorage.setItem("ynot:tiktok-feed:v3:"+query,JSON.stringify({savedAt:Date.now(),videos:found}))}catch{}
}
function valid(v:Video){return /^\d{15,20}$/.test(String(v?.id||""))&&/^https:\/\/www\.tiktok\.com\/player\/v1\/\d{15,20}/.test(String(v?.embedUrl||""))}
function searchTerms(v:Video){return String(v.searchQuery||v.caption||"").replace(/#(fyp|viral|trending|tiktok|foryoupage)\b/gi,"").slice(0,130).trim()}
export default function TikTokProductSlider(){
 const router=useRouter();
 const [category,setCategory]=useState(0);
 const [videos,setVideos]=useState<Video[]>([]);
 const [index,setIndex]=useState(0);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [playing,setPlaying]=useState(false);
 const [playerFailed,setPlayerFailed]=useState(false);
 const [visible,setVisible]=useState(false);
 const [retry,setRetry]=useState(0);
 const anchor=useRef<HTMLElement>(null);
 const startX=useRef<number|null>(null);
 const glassTrack=useRef<HTMLDivElement>(null);
 const dragActive=useRef(false);
 const dragStart=useRef<number|null>(null);
 const changeViaGlass=(clientX:number)=>{
  const bounds=glassTrack.current?.getBoundingClientRect();
  if(!bounds||!videos.length)return;
  const ratio=Math.max(0,Math.min(1,(clientX-bounds.left)/bounds.width));
  setIndex(Math.min(videos.length-1,Math.round(ratio*(videos.length-1))));
 };
 useEffect(()=>{
  if(!videos.length)return;
  for(const v of videos.slice(index+1,index+5)){
   if(v.thumbnail){const img=new Image();img.src=v.thumbnail}
  }
 },[index,videos]);
 useEffect(()=>{
  const node=anchor.current;if(!node)return;
  if(typeof IntersectionObserver==="undefined"){setVisible(true);return}
  const o=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)){setVisible(true);o.disconnect()}},{rootMargin:"600px"});
  o.observe(node);return()=>o.disconnect()
 },[]);
 useEffect(()=>{
  if(!visible)return;
  const query=CATEGORIES[category].search;
  const cached=readCache(query);
  if(cached.length){setVideos(cached);setIndex(0);setLoading(false);setError("")}
  else{setVideos([]);setIndex(0);setPlaying(false);setLoading(true);setError("")}
  const controller=new AbortController();
  // Show cached thumbnails immediately, then merge a fresh feed in the background.
  // Server CDN cache prevents every shopper from starting a new paid provider search.
  fetch("/api/product-videos?"+new URLSearchParams({mode:"feed",category:query}),{signal:controller.signal})
   .then(async r=>{const j=await r.json();if(!r.ok)throw Error(String(j.error||"Video feed unavailable"));return j})
   .then(j=>{
    if(controller.signal.aborted)return;
    const unique=new Set<string>();
    const fresh=(Array.isArray(j.videos)?j.videos:[]).filter((v:Video)=>valid(v)&&!unique.has(v.id)&&(unique.add(v.id),true)).slice(0,20);
    if(fresh.length){
      const previous=readCache(query);
      const seen=new Set<string>();
      // Preserve existing card positions while appending new video IDs.
      const merged=[...previous,...fresh].filter(v=>!seen.has(v.id)&&(seen.add(v.id),true)).slice(0,40);
      saveCache(query,merged);setVideos(merged);setError("");
    }else if(!cached.length)setError("No available product videos for this category yet.");
   }).catch(e=>{if(!controller.signal.aborted&&!cached.length)setError(e instanceof Error?e.message:"Video feed unavailable")})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>controller.abort();
 },[visible,category,retry]);
 useEffect(()=>{setPlaying(false);setPlayerFailed(false)},[category,index]);
 const current=videos[index]||null;
 const select=(n:number)=>{if(!videos.length)return;setIndex((n+videos.length)%videos.length)};
 const shop=(video:Video)=>{const q=searchTerms(video);if(q)router.push("/worlds/electric/ride/dirt-bikes?q="+encodeURIComponent(q))};
 return <section className="yntv" ref={anchor} aria-label="YNOT TikTok product slideshow" tabIndex={-1}
  onKeyDown={e=>{if(e.key==="ArrowRight")select(index+1);if(e.key==="ArrowLeft")select(index-1)}}
  onTouchStart={e=>{startX.current=e.touches[0]?.clientX??null}}
  onTouchEnd={e=>{if(startX.current===null)return;const diff=e.changedTouches[0].clientX-startX.current;startX.current=null;if(Math.abs(diff)>65)select(index+(diff<0?1:-1))}}>
  <div className="yntvStage">
   {current&&<div key={current.id} className="yntvScene">
    {current.thumbnail?<img className="yntvImage" src={current.thumbnail} alt={current.caption||"TikTok product"} fetchPriority={index===0?"high":"auto"}/>:<div className="yntvMissing">YNOT</div>}
    <div className="yntvTint"/>
    {!playing&&<button className="yntvPlayHit" type="button" onClick={()=>{setPlaying(true);setPlayerFailed(false)}} aria-label={"Watch "+(current.caption||"TikTok product video")}>
     <span className="yntvPlayCircle"><Play fill="currentColor" size={24}/></span>
    </button>}
    {playing&&<div className="yntvVideo">
      <iframe key={current.id} src={current.embedUrl} title={current.caption||"TikTok product"} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen onError={()=>setPlayerFailed(true)}/>
      <button className="yntvStop" type="button" onClick={()=>setPlaying(false)} aria-label="Return to product thumbnail">Preview</button>
      {playerFailed&&<a className="yntvOriginal" href={current.url} target="_blank" rel="noopener noreferrer">Watch on TikTok <ExternalLink size={14}/></a>}
     </div>}
    <div className="yntvInfo"><span className="yntvKicker">YNOT / DISCOVER</span>
     <p>{current.caption||"Discover this product"}</p>
     <button type="button" className="yntvShop" onClick={()=>shop(current)}><Search size={16}/> Find on YNOT</button>
    </div>
   </div>}
   {!current&&<div className="yntvEmpty">{loading?"Discovering product videos…":error||"Select a category to discover products."}{!loading&&<button type="button" onClick={()=>{cache.delete(CATEGORIES[category].search);setRetry(x=>x+1)}}>Retry</button>}</div>}
   <div className="yntvTop">
    <div className="yntvBrand">YNOT <span>PRODUCT STORIES</span></div>
    <nav className="yntvCats" aria-label="Video categories">{CATEGORIES.map((c,i)=><button key={c.label} type="button" className={i===category?"selected":""} aria-pressed={i===category} onClick={()=>setCategory(i)}>{c.label}</button>)}</nav>
   </div>
   <div className="yntvBubbleNav yntvGlassDock" aria-label="YNOT glass video navigation">
    <button className="yntvNavDot yntvDockArrow" type="button" aria-label="Previous video" disabled={videos.length<2} onClick={()=>select(index-1)}><ChevronLeft size={25}/></button>
    <div className="yntvDockMiddle">
     <button className="yntvWorldBubble" type="button" aria-label="Go to YNOT World" onClick={()=>router.push("/worlds")}>
      <span className="yntvBubbleShine"/><span className="yntvBubbleLetter">Y</span><span className="yntvBubbleName">YNOT</span>
     </button>
     {videos.length>1&&<div ref={glassTrack} className="yntvDockScrubber" role="slider" tabIndex={0} aria-label="Scrub between product videos" aria-valuemin={1} aria-valuemax={videos.length} aria-valuenow={index+1}
      onKeyDown={e=>{if(e.key==="ArrowLeft"){e.preventDefault();select(index-1)}else if(e.key==="ArrowRight"){e.preventDefault();select(index+1)}}}
      onPointerDown={e=>{e.stopPropagation();dragActive.current=true;e.currentTarget.setPointerCapture(e.pointerId);changeViaGlass(e.clientX)}}
      onPointerMove={e=>{if(dragActive.current)changeViaGlass(e.clientX)}}
      onPointerUp={e=>{dragActive.current=false;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}}
      onPointerCancel={()=>{dragActive.current=false}}>
      <span className="yntvDockTrackFill" style={{width:`${((index+1)/videos.length)*100}%`}}/>
      <span className="yntvDockTrackThumb" style={{left:`${videos.length>1?(index/(videos.length-1))*100:50}%`}}/>
     </div>}
    </div>
    <button className="yntvNavDot yntvDockArrow" type="button" aria-label="Next video" disabled={videos.length<2} onClick={()=>select(index+1)}><ChevronRight size={25}/></button>
   </div>
  </div>
  <style jsx global>{`
  .yntv{width:100%;max-width:none;background:#060606;color:#fff;position:relative;isolation:isolate;outline:none}
  .yntvStage{height:100svh;min-height:540px;position:relative;overflow:hidden;background:#080808}
  .yntvScene{position:absolute;inset:0;animation:yntvFade .65s ease both}
  @keyframes yntvFade{from{opacity:.25;transform:scale(1.02)}to{opacity:1;transform:scale(1)}}
  .yntvImage{width:100%;height:100%;object-fit:cover;object-position:center;display:block;filter:saturate(.95);will-change:transform}
  .yntvMissing{height:100%;display:grid;place-items:center;font-size:clamp(52px,12vw,160px);font-weight:800;letter-spacing:-.09em;color:#303030}
  .yntvTint{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,#0009 0%,transparent 28%,transparent 55%,#000c 90%,#000f 100%)}
  .yntvTop{position:absolute;z-index:6;top:0;left:0;right:0;padding:22px 22px 0;pointer-events:none}
  .yntvBrand{font-size:17px;font-weight:800;letter-spacing:-.055em;text-shadow:0 1px 10px #0008}
  .yntvBrand span{font-size:9px;font-weight:550;letter-spacing:.21em;margin-left:12px}
  .yntvCats{pointer-events:auto;display:flex;gap:7px;overflow:auto;scrollbar-width:none;max-width:100%;padding:20px 0 8px}
  .yntvCats::-webkit-scrollbar{display:none}
  .yntvCats button{white-space:nowrap;flex:0 0 auto;color:#fff;background:#0007;border:1px solid #fff5;backdrop-filter:blur(14px);border-radius:999px;padding:9px 14px;font-size:11px;cursor:pointer}
  .yntvCats button.selected{color:#111;background:#fff;border-color:#fff}
  .yntvPlayHit{position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent;cursor:pointer;display:grid;place-items:center;color:#fff;z-index:1}
  .yntvPlayCircle{width:68px;height:68px;display:grid;place-items:center;background:#0006;border:1px solid #fff8;backdrop-filter:blur(10px);border-radius:50%;transition:transform .2s}
  .yntvPlayHit:hover .yntvPlayCircle{transform:scale(1.08)}
  .yntvInfo{position:absolute;z-index:3;left:max(22px,env(safe-area-inset-left));bottom:clamp(90px,12vh,150px);width:min(600px,calc(100% - 44px));pointer-events:none;text-shadow:0 2px 14px #0009}
  .yntvKicker{font-size:10px;letter-spacing:.22em;opacity:.8}
  .yntvInfo p{font-size:clamp(18px,2.4vw,31px);line-height:1.2;font-weight:600;letter-spacing:-.03em;max-width:540px;margin:11px 0 18px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .yntvShop{pointer-events:auto;border:1px solid #fff8;backdrop-filter:blur(12px);background:#ffffff26;border-radius:100px;color:#fff;padding:12px 18px;display:inline-flex;align-items:center;gap:10px;font-size:12px;font-weight:650;cursor:pointer}
  .yntvNavigation{position:absolute;z-index:5;bottom:25px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:16px;font-size:12px;background:#0006;border:1px solid #fff4;backdrop-filter:blur(12px);padding:4px 7px;border-radius:100px}
  .yntvNavigation button{width:38px;height:38px;border:0;background:transparent;color:#fff;display:grid;place-items:center;cursor:pointer}
  .yntvNavigation span span{opacity:.5;margin:0 4px}
  .yntvVideo{position:absolute;z-index:2;inset:0;background:#000;display:flex;align-items:center;justify-content:center}
  .yntvVideo iframe{border:0;height:100%;width:min(100%,560px);background:#000}
  .yntvStop{position:absolute;z-index:5;top:calc(env(safe-area-inset-top,0px) + 128px);right:16px;border:1px solid #fff5;background:#0007;color:white;border-radius:999px;padding:9px 15px;font-size:11px;font-weight:600;backdrop-filter:blur(12px);cursor:pointer}
  .yntvOriginal{position:absolute;bottom:160px;right:20px;display:flex;align-items:center;gap:5px;color:#fff;background:#000b;padding:9px 13px;border-radius:99px}
  .yntvEmpty{height:100%;display:flex;align-items:center;justify-content:center;gap:12px;flex-direction:column;font-size:14px;color:#eee;padding:30px;text-align:center}
  .yntvEmpty button{border:1px solid #fff7;border-radius:99px;padding:10px 20px;background:#ffffff1b;color:white;cursor:pointer}
  .ynTikTokWorldOverlay .ynTikTokWorldHead{position:absolute;right:0;left:0;top:0;z-index:30;background:transparent;border:0;pointer-events:none}
  .ynTikTokWorldOverlay .ynTikTokWorldHead button{pointer-events:auto}
  .ynTikTokWorldOverlay .ynTikTokWorldHead>span{display:none}
  .ynTikTokWorldOverlay .ynTikTokWorldContent{overflow:hidden}
  .ynTikTokWorldOverlay .yntvStage{height:100dvh}
  @media(max-width:650px){.yntvTop{padding:calc(66px + env(safe-area-inset-top)) 12px 0}.yntvBrand{font-size:15px}.yntvBrand span{font-size:8px}.yntvCats{padding-top:12px}.yntvInfo{left:14px;bottom:110px;width:calc(100% - 28px)}.yntvInfo p{font-size:21px}.yntvNavigation{bottom:calc(20px + env(safe-area-inset-bottom))}.yntvStop{top:calc(env(safe-area-inset-top,0px) + 140px)}.yntvStage{min-height:450px}}

  /* Clear, editorial text tabs laid directly over the cover image. */
  .yntvCats{gap:clamp(17px,3vw,30px);padding:17px 0 9px}
  .yntvCats button,.yntvCats button.selected{padding:6px 0 10px;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;backdrop-filter:none!important;color:rgba(255,255,255,.65)!important;font-size:13px;letter-spacing:.02em;position:relative;text-shadow:0 1px 12px #0009}
  .yntvCats button.selected{color:#fff!important;font-weight:700}
  .yntvCats button.selected:after{content:"";height:2px;background:#fff;border-radius:10px;position:absolute;bottom:2px;left:0;right:0}
  .yntvNavigation{gap:9px;min-width:min(315px,calc(100vw - 32px));justify-content:space-between;background:rgba(215,223,237,.18);border:1px solid rgba(255,255,255,.37);box-shadow:0 8px 32px #0005,inset 0 1px 0 #fff5;backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%);padding:5px 9px}
  .yntvNavigation button{flex:none;border-radius:50%;width:37px;height:37px;background:rgba(255,255,255,.09)}
  .yntvGlassTrack{position:relative;height:25px;flex:1;min-width:80px;cursor:ew-resize;touch-action:none;outline-offset:5px}
  .yntvGlassTrack:before{content:"";position:absolute;top:50%;left:0;right:0;height:3px;transform:translateY(-50%);border-radius:10px;background:#ffffff55}
  .yntvGlassProgress{position:absolute;left:0;top:50%;height:3px;transform:translateY(-50%);background:#fffd;border-radius:10px;pointer-events:none}
  .yntvGlassThumb{position:absolute;top:50%;width:17px;height:17px;border-radius:50%;transform:translate(-50%,-50%);background:rgba(255,255,255,.94);border:1px solid #fff;box-shadow:0 1px 10px #0007;pointer-events:none;transition:left .12s ease}
  .yntvCount{flex:none;min-width:34px;text-align:center;font-size:10px;font-weight:650;letter-spacing:.03em}
  @media(max-width:650px){.yntvStage{height:100dvh;min-height:0}.yntvCats{gap:21px;padding-top:12px}.yntvCats button,.yntvCats button.selected{font-size:12px}.yntvNavigation{bottom:calc(18px + env(safe-area-inset-bottom));max-width:calc(100vw - 26px)}.yntvInfo{bottom:calc(103px + env(safe-area-inset-bottom))}}

  /* Full-bleed photographic image travels beneath the status-bar / Dynamic Island safe area. */
  .yntvStage{width:100%;border:0;border-radius:0}
  .yntvScene:before{content:"";position:absolute;z-index:1;pointer-events:none;left:0;right:0;top:0;height:calc(env(safe-area-inset-top,0px) + 155px);background:linear-gradient(180deg,rgba(0,0,0,.68) 0%,rgba(0,0,0,.34) 38%,rgba(0,0,0,.08) 72%,transparent 100%)}
  .yntvImage{transform:scale(1.075);transform-origin:center 38%;animation:yntvNotchZoom 8s ease-out both}
  @keyframes yntvNotchZoom{from{transform:scale(1.11)}to{transform:scale(1.075)}}
  @media(max-width:650px){
    .yntv,.yntvStage,.ynTikTokWorldOverlay,.ynTikTokWorldContent{border-radius:0!important;border:0!important}
    .yntvStage{height:100dvh;min-height:0;padding:0;overflow:hidden}
    .yntvImage{object-position:center 32%;animation:yntvMobileNotchZoom 8s ease-out both;transform-origin:50% 26%}
    @keyframes yntvMobileNotchZoom{from{transform:scale(1.18)}to{transform:scale(1.10)}}
    .yntvTop{padding-top:calc(env(safe-area-inset-top,0px) + 60px)}
    .yntvScene:before{height:calc(env(safe-area-inset-top,0px) + 180px)}
  }
  @media(prefers-reduced-motion:reduce){.yntvImage{animation:none;transform:scale(1.08)}}

  /* Centered YNOT World orb with two dot navigation controls; no bottom slider. */
  .yntvNavigation{display:none!important}
  .yntvBubbleNav{position:absolute;z-index:8;bottom:calc(16px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);display:flex;align-items:center;justify-content:center;gap:24px;pointer-events:auto}
  .yntvWorldBubble{position:relative;isolation:isolate;width:69px;height:69px;flex-shrink:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:0;border-radius:50%;border:1px solid rgba(255,255,255,.55);background:radial-gradient(circle at 29% 16%,rgba(255,255,255,.32),rgba(65,72,95,.35) 42%,rgba(8,10,15,.72) 87%);box-shadow:0 10px 35px #0009,inset 0 2px 1px #fff6,inset 0 -4px 9px #0008;color:white;backdrop-filter:blur(25px) saturate(170%);-webkit-backdrop-filter:blur(25px) saturate(170%);cursor:pointer;overflow:hidden}
  .yntvBubbleShine{position:absolute;top:5px;left:13px;width:35px;height:17px;background:#fffa;filter:blur(11px);border-radius:50%;opacity:.35;pointer-events:none}
  .yntvBubbleLetter{font-size:24px;font-weight:780;line-height:1;letter-spacing:-.08em;z-index:1}
  .yntvBubbleName{font-size:7px;font-weight:750;letter-spacing:.2em;z-index:1;margin-top:3px;padding-left:2px}
  .yntvNavDot{width:34px;height:34px;padding:0;display:grid;place-items:center;background:rgba(34,38,48,.24);border:1px solid rgba(255,255,255,.28);border-radius:50%;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);cursor:pointer}
  .yntvNavDot span{width:7px;height:7px;background:#fff;border-radius:50%;box-shadow:0 0 9px #fffb}
  .yntvNavDot:disabled{opacity:.28;cursor:default}
  .yntvNavDot:active:not(:disabled){transform:scale(.89)}
  @media(max-width:650px){.yntvBubbleNav{bottom:calc(12px + env(safe-area-inset-bottom));gap:19px}.yntvWorldBubble{width:65px;height:65px}.yntvInfo{bottom:calc(107px + env(safe-area-inset-bottom))}}

  /* Floating glass dock with central raised YNOT orb */
  .yntvBubbleNav.yntvGlassDock{position:absolute;z-index:20;left:50%;bottom:calc(15px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(91vw,440px);height:77px;display:flex;align-items:center;justify-content:space-between;gap:0;padding:0 22px;border-radius:999px;border:1px solid rgba(255,255,255,.31);background:linear-gradient(140deg,rgba(80,86,96,.50),rgba(12,14,19,.59) 48%,rgba(54,58,73,.50));box-shadow:0 14px 38px #000a,inset 0 1px 0 #ffffff5c,inset 0 -1px 0 #ffffff18;backdrop-filter:blur(28px) saturate(175%);-webkit-backdrop-filter:blur(28px) saturate(175%);isolation:isolate}
  .yntvGlassDock:before{content:"";position:absolute;inset:3px;border-radius:inherit;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.12),transparent 50%,rgba(255,255,255,.035))}
  .yntvGlassDock .yntvDockArrow{position:relative;z-index:2;width:52px;height:52px;border-radius:50%;border:0;background:rgba(255,255,255,.065);display:grid;place-items:center;color:white;transition:background .2s}
  .yntvGlassDock .yntvDockArrow:active:not(:disabled){background:#ffffff38}
  .yntvDockMiddle{height:100%;flex:1;position:relative;display:flex;justify-content:center;align-items:flex-end;min-width:0;padding-bottom:12px}
  .yntvGlassDock .yntvWorldBubble{position:absolute;bottom:30px;left:50%;transform:translateX(-50%);width:66px;height:66px;z-index:3;border-color:#ffffff80;box-shadow:0 10px 28px #000c,inset 0 2px 2px #ffffff78,inset 0 -3px 7px #0008}
  .yntvDockScrubber{position:relative;width:min(122px,100%);height:18px;flex:none;touch-action:none;cursor:ew-resize;outline-offset:4px;z-index:4}
  .yntvDockScrubber:before{content:"";position:absolute;left:0;right:0;top:8px;height:3px;background:#ffffff51;border-radius:6px}
  .yntvDockTrackFill{position:absolute;left:0;top:8px;height:3px;border-radius:6px;background:#fffd;pointer-events:none}
  .yntvDockTrackThumb{position:absolute;top:9px;width:13px;height:13px;border-radius:50%;background:white;box-shadow:0 1px 9px #0008;transform:translate(-50%,-50%);pointer-events:none}
  .yntvGlassDock .yntvNavDot:disabled{opacity:.33}
  @media(max-width:650px){.yntvBubbleNav.yntvGlassDock{bottom:calc(12px + env(safe-area-inset-bottom));height:73px;width:min(93vw,420px);padding:0 17px}.yntvGlassDock .yntvWorldBubble{bottom:28px;width:64px;height:64px}.yntvGlassDock .yntvDockArrow{width:49px;height:49px}.yntvInfo{bottom:calc(125px + env(safe-area-inset-bottom))}}
  `}</style>
 </section>;
}
