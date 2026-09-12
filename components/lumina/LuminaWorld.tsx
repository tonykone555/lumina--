"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Heart, ExternalLink, Sparkles, ChevronRight, SlidersHorizontal, RotateCcw, Compass, Home, Bookmark, ScanFace, Map as MapIcon } from "lucide-react";

type Product = {
  id:string; title:string; brand:string; price:number|null; currency?:string; image:string; url?:string;
  tags?:string[]; source?:string; asin?:string; x?:number; y?:number; zone?:number;
};

type Scene = { a:string; b:string; c:string; image:string; query:string; labels:string[] };
type CatalogPage = { products?:Product[]; source?:string; sources?:string[]; pagination?:Record<string,unknown> };

const WORLD_W=12000;
const WORLD_H=7200;
const WORLD_CX=WORLD_W/2;
const WORLD_CY=WORLD_H/2;
const ZONE_STEP=1450;
const ZONE_OFFSETS=[
  [0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1],
  [2,0],[-2,0],[0,2],[0,-2],[2,1],[-2,1],[2,-1],[-2,-1],[1,2],[-1,2],[1,-2],[-1,-2],
  [3,0],[-3,0],[0,3],[0,-3]
] as const;

const SCENES:Record<string,Scene> = {
  fashion:{a:"#eee9e2",b:"#d8c9ba",c:"#78695c",image:"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2200&q=88",query:"Summer dresses for a Mediterranean wedding under €180",labels:["Linen","Minimal","Romantic","Under €150","Independent","Vacation"]},
  fitness:{a:"#e7ebe6",b:"#b8c4b7",c:"#526258",image:"https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2200&q=88",query:"Best gym shorts for bodybuilding under €80",labels:["Strength","Breathable","Under €80","Lightweight","Performance","Retail"]},
  hair:{a:"#eee8df",b:"#cdbca8",c:"#766757",image:"https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=2200&q=88",query:"A non-greasy routine for fuller-looking hair",labels:["Scalp care","Lightweight","Volume","Repair","Under €50","Gentle"]},
  skin:{a:"#f1e9e7",b:"#d8c5c1",c:"#85726f",image:"https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=2200&q=88",query:"Skincare for acne marks and uneven tone, sensitive skin",labels:["Sensitive","Niacinamide","Barrier","Under €50","Brightening","Gentle"]},
  smile:{a:"#edf2f1",b:"#c7d9da",c:"#687c7e",image:"https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=2200&q=88",query:"A gentle at-home routine for a brighter smile",labels:["Sensitive teeth","Whitening","Under €50","Everyday","Gentle","Top rated"]},
  home:{a:"#ece9e1",b:"#c8bcae",c:"#756c62",image:"https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2200&q=88",query:"A warm minimal sofa for a small living room",labels:["Warm minimal","Small spaces","Modular","Natural","Under €1200","Independent"]},
  retail:{a:"#ecebe7",b:"#c7c8c2",c:"#686e68",image:"https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=2200&q=88",query:"Show me something worth discovering",labels:["Top picks","Retail","Independent","Marketplace","Deals","New"]}
};
const NICHES=["fashion","fitness","hair","skin","smile"];

function category(q:string){const s=q.toLowerCase();if(/gym|fitness|running|training|shorts|recovery/.test(s))return"fitness";if(/hair|scalp|shampoo|density/.test(s))return"hair";if(/skin|serum|acne|blemish|moistur|tone/.test(s))return"skin";if(/smile|teeth|tooth|oral|whitening/.test(s))return"smile";if(/sofa|chair|home|furniture|lamp|table/.test(s))return"home";if(/dress|fashion|shirt|jean|jacket|coat|bag|jewelry/.test(s))return"fashion";return"retail"}
function money(p:Product){if(p.price==null)return"";try{return new Intl.NumberFormat(undefined,{style:"currency",currency:p.currency||"EUR",maximumFractionDigits:0}).format(p.price)}catch{return String(p.price)}}
function hash(s:string){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return Math.abs(h)}
function sourceKind(p:Product){const s=(p.source||"").toLowerCase();if(s.includes("amazon")||s.includes("shopify"))return"Retail";if(s.includes("ebay"))return"Marketplace";if(s.includes("etsy"))return"Independent";return"Retail"}
function distance(a:{x:number;y:number},b:{x:number;y:number}){return Math.hypot(a.x-b.x,a.y-b.y)}
function nextCursor(p?:Record<string,unknown>){if(!p)return"";return String(p.next_cursor||p.nextCursor||p.cursor||"")}
function hasNext(p?:Record<string,unknown>){if(!p)return false;return Boolean(p.has_next_page??p.hasNextPage??nextCursor(p))}
function dedupe(list:Product[]){const seen=new Set<string>();return list.filter(p=>{const k=p.id||`${p.title}|${p.brand}`;if(seen.has(k))return false;seen.add(k);return true})}
function zoneCenter(zone:number){const off=ZONE_OFFSETS[zone%ZONE_OFFSETS.length]||[0,0];return{x:WORLD_CX+off[0]*ZONE_STEP,y:WORLD_CY+off[1]*ZONE_STEP}}
function placeProduct(p:Product,index:number){const zone=Math.floor(index/24);const local=index%24;const h=hash(p.id||`${p.title}-${index}`);const center=zoneCenter(zone);const ring=220+(local%4)*115+(h%48);const angle=(local/24)*Math.PI*2+(h%50)/100;return{...p,zone,x:center.x+Math.cos(angle)*ring,y:center.y+Math.sin(angle)*(ring*.74)}}

export default function LuminaWorld(){
  const [query,setQuery]=useState(SCENES.fashion.query);
  const [submitted,setSubmitted]=useState(query);
  const [products,setProducts]=useState<Product[]>([]);
  const [selected,setSelected]=useState<Product|null>(null);
  const [focus,setFocus]=useState("");
  const [zoom,setZoom]=useState(.92);
  const [pan,setPan]=useState({x:-WORLD_CX*.92,y:-WORLD_CY*.92});
  const [loading,setLoading]=useState(false);
  const [loadingMore,setLoadingMore]=useState(false);
  const [source,setSource]=useState("Catalog ready");
  const [pagination,setPagination]=useState<Record<string,unknown>>({});
  const [radial,setRadial]=useState<{product:Product;x:number;y:number}|null>(null);
  const [hidden,setHidden]=useState<Set<string>>(new Set());
  const [liked,setLiked]=useState<Set<string>>(new Set());
  const [sourceFilter,setSourceFilter]=useState("Top picks");
  const [mobileNav,setMobileNav]=useState(false);
  const [mobileSources,setMobileSources]=useState(false);
  const [detailDrag,setDetailDrag]=useState(0);
  const [mapOpen,setMapOpen]=useState(false);
  const [mapSearch,setMapSearch]=useState("");
  const worldRef=useRef<HTMLDivElement>(null);
  const panRef=useRef({drag:false,px:0,py:0,startX:0,startY:0,edge:"" as ""|"left"|"right"});
  const holdRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const pointersRef=useRef(new Map<number,{x:number;y:number}>());
  const pinchRef=useRef<{distance:number;zoom:number}|null>(null);
  const detailSwipeRef=useRef<{x:number;y:number}|null>(null);
  const lastAutoLoadRef=useRef(0);
  const cat=category(submitted);
  const scene=SCENES[cat]||SCENES.retail;

  const fetchProducts=useCallback(async(nextFocus="")=>{
    setLoading(true);
    try{
      const params=new URLSearchParams({q:submitted});if(nextFocus)params.set("direction",nextFocus);
      const r=await fetch(`/api/catalog?${params}`);const data:CatalogPage=await r.json();
      const initial=dedupe(data.products||[]).map((p,i)=>placeProduct(p,i));
      setProducts(initial);setPagination(data.pagination||{});setSource((data.sources||[data.source||"Catalog"]).join(" + "));
    }catch{setProducts([]);setPagination({});setSource("Catalog unavailable")}finally{setLoading(false)}
  },[submitted]);

  const loadMore=useCallback(async()=>{
    const cursor=nextCursor(pagination);if(!cursor||loadingMore)return;
    setLoadingMore(true);
    try{
      const params=new URLSearchParams({q:submitted,cursor});if(focus)params.set("direction",focus);
      const r=await fetch(`/api/catalog?${params}`);const data:CatalogPage=await r.json();
      setProducts(prev=>{const incoming=(data.products||[]).map((p,i)=>placeProduct(p,prev.length+i));return dedupe([...prev,...incoming])});
      setPagination(data.pagination||{});
    }finally{setLoadingMore(false)}
  },[pagination,loadingMore,submitted,focus]);

  useEffect(()=>{fetchProducts(focus)},[submitted]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible=useMemo(()=>products.filter(p=>!hidden.has(p.id)&&(sourceFilter==="Top picks"||sourceKind(p)===sourceFilter)),[products,hidden,sourceFilter]);
  const labels=useMemo(()=>{const fromProducts=visible.flatMap(p=>p.tags||[]).filter(Boolean);return[...new Set([focus,...scene.labels,...fromProducts])].filter(Boolean).slice(0,12)},[visible,focus,scene.labels]);
  const semanticLevel=zoom<.64?"worlds":zoom<.98?"themes":zoom<1.38?"products":"details";
  const filteredMapProducts=useMemo(()=>{const q=mapSearch.trim().toLowerCase();return q?visible.filter(p=>`${p.title} ${p.brand}`.toLowerCase().includes(q)):visible},[visible,mapSearch]);
  const zoneCount=Math.max(1,Math.ceil(products.length/24));

  function resetWorld(){setPan({x:-WORLD_CX*.92,y:-WORLD_CY*.92});setZoom(.92)}
  function submit(){const q=query.trim()||"Show me something worth discovering";setSubmitted(q);setFocus("");setSelected(null);setHidden(new Set());resetWorld()}
  function explore(label:string){setFocus(label);setSelected(null);fetchProducts(label);setZoom(Math.max(zoom,1.02))}
  function selectProduct(p:Product){setSelected(p);setRadial(null);setZoom(z=>Math.max(z,1.12))}
  function nextProduct(direction=1){if(!selected||visible.length<2)return;const i=visible.findIndex(p=>p.id===selected.id);setSelected(visible[(i+direction+visible.length)%visible.length])}
  function popNext(){if(!selected||visible.length<2)return;const i=visible.findIndex(p=>p.id===selected.id);const next=visible[(i+1)%visible.length];setHidden(h=>new Set([...h,selected.id]));setSelected(next)}
  function beginHold(e:React.PointerEvent,p:Product){if(holdRef.current)clearTimeout(holdRef.current);holdRef.current=setTimeout(()=>setRadial({product:p,x:e.clientX,y:e.clientY}),520)}
  function endHold(){if(holdRef.current){clearTimeout(holdRef.current);holdRef.current=null}}
  function refineAround(label:string){setRadial(null);explore(label)}
  function jumpToProduct(p:Product){const z=Math.max(zoom,1.05);setZoom(z);setPan({x:-(p.x||WORLD_CX)*z,y:-(p.y||WORLD_CY)*z});setSelected(p);setMapOpen(false)}
  function jumpToZone(zone:number){const c=zoneCenter(zone);setPan({x:-c.x*zoom,y:-c.y*zoom});setMapOpen(false)}

  function worldPointerDown(e:React.PointerEvent<HTMLElement>){
    pointersRef.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointersRef.current.size===2){const pts=[...pointersRef.current.values()];pinchRef.current={distance:distance(pts[0],pts[1]),zoom};panRef.current.drag=false;return}
    if((e.target as HTMLElement).closest("button,input,a,.lv4-product,.lv4-textbubble,.lv4-detail,.lv4-map-overlay"))return;
    const edge=e.clientX<28?"left":e.clientX>window.innerWidth-28?"right":"";panRef.current={drag:true,px:e.clientX-pan.x,py:e.clientY-pan.y,startX:e.clientX,startY:e.clientY,edge};(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function worldPointerMove(e:React.PointerEvent<HTMLElement>){
    if(pointersRef.current.has(e.pointerId))pointersRef.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointersRef.current.size===2&&pinchRef.current){const pts=[...pointersRef.current.values()];const d=distance(pts[0],pts[1]);setZoom(Math.min(1.85,Math.max(.42,pinchRef.current.zoom*(d/pinchRef.current.distance))));return}
    if(panRef.current.drag)setPan({x:e.clientX-panRef.current.px,y:e.clientY-panRef.current.py})
  }
  function worldPointerUp(e:React.PointerEvent<HTMLElement>){
    pointersRef.current.delete(e.pointerId);if(pointersRef.current.size<2)pinchRef.current=null;
    const swipeX=e.clientX-panRef.current.startX;if(panRef.current.edge==="left"&&swipeX>52)setMobileNav(true);if(panRef.current.edge==="right"&&swipeX<-52)setMobileSources(true);panRef.current.drag=false;
    if(hasNext(pagination)&&Date.now()-lastAutoLoadRef.current>1400){lastAutoLoadRef.current=Date.now();void loadMore()}
  }
  function detailPointerDown(e:React.PointerEvent){detailSwipeRef.current={x:e.clientX,y:e.clientY};setDetailDrag(0)}
  function detailPointerMove(e:React.PointerEvent){if(detailSwipeRef.current)setDetailDrag(e.clientX-detailSwipeRef.current.x)}
  function detailPointerUp(e:React.PointerEvent){if(!detailSwipeRef.current)return;const dx=e.clientX-detailSwipeRef.current.x,dy=e.clientY-detailSwipeRef.current.y;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy))nextProduct(dx<0?1:-1);else if(dy>85)setSelected(null);setDetailDrag(0);detailSwipeRef.current=null}

  return <main className="lv4-shell" style={{"--a":scene.a,"--b":scene.b,"--c":scene.c,"--scene":`url(${scene.image})`} as React.CSSProperties}>
    <div className="lv4-scene"/>
    <button className="lv4-mobile-top-hotspot" aria-label="Search" onClick={()=>document.querySelector<HTMLInputElement>(".lv4-search input")?.focus()}/>
    <button className="lv4-mobile-left-hotspot" aria-label="Open navigation" onClick={()=>setMobileNav(true)}/>
    <button className="lv4-mobile-right-hotspot" aria-label="Open product sources" onClick={()=>setMobileSources(true)}/>

    <aside className={`lv4-rail ${mobileNav?"mobile-open":""}`} aria-label="Lumina navigation">
      <button className="lv4-logo" onClick={()=>setMobileNav(false)}>L@</button><button onClick={()=>setMobileNav(false)}><Home/><span>Discover</span></button><button onClick={()=>{setZoom(.56);setMobileNav(false)}}><Compass/><span>Worlds</span></button><button onClick={()=>setMobileNav(false)}><ScanFace/><span>Try on</span></button><button onClick={()=>setMobileNav(false)}><Bookmark/><span>Saved</span></button><button onClick={()=>{resetWorld();setMobileNav(false)}}><RotateCcw/><span>Reset</span></button>
    </aside>

    <header className="lv4-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} aria-label="Describe what you want"/><button onClick={submit}>↵</button></header>
    <section className={`lv4-source-tabs ${mobileSources?"mobile-open":""}`} aria-label="Product source filter">{["Top picks","Retail","Marketplace","Independent"].map(x=><button key={x} className={sourceFilter===x?"active":""} onClick={()=>{setSourceFilter(x);setMobileSources(false)}}>{x}</button>)}</section>

    <section ref={worldRef} className={`lv4-world level-${semanticLevel}`} onPointerDown={worldPointerDown} onPointerMove={worldPointerMove} onPointerUp={worldPointerUp} onPointerCancel={worldPointerUp} onDoubleClick={resetWorld} onWheel={e=>{e.preventDefault();setZoom(z=>Math.min(1.85,Math.max(.42,z*(e.deltaY<0?1.075:.93))))}}>
      <div className="lv4-stage lv4-stage-map" style={{width:WORLD_W,height:WORLD_H,transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}>
        <button className="lv4-intent" style={{left:WORLD_CX,top:WORLD_CY}} onClick={()=>document.querySelector<HTMLInputElement>(".lv4-search input")?.focus()}><span>{focus||submitted}</span><small>{loading?"Finding products…":`${products.length} loaded · ${zoneCount} zones${loadingMore?" · expanding…":""}`}</small></button>

        {semanticLevel==="worlds"&&NICHES.map((n,i)=>{const a=i/NICHES.length*Math.PI*2-.6;const x=WORLD_CX+Math.cos(a)*440,y=WORLD_CY+Math.sin(a)*310;return <button key={n} className="lv4-worldbubble" style={{left:x,top:y}} onClick={()=>{setQuery(SCENES[n].query);setSubmitted(SCENES[n].query);setFocus("")}}>{n}</button>})}
        {labels.map((label,i)=>{const a=i/Math.max(labels.length,1)*Math.PI*2-.4;const r=250+(i%3)*112;const x=WORLD_CX+Math.cos(a)*r,y=WORLD_CY+Math.sin(a)*(r*.72);return <button key={`${label}-${i}`} className={`lv4-textbubble ${focus===label?"active":""}`} style={{left:x,top:y}} onClick={()=>explore(label)}>{label}</button>})}

        {Array.from({length:zoneCount}).map((_,zone)=>{const c=zoneCenter(zone);return <button key={`zone-${zone}`} className="lv4-zone-title" style={{left:c.x,top:c.y-520}} onClick={()=>jumpToZone(zone)}>ZONE {String(zone+1).padStart(2,"0")}</button>})}

        {visible.map(p=>{const x=p.x||WORLD_CX,y=p.y||WORLD_CY;const size=82+(hash(p.id)%74);const showMeta=semanticLevel==="details"||selected?.id===p.id;return <button key={p.id} className={`lv4-product ${selected?.id===p.id?"selected":""}`} style={{left:x,top:y,"--s":`${size}px`,"--vita-delay":`${-(hash(p.id)%5000)}ms`} as React.CSSProperties} onPointerDown={e=>beginHold(e,p)} onPointerUp={endHold} onPointerLeave={endHold} onClick={()=>selectProduct(p)}><span className="lv4-vita-gloss"/><img src={p.image} alt=""/>{semanticLevel!=="themes"&&<span className="lv4-price">{money(p)}</span>}{showMeta&&<span className="lv4-orbmeta"><b>{p.title}</b><em>{p.brand}</em></span>}</button>})}
      </div>
    </section>

    <button className="lv4-map-button" onClick={()=>setMapOpen(true)} aria-label="Open world map"><MapIcon/><span>Map</span></button>
    {mapOpen&&<div className="lv4-map-overlay" onClick={()=>setMapOpen(false)}>
      <div className="lv4-map-panel" onClick={e=>e.stopPropagation()}>
        <header><div><small>WORLD MAP</small><h2>{focus||submitted}</h2></div><button onClick={()=>setMapOpen(false)}><X/></button></header>
        <div className="lv4-map-tools"><Search/><input value={mapSearch} onChange={e=>setMapSearch(e.target.value)} placeholder="Find any product title or brand"/><span>{filteredMapProducts.length} items · {zoneCount} zones</span></div>
        <div className="lv4-map-canvas">
          {Array.from({length:zoneCount}).map((_,zone)=>{const c=zoneCenter(zone);return <button key={zone} className="lv4-map-zone" style={{left:`${c.x/WORLD_W*100}%`,top:`${c.y/WORLD_H*100}%`}} onClick={()=>jumpToZone(zone)}>Z{zone+1}</button>})}
          {filteredMapProducts.map(p=><button key={p.id} className="lv4-map-product" title={`${p.title} — ${p.brand}`} style={{left:`${(p.x||WORLD_CX)/WORLD_W*100}%`,top:`${(p.y||WORLD_CY)/WORLD_H*100}%`}} onClick={()=>jumpToProduct(p)}><span>{p.title}</span></button>)}
        </div>
        {hasNext(pagination)&&<button className="lv4-map-expand" disabled={loadingMore} onClick={()=>void loadMore()}>{loadingMore?"Expanding world…":"Explore another zone"}</button>}
      </div>
    </div>}

    <div className="lv4-zoomhint">{semanticLevel}<span>{Math.round(zoom*100)}%</span></div>
    {selected&&<aside className="lv4-detail" style={{"--detail-drag":`${detailDrag}px`} as React.CSSProperties} onPointerDown={detailPointerDown} onPointerMove={detailPointerMove} onPointerUp={detailPointerUp} onPointerCancel={detailPointerUp}><div className="lv4-mobile-grabber"/><button className="lv4-close" onClick={()=>setSelected(null)}><X/></button><img src={selected.image} alt={selected.title}/><div className="lv4-detailcopy"><small>{sourceKind(selected)} · {selected.brand}</small><h2>{selected.title}</h2><strong>{money(selected)}</strong><p>Matched to “{focus||submitted}”.</p><div className="lv4-tagrow">{(selected.tags||[]).slice(0,4).map(t=><button key={t} onClick={()=>explore(t)}>{t}</button>)}</div><div className="lv4-actions"><button className={liked.has(selected.id)?"active":""} onClick={()=>setLiked(s=>{const n=new Set(s);n.has(selected.id)?n.delete(selected.id):n.add(selected.id);return n})}><Heart/></button><a href={selected.url||"#"} target="_blank" rel="noreferrer">View at store <ExternalLink/></a>{cat==="fashion"&&<button className="try"><Sparkles/> Try on</button>}</div><button className="lv4-pop" onClick={popNext}>Pop this · next match <ChevronRight/></button></div></aside>}
    {radial&&<div className="lv4-radial" style={{left:radial.x,top:radial.y}}><button onClick={()=>refineAround("More like this")}>More like this</button><button onClick={()=>refineAround("Cheaper")}>Cheaper</button><button onClick={()=>refineAround("More minimal")}>More minimal</button><button onClick={()=>refineAround(sourceKind(radial.product))}>{sourceKind(radial.product)}</button><button className="center" onClick={()=>setRadial(null)}><X/></button></div>}
    <button className="lv4-refine" onClick={()=>setZoom(z=>z<1.05?1.12:.82)}><SlidersHorizontal/><span>{semanticLevel}</span></button>
  </main>
}
