"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Heart, ExternalLink, Sparkles, ChevronRight, SlidersHorizontal, RotateCcw, Compass, Home, Bookmark, ScanFace } from "lucide-react";

type Product = {
  id:string; title:string; brand:string; price:number|null; currency?:string; image:string; url?:string;
  tags?:string[]; source?:string; asin?:string; x?:number; y?:number;
};

type Scene = { a:string; b:string; c:string; image:string; query:string; labels:string[] };

const SCENES:Record<string,Scene> = {
  fashion:{a:"#eee9e2",b:"#d8c9ba",c:"#78695c",image:"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2200&q=88",query:"Summer dresses for a Mediterranean wedding under €180",labels:["Linen","Minimal","Romantic","Under €150","Independent","Vacation"]},
  fitness:{a:"#e7ebe6",b:"#b8c4b7",c:"#526258",image:"https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2200&q=88",query:"Best gym shorts for bodybuilding under €80",labels:["Strength","Breathable","Under €80","Lightweight","Performance","Retail"]},
  hair:{a:"#eee8df",b:"#cdbca8",c:"#766757",image:"https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=2200&q=88",query:"A non-greasy routine for fuller-looking hair",labels:["Scalp care","Lightweight","Volume","Repair","Under €50","Gentle"]},
  skin:{a:"#f1e9e7",b:"#d8c5c1",c:"#85726f",image:"https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=2200&q=88",query:"Skincare for acne marks and uneven tone, sensitive skin",labels:["Sensitive","Niacinamide","Barrier","Under €50","Brightening","Gentle"]},
  smile:{a:"#edf2f1",b:"#c7d9da",c:"#687c7e",image:"https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=2200&q=88",query:"A gentle at-home routine for a brighter smile",labels:["Sensitive teeth","Whitening","Under €50","Everyday","Gentle","Top rated"]},
  home:{a:"#ece9e1",b:"#c8bcae",c:"#756c62",image:"https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2200&q=88",query:"A warm minimal sofa for a small living room",labels:["Warm minimal","Small spaces","Modular","Natural","Under €1200","Independent"]},
  retail:{a:"#ecebe7",b:"#c7c8c2",c:"#686e68",image:"https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=2200&q=88",query:"Show me something worth discovering",labels:["Top picks","Retail","Independent","Marketplace","Deals","New"]}
};

const NICHES = ["fashion","fitness","hair","skin","smile"];

function category(q:string){
  const s=q.toLowerCase();
  if(/gym|fitness|running|training|shorts|recovery/.test(s)) return "fitness";
  if(/hair|scalp|shampoo|density/.test(s)) return "hair";
  if(/skin|serum|acne|blemish|moistur|tone/.test(s)) return "skin";
  if(/smile|teeth|tooth|oral|whitening/.test(s)) return "smile";
  if(/sofa|chair|home|furniture|lamp|table/.test(s)) return "home";
  if(/dress|fashion|shirt|jean|jacket|coat|bag|jewelry/.test(s)) return "fashion";
  return "retail";
}

function money(p:Product){
  if(p.price==null) return "";
  try{return new Intl.NumberFormat(undefined,{style:"currency",currency:p.currency||"EUR",maximumFractionDigits:0}).format(p.price)}catch{return String(p.price)}
}
function hash(s:string){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return Math.abs(h)}
function sourceKind(p:Product){
  const s=(p.source||"").toLowerCase();
  if(s.includes("amazon")||s.includes("shopify")) return "Retail";
  if(s.includes("ebay")) return "Marketplace";
  if(s.includes("etsy")) return "Independent";
  return "Retail";
}
function distance(a:{x:number;y:number},b:{x:number;y:number}){return Math.hypot(a.x-b.x,a.y-b.y)}

export default function LuminaWorld(){
  const [query,setQuery]=useState(SCENES.fashion.query);
  const [submitted,setSubmitted]=useState(query);
  const [products,setProducts]=useState<Product[]>([]);
  const [selected,setSelected]=useState<Product|null>(null);
  const [focus,setFocus]=useState("");
  const [zoom,setZoom]=useState(.88);
  const [pan,setPan]=useState({x:-1300,y:-900});
  const [loading,setLoading]=useState(false);
  const [source,setSource]=useState("Catalog ready");
  const [radial,setRadial]=useState<{product:Product;x:number;y:number}|null>(null);
  const [hidden,setHidden]=useState<Set<string>>(new Set());
  const [liked,setLiked]=useState<Set<string>>(new Set());
  const [sourceFilter,setSourceFilter]=useState("Top picks");
  const [mobileNav,setMobileNav]=useState(false);
  const [mobileSources,setMobileSources]=useState(false);
  const [detailDrag,setDetailDrag]=useState(0);
  const worldRef=useRef<HTMLDivElement>(null);
  const panRef=useRef({drag:false,px:0,py:0,startX:0,startY:0,edge:"" as ""|"left"|"right"});
  const holdRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const pointersRef=useRef(new Map<number,{x:number;y:number}>());
  const pinchRef=useRef<{distance:number;zoom:number}|null>(null);
  const detailSwipeRef=useRef<{x:number;y:number}|null>(null);
  const cat=category(submitted);
  const scene=SCENES[cat]||SCENES.retail;

  const fetchProducts=useCallback(async(nextFocus="")=>{
    setLoading(true);
    try{
      const params=new URLSearchParams({q:submitted});
      if(nextFocus) params.set("direction",nextFocus);
      const r=await fetch(`/api/catalog?${params}`);
      const data=await r.json();
      const list:Product[]=(data.products||[]).map((p:Product,i:number)=>{
        const h=hash(p.id||`${p.title}-${i}`); const angle=(h%628)/100; const radius=220+(h%430);
        return {...p,x:1300+Math.cos(angle)*radius,y:900+Math.sin(angle)*radius};
      });
      setProducts(list); setSource((data.sources||[data.source||"Catalog"]).join(" + "));
    }catch{setProducts([]);setSource("Catalog unavailable")}
    finally{setLoading(false)}
  },[submitted]);

  useEffect(()=>{fetchProducts(focus)},[submitted]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible=useMemo(()=>products.filter(p=>{
    if(hidden.has(p.id)) return false;
    if(sourceFilter==="Top picks") return true;
    return sourceKind(p)===sourceFilter;
  }),[products,hidden,sourceFilter]);

  const labels=useMemo(()=>{
    const fromProducts=visible.flatMap(p=>p.tags||[]).filter(Boolean);
    return [...new Set([focus,...scene.labels,...fromProducts])].filter(Boolean).slice(0,8);
  },[visible,focus,scene.labels]);

  const semanticLevel=zoom<.65?"worlds":zoom<1.02?"themes":zoom<1.42?"products":"details";

  function submit(){const q=query.trim()||"Show me something worth discovering";setSubmitted(q);setFocus("");setSelected(null);setHidden(new Set());setPan({x:-1300,y:-900});setZoom(.88)}
  function explore(label:string){setFocus(label);setSelected(null);fetchProducts(label);setZoom(Math.max(zoom,1.02))}
  function selectProduct(p:Product){setSelected(p);setRadial(null);setZoom(z=>Math.max(z,1.18))}
  function nextProduct(direction=1){
    if(!selected||visible.length<2)return;
    const i=visible.findIndex(p=>p.id===selected.id); const next=visible[(i+direction+visible.length)%visible.length];
    setSelected(next);
  }
  function popNext(){
    if(!selected||visible.length<2)return;
    const i=visible.findIndex(p=>p.id===selected.id); const next=visible[(i+1)%visible.length];
    setHidden(h=>new Set([...h,selected.id])); setSelected(next);
  }
  function beginHold(e:React.PointerEvent,p:Product){
    if(holdRef.current)clearTimeout(holdRef.current);
    holdRef.current=setTimeout(()=>setRadial({product:p,x:e.clientX,y:e.clientY}),520);
  }
  function endHold(){if(holdRef.current){clearTimeout(holdRef.current);holdRef.current=null}}
  function refineAround(label:string){setRadial(null);explore(label)}

  function worldPointerDown(e:React.PointerEvent<HTMLElement>){
    pointersRef.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointersRef.current.size===2){
      const pts=[...pointersRef.current.values()];
      pinchRef.current={distance:distance(pts[0],pts[1]),zoom};
      panRef.current.drag=false;
      return;
    }
    if((e.target as HTMLElement).closest("button,input,a,.lv4-product,.lv4-textbubble,.lv4-detail"))return;
    const edge=e.clientX<28?"left":e.clientX>window.innerWidth-28?"right":"";
    panRef.current={drag:true,px:e.clientX-pan.x,py:e.clientY-pan.y,startX:e.clientX,startY:e.clientY,edge};
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function worldPointerMove(e:React.PointerEvent<HTMLElement>){
    if(pointersRef.current.has(e.pointerId)) pointersRef.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointersRef.current.size===2&&pinchRef.current){
      const pts=[...pointersRef.current.values()];
      const d=distance(pts[0],pts[1]);
      const next=pinchRef.current.zoom*(d/pinchRef.current.distance);
      setZoom(Math.min(1.85,Math.max(.48,next)));
      return;
    }
    if(panRef.current.drag)setPan({x:e.clientX-panRef.current.px,y:e.clientY-panRef.current.py});
  }

  function worldPointerUp(e:React.PointerEvent<HTMLElement>){
    pointersRef.current.delete(e.pointerId);
    if(pointersRef.current.size<2)pinchRef.current=null;
    const swipeX=e.clientX-panRef.current.startX;
    if(panRef.current.edge==="left"&&swipeX>52)setMobileNav(true);
    if(panRef.current.edge==="right"&&swipeX<-52)setMobileSources(true);
    panRef.current.drag=false;
  }

  function detailPointerDown(e:React.PointerEvent){detailSwipeRef.current={x:e.clientX,y:e.clientY};setDetailDrag(0)}
  function detailPointerMove(e:React.PointerEvent){if(detailSwipeRef.current)setDetailDrag(e.clientX-detailSwipeRef.current.x)}
  function detailPointerUp(e:React.PointerEvent){
    if(!detailSwipeRef.current)return;
    const dx=e.clientX-detailSwipeRef.current.x; const dy=e.clientY-detailSwipeRef.current.y;
    if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)) nextProduct(dx<0?1:-1);
    else if(dy>85)setSelected(null);
    setDetailDrag(0);detailSwipeRef.current=null;
  }

  return <main className="lv4-shell" style={{"--a":scene.a,"--b":scene.b,"--c":scene.c,"--scene":`url(${scene.image})`} as React.CSSProperties}>
    <div className="lv4-scene"/>

    <button className="lv4-mobile-top-hotspot" aria-label="Search" onClick={()=>document.querySelector<HTMLInputElement>(".lv4-search input")?.focus()}/>
    <button className="lv4-mobile-left-hotspot" aria-label="Open navigation" onClick={()=>setMobileNav(true)}/>
    <button className="lv4-mobile-right-hotspot" aria-label="Open product sources" onClick={()=>setMobileSources(true)}/>

    <aside className={`lv4-rail ${mobileNav?"mobile-open":""}`} aria-label="Lumina navigation">
      <button className="lv4-logo" onClick={()=>setMobileNav(false)}>L@</button>
      <button onClick={()=>setMobileNav(false)}><Home/><span>Discover</span></button>
      <button onClick={()=>{setZoom(.56);setMobileNav(false)}}><Compass/><span>Worlds</span></button>
      <button onClick={()=>setMobileNav(false)}><ScanFace/><span>Try on</span></button>
      <button onClick={()=>setMobileNav(false)}><Bookmark/><span>Saved</span></button>
      <button onClick={()=>{setPan({x:-1300,y:-900});setZoom(.88);setMobileNav(false)}}><RotateCcw/><span>Reset</span></button>
    </aside>

    <header className="lv4-search">
      <Search/>
      <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} aria-label="Describe what you want"/>
      <button onClick={submit}>↵</button>
    </header>

    <section className={`lv4-source-tabs ${mobileSources?"mobile-open":""}`} aria-label="Product source filter">
      {["Top picks","Retail","Marketplace","Independent"].map(x=><button key={x} className={sourceFilter===x?"active":""} onClick={()=>{setSourceFilter(x);setMobileSources(false)}}>{x}</button>)}
    </section>

    <section
      ref={worldRef}
      className={`lv4-world level-${semanticLevel}`}
      onPointerDown={worldPointerDown}
      onPointerMove={worldPointerMove}
      onPointerUp={worldPointerUp}
      onPointerCancel={worldPointerUp}
      onDoubleClick={()=>{setPan({x:-1300,y:-900});setZoom(.88)}}
      onWheel={e=>{e.preventDefault();setZoom(z=>Math.min(1.85,Math.max(.48,z*(e.deltaY<0?1.075:.93))))}}
    >
      <div className="lv4-stage" style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}>
        <button className="lv4-intent" onClick={()=>document.querySelector<HTMLInputElement>(".lv4-search input")?.focus()}>
          <span>{focus||submitted}</span><small>{loading?"Finding the world…":source}</small>
        </button>

        {semanticLevel==="worlds" && NICHES.map((n,i)=>{
          const a=i/NICHES.length*Math.PI*2-.6; const x=1300+Math.cos(a)*440,y=900+Math.sin(a)*310;
          return <button key={n} className="lv4-worldbubble" style={{left:x,top:y}} onClick={()=>{setQuery(SCENES[n].query);setSubmitted(SCENES[n].query);setFocus("")}}>{n}</button>
        })}

        {labels.map((label,i)=>{
          const a=i/Math.max(labels.length,1)*Math.PI*2-.4; const r=280+(i%2)*110; const x=1300+Math.cos(a)*r,y=900+Math.sin(a)*r;
          return <button key={`${label}-${i}`} className={`lv4-textbubble ${focus===label?"active":""}`} style={{left:x,top:y}} onClick={()=>explore(label)}>{label}</button>
        })}

        {visible.map((p,i)=>{
          const x=p.x||1300,y=p.y||900; const size=86+(hash(p.id)%62); const showMeta=semanticLevel==="details"||selected?.id===p.id;
          return <button
            key={p.id}
            className={`lv4-product ${selected?.id===p.id?"selected":""}`}
            style={{left:x,top:y,"--s":`${size}px`} as React.CSSProperties}
            onPointerDown={e=>beginHold(e,p)} onPointerUp={endHold} onPointerLeave={endHold}
            onClick={()=>selectProduct(p)}
          >
            <img src={p.image} alt=""/>
            {semanticLevel!=="themes"&&<span className="lv4-price">{money(p)}</span>}
            {showMeta&&<span className="lv4-orbmeta"><b>{p.title}</b><em>{p.brand}</em></span>}
          </button>
        })}
      </div>
    </section>

    <div className="lv4-zoomhint">{semanticLevel}<span>{Math.round(zoom*100)}%</span></div>

    {selected&&<aside className="lv4-detail" style={{"--detail-drag":`${detailDrag}px`} as React.CSSProperties} onPointerDown={detailPointerDown} onPointerMove={detailPointerMove} onPointerUp={detailPointerUp} onPointerCancel={detailPointerUp}>
      <div className="lv4-mobile-grabber"/>
      <button className="lv4-close" onClick={()=>setSelected(null)}><X/></button>
      <img src={selected.image} alt={selected.title}/>
      <div className="lv4-detailcopy">
        <small>{sourceKind(selected)} · {selected.brand}</small>
        <h2>{selected.title}</h2>
        <strong>{money(selected)}</strong>
        <p>Matched to “{focus||submitted}” through product attributes, intent and source quality.</p>
        <div className="lv4-tagrow">{(selected.tags||[]).slice(0,4).map(t=><button key={t} onClick={()=>explore(t)}>{t}</button>)}</div>
        <div className="lv4-actions">
          <button className={liked.has(selected.id)?"active":""} onClick={()=>setLiked(s=>{const n=new Set(s);n.has(selected.id)?n.delete(selected.id):n.add(selected.id);return n})}><Heart/></button>
          <a href={selected.url||"#"} target="_blank" rel="noreferrer">View at store <ExternalLink/></a>
          {cat==="fashion"&&<button className="try"><Sparkles/> Try on</button>}
        </div>
        <button className="lv4-pop" onClick={popNext}>Pop this · next match <ChevronRight/></button>
      </div>
    </aside>}

    {radial&&<div className="lv4-radial" style={{left:radial.x,top:radial.y}}>
      <button onClick={()=>refineAround("More like this")}>More like this</button>
      <button onClick={()=>refineAround("Cheaper")}>Cheaper</button>
      <button onClick={()=>refineAround("More minimal")}>More minimal</button>
      <button onClick={()=>refineAround(sourceKind(radial.product))}>{sourceKind(radial.product)}</button>
      <button className="center" onClick={()=>setRadial(null)}><X/></button>
    </div>}

    <button className="lv4-refine" onClick={()=>setZoom(z=>z<1.05?1.12:.82)}><SlidersHorizontal/><span>{semanticLevel}</span></button>
  </main>
}