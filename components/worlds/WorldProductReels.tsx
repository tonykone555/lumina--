"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {Clapperboard,ChevronUp,Heart,LoaderCircle,ShoppingBag,Shuffle,X} from "lucide-react";
type Item={id:string;title:string;image:string;images?:string[];videos?:string[];price?:number|null;currency?:string;brand?:string;source?:string;url?:string};
const SEARCHES=["sculptural home decor","streetwear sneakers","coffee brewing accessories","pet accessories","modern furniture","travel organizer","retro gaming accessories","fitness equipment","statement lighting","smart kitchen tools","vintage style jackets","automotive accessories","creative desk accessories","designer bags","outdoor camping gear","headphones audio","home improvement tools","women fashion","collectible objects","bicycle accessories","baby essentials","sports equipment","decorative mirrors","home textiles","photography accessories"];
const isUrl=(s:unknown):s is string=>typeof s==="string"&&/^https:\/\//i.test(s);
function shuffle<T>(arr:T[]){const out=[...arr];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
function price(p:Item){if(!Number.isFinite(p.price))return"";try{return new Intl.NumberFormat(undefined,{style:"currency",currency:p.currency||"EUR"}).format(Number(p.price))}catch{return`${p.price} ${p.currency||"EUR"}`}}
const catalogLink=(p:Item)=>`/worlds/electric/ride/dirt-bikes?product=${encodeURIComponent(p.id)}&q=${encodeURIComponent(p.title)}`;
export default function WorldProductReels(){
 const[open,setOpen]=useState(false),[items,setItems]=useState<Item[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(""),[active,setActive]=useState(0);
 const seen=useRef(new Set<string>()),loadLock=useRef(false),batchNo=useRef(0),rail=useRef<HTMLDivElement>(null);
 const load=useCallback(async()=>{
  if(loadLock.current)return;
  loadLock.current=true;setLoading(true);setError("");
  const batch=batchNo.current++;
  const selected=shuffle(SEARCHES).slice(0,3);
  try{
   const replies=await Promise.allSettled(selected.map(async q=>{const res=await fetch(`/api/catalog?q=${encodeURIComponent(q)}&source=shopify&country=FR&limit=60`,{cache:"no-store"});if(!res.ok)throw Error("Catalogue unavailable");const json=await res.json();return Array.isArray(json.products)?json.products as Item[]:[]}));
   const found=shuffle(replies.flatMap(r=>r.status==="fulfilled"?r.value:[])).filter(p=>p.id&&p.title&&isUrl(p.image)&&!!p.url).filter(p=>{const id=String(p.id);if(seen.current.has(id))return false;seen.current.add(id);return true});
   if(found.length){setItems(v=>[...v,...found.slice(0,65)])}else if(batch===0)setError("Catalogue is unavailable right now. Try again.");
  }catch{setError("Could not load products. Try again.")}finally{loadLock.current=false;setLoading(false)}
 },[]);
 useEffect(()=>{if(!open)return;const prev=document.body.style.overflow;document.body.style.overflow="hidden";const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")setOpen(false);if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();const n=Math.max(0,Math.min(items.length-1,active+(e.key==="ArrowDown"?1:-1)));rail.current?.children[n]?.scrollIntoView({behavior:"smooth"});setActive(n)}};window.addEventListener("keydown",onKey);if(!items.length)void load();return()=>{document.body.style.overflow=prev;window.removeEventListener("keydown",onKey)}},[open,items.length,active,load]);
 const onScroll=()=>{const el=rail.current;if(!el)return;const n=Math.max(0,Math.round(el.scrollTop/Math.max(1,el.clientHeight)));setActive(n);if(n>=items.length-5&&!loading)void load()};
 const next=()=>{const n=active+1;if(n<items.length)rail.current?.children[n]?.scrollIntoView({behavior:"smooth"});else void load()};
 return <><button type="button" className="ynReelBubble" aria-label="Discover random products" onClick={()=>setOpen(true)}><Clapperboard size={21}/><span>Discover</span></button>
 {open&&<div className="ynReelOverlay" role="dialog" aria-modal="true" aria-label="Discover products swipe feed">
  <header className="ynReelHeader"><span><b>YNOT</b> / DISCOVER</span><button type="button" onClick={()=>setOpen(false)} aria-label="Close Discover"><X size={22}/></button></header>
  <div className="ynReelRail" ref={rail} onScroll={onScroll}>
   {items.map((p,i)=><article key={p.id+"-"+i} className="ynReelSlide">
    {i===active&&Array.isArray(p.videos)&&p.videos.some(isUrl)?<video className="ynReelMedia" autoPlay muted loop playsInline poster={p.image} src={p.videos.find(isUrl)} onError={e=>{e.currentTarget.style.display="none"}}/>:null}
    <img className="ynReelImage" src={p.image} alt={p.title} loading={Math.abs(i-active)<=2?"eager":"lazy"}/>
    <div className="ynReelShade"/>
    <div className="ynReelDetails"><small>{p.brand||p.source||"YNOT catalogue"}</small><h2>{p.title}</h2>{price(p)&&<strong>{price(p)}</strong>}<p>PRODUCT CODE · {String(p.id).slice(-24)}</p><a href={catalogLink(p)}><ShoppingBag size={17}/> Explore this product</a></div>
    <aside className="ynReelSide"><button onClick={()=>{navigator.clipboard?.writeText?.(String(p.id)).catch(()=>{})}} aria-label="Copy product code"><Shuffle size={19}/><span>Code</span></button><button onClick={next} aria-label="Next product"><ChevronUp size={23} style={{transform:"rotate(180deg)"}}/><span>Next</span></button></aside>
    <div className="ynReelCount">{i+1} / {items.length}</div>
   </article>)}
   {loading&&<div className="ynReelStatus"><LoaderCircle className="ynReelSpin" size={22}/> Discovering random products…</div>}
   {!loading&&error&&<div className="ynReelStatus">{error}<button type="button" onClick={()=>void load()}>Retry</button></div>}
  </div>
 </div>}
 <style jsx global>{`
 .ynReelBubble{position:fixed;bottom:calc(26px + env(safe-area-inset-bottom));left:calc(50% + 78px);z-index:2147483002;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;width:69px;height:69px;border-radius:50%;border:1px solid #ffffff70;background:radial-gradient(circle at 28% 18%,#ffffff58,transparent 34%),linear-gradient(150deg,#484b58a0,#11121bcf 65%,#686e7699);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:inset 0 2px 12px #ffffff25,0 12px 30px #000b;color:#fff;cursor:pointer}
 .ynReelBubble span{font-size:9px;font-weight:700;letter-spacing:.01em}
 .ynReelOverlay{position:fixed;inset:0;z-index:2147483600;background:#09090c;color:#fff}
 .ynReelHeader{position:absolute;z-index:12;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:calc(15px + env(safe-area-inset-top)) 18px 12px;pointer-events:none;text-shadow:0 2px 10px #000}
 .ynReelHeader span{font-size:12px;letter-spacing:.14em}.ynReelHeader button{pointer-events:auto;color:#fff;border:1px solid #ffffff55;background:#19191d88;border-radius:50%;height:42px;width:42px;display:grid;place-items:center}
 .ynReelRail{width:100%;height:100dvh;overflow-y:auto;scroll-snap-type:y mandatory;scrollbar-width:none;overscroll-behavior:contain}.ynReelRail::-webkit-scrollbar{display:none}
 .ynReelSlide{height:100dvh;width:100%;position:relative;scroll-snap-align:start;scroll-snap-stop:always;overflow:hidden;background:#17171c}
 .ynReelImage,.ynReelMedia{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:radial-gradient(ellipse at center,#37373f 0,#121217 74%)}
 .ynReelMedia{z-index:2}.ynReelShade{position:absolute;z-index:3;inset:30% 0 0;background:linear-gradient(transparent 20%,#0008 65%,#000e)}
 .ynReelDetails{position:absolute;z-index:5;left:max(20px,calc((100vw - 650px)/2));right:max(90px,calc((100vw - 650px)/2 + 66px));bottom:calc(45px + env(safe-area-inset-bottom));text-shadow:0 2px 9px #000}
 .ynReelDetails small{font-size:11px;opacity:.85;text-transform:uppercase;letter-spacing:.11em}.ynReelDetails h2{margin:8px 0;font-size:clamp(21px,4.8vw,31px);line-height:1.07;max-width:540px}.ynReelDetails strong{font-size:18px}.ynReelDetails p{font-size:10px;opacity:.72;overflow-wrap:anywhere}.ynReelDetails a{display:inline-flex;align-items:center;gap:8px;color:#111;background:#fff;padding:12px 17px;text-shadow:none;border-radius:999px;text-decoration:none;font-size:13px;font-weight:700;margin-top:10px}
 .ynReelSide{position:absolute;z-index:6;bottom:calc(105px + env(safe-area-inset-bottom));right:max(13px,calc((100vw - 650px)/2));display:flex;flex-direction:column;gap:18px}.ynReelSide button{width:58px;min-height:56px;display:flex;flex-direction:column;align-items:center;gap:3px;border:0;background:#0008;color:#fff;border-radius:24px;padding:10px 4px}.ynReelSide span{font-size:10px}
 .ynReelCount{position:absolute;right:16px;top:calc(85px + env(safe-area-inset-top));font-size:11px;z-index:5;opacity:.65}.ynReelStatus{height:100dvh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;color:#fff9;font-size:14px}.ynReelStatus button{background:#fff;color:#111;border:0;border-radius:99px;padding:10px 16px}.ynReelSpin{animation:ynReelRotate 1s linear infinite}@keyframes ynReelRotate{to{transform:rotate(360deg)}}
 @media(max-width:650px){.ynReelBubble{width:62px;height:62px;bottom:calc(26px + env(safe-area-inset-bottom));left:calc(50% + 70px)}.ynReelDetails{left:19px;right:86px;bottom:calc(32px + env(safe-area-inset-bottom))}.ynReelSide{right:11px}}
 `}</style>
 </>;
}
