"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Heart, ExternalLink, Sparkles, ChevronRight, SlidersHorizontal, RotateCcw, Compass, Home, Bookmark, ScanFace, Map as MapIcon } from "lucide-react";

type Product = {
  id:string; title:string; brand:string; price:number|null; currency?:string; image:string; url?:string;
  tags?:string[]; source?:string; asin?:string; x?:number; y?:number; zone?:number; family?:string; fresh?:boolean;
};

type Scene = { a:string; b:string; c:string; image:string; query:string; labels:string[] };
type CatalogPage = { products?:Product[]; source?:string; sources?:string[]; pagination?:Record<string,unknown> };

const WORLD_W=12000;
const WORLD_H=7200;
const WORLD_CX=WORLD_W/2;
const WORLD_CY=WORLD_H/2;
const ZONE_STEP=1320;
const PRODUCTS_PER_ZONE=18;
const CHIP_COLORS=["#f3c8a8","#b9ddd0","#cad7f2","#e9c3d4","#e5d38f","#c8dfaa","#d5c5ef","#f0b9ad"];
const DISCOVERY_WAVES=["new arrivals","popular right now","best value","premium finds","unexpected picks","accessories","editor picks","trending alternatives"];
const ZONE_OFFSETS=[
  [0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1],
  [2,0],[-2,0],[0,2],[0,-2],[2,1],[-2,1],[2,-1],[-2,-1],[1,2],[-1,2],[1,-2],[-1,-2],
  [3,0],[-3,0],[0,3],[0,-3]
] as const;

const SCENES:Record<string,Scene> = {
  fashion:{a:"#d8c8bb",b:"#8e786a",c:"#332720",image:"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2200&q=88",query:"Summer dresses for a Mediterranean wedding under €180",labels:["Linen","Minimal","Romantic","Under €150","Independent","Vacation"]},
  fitness:{a:"#bdc7bc",b:"#6f7e73",c:"#253029",image:"https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2200&q=88",query:"Best gym shorts for bodybuilding under €80",labels:["Strength","Breathable","Under €80","Lightweight","Performance","Retail"]},
  hair:{a:"#d5c3ad",b:"#917762",c:"#30251d",image:"https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=2200&q=88",query:"A non-greasy routine for fuller-looking hair",labels:["Scalp care","Lightweight","Volume","Repair","Under €50","Gentle"]},
  skin:{a:"#d6c1bc",b:"#92736f",c:"#332420",image:"https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=2200&q=88",query:"Skincare for acne marks and uneven tone, sensitive skin",labels:["Sensitive","Niacinamide","Barrier","Under €50","Brightening","Gentle"]},
  smile:{a:"#c6d8d8",b:"#71898c",c:"#263335",image:"https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=2200&q=88",query:"A gentle at-home routine for a brighter smile",labels:["Sensitive teeth","Whitening","Under €50","Everyday","Gentle","Top rated"]},
  home:{a:"#ccbca8",b:"#817064",c:"#2d251f",image:"https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2200&q=88",query:"A warm minimal sofa for a small living room",labels:["Warm minimal","Small spaces","Modular","Natural","Under €1200","Independent"]},
  retail:{a:"#c5c2b7",b:"#75766e",c:"#252722",image:"https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=2200&q=88",query:"Show me something worth discovering",labels:["Top picks","Retail","Independent","Marketplace","Deals","New"]}
};
const NICHES=["fashion","fitness","hair","skin","smile"];

function category(q:string){const s=q.toLowerCase();if(/gym|fitness|running|training|shorts|recovery/.test(s))return"fitness";if(/hair|scalp|shampoo|density/.test(s))return"hair";if(/skin|serum|acne|blemish|moistur|tone/.test(s))return"skin";if(/smile|teeth|tooth|oral|whitening/.test(s))return"smile";if(/sofa|chair|home|furniture|lamp|table/.test(s))return"home";if(/dress|fashion|shirt|jean|jacket|coat|bag|jewelry/.test(s))return"fashion";return"retail"}
function money(p:Product){if(p.price==null)return"";try{return new Intl.NumberFormat(undefined,{style:"currency",currency:p.currency||"EUR",maximumFractionDigits:0}).format(p.price)}catch{return String(p.price)}}
function hash(s:string){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return Math.abs(h)}
function sourceKind(p:Product){const s=(p.source||"").toLowerCase();if(s.includes("amazon")||s.includes("shopify"))return"Retail";if(s.includes("ebay")||s.includes("aliexpress"))return"Marketplace";if(s.includes("etsy"))return"Independent";return"Retail"}
function distance(a:{x:number;y:number},b:{x:number;y:number}){return Math.hypot(a.x-b.x,a.y-b.y)}
function nextCursor(p?:Record<string,unknown>){if(!p)return"";return String(p.next_cursor||p.nextCursor||p.cursor||"")}
function hasNext(p?:Record<string,unknown>){if(!p)return false;return Boolean(p.has_next_page??p.hasNextPage??nextCursor(p))}
function dedupe(list:Product[]){const seen=new Set<string>();return list.filter(p=>{const k=p.id||`${p.title}|${p.brand}`;if(seen.has(k))return false;seen.add(k);return true})}
function productFamily(p:Product){const s=`${p.title} ${(p.tags||[]).join(" ")}`.toLowerCase();if(/dress|skirt|gown/.test(s))return"Dresses";if(/shoe|sneaker|trainer|boot/.test(s))return"Shoes";if(/bag|purse|wallet|jewel|ring|necklace|bracelet|watch|sunglass/.test(s))return"Accessories";if(/serum|skin|cream|hair|shampoo|beauty|makeup/.test(s))return"Beauty";if(/phone|speaker|keyboard|charger|tech|headphone|earbud/.test(s))return"Tech";if(/home|lamp|chair|sofa|table|decor|kitchen/.test(s))return"Home";if(/fitness|gym|training|recovery|running/.test(s))return"Fitness";return"Discover"}
function zoneCenter(zone:number){const off=ZONE_OFFSETS[zone%ZONE_OFFSETS.length]||[0,0];return{x:WORLD_CX+off[0]*ZONE_STEP,y:WORLD_CY+off[1]*ZONE_STEP}}
function familyShift(family:string){const h=hash(family);const a=(h%628)/100;return{x:Math.cos(a)*150,y:Math.sin(a)*100}}
function placeProduct(p:Product,index:number,fresh=false){const zone=Math.floor(index/PRODUCTS_PER_ZONE);const local=index%PRODUCTS_PER_ZONE;const h=hash(p.id||`${p.title}-${index}`);const family=productFamily(p);const center=zoneCenter(zone);const shift=familyShift(family);const ring=145+(local%3)*92+(h%34);const angle=(local/PRODUCTS_PER_ZONE)*Math.PI*2+(h%60)/100;return{...p,family,zone,fresh,x:center.x+shift.x+Math.cos(angle)*ring,y:center.y+shift.y+Math.sin(angle)*(ring*.68)}}

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
  const panRef=useRef({drag:false,px:0,py:0,startX:0,startY:0,lastX:0,lastY:0,lastT:0,vx:0,vy:0,edge:"" as ""|"left"|"right"});
  const holdRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const pointersRef=useRef(new Map<number,{x:number;y:number}>());
  const pinchRef=useRef<{distance:number;zoom:number}|null>(null);
  const detailSwipeRef=useRef<{x:number;y:number}|null>(null);
  const lastAutoLoadRef=useRef(0);
  const discoveryWaveRef=useRef(0);
  const moveRafRef=useRef<number|null>(null);
  const pendingPanRef=useRef<{x:number;y:number}|null>(null);
  const inertiaRef=useRef<number|null>(null);
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
    const cursor=nextCursor(pagination);if(!cursor||loadingMore)return false;
    setLoadingMore(true);
    try{
      const params=new URLSearchParams({q:submitted,cursor});if(focus)params.set("direction",focus);
      const r=await fetch(`/api/catalog?${params}`);const data:CatalogPage=await r.json();
      setProducts(prev=>{const incoming=(data.products||[]).map((p,i)=>placeProduct(p,prev.length+i,true));return dedupe([...prev,...incoming])});
      setPagination(data.pagination||{});return true;
    }catch{return false}finally{setLoadingMore(false)}
  },[pagination,loadingMore,submitted,focus]);

  const loadDiscoveryWave=useCallback(async()=>{
    if(loadingMore)return;
    setLoadingMore(true);
    const cue=DISCOVERY_WAVES[discoveryWaveRef.current++%DISCOVERY_WAVES.length];
    try{
      const params=new URLSearchParams({q:submitted,direction:focus?`${focus}, ${cue}`:cue});
      const r=await fetch(`/api/catalog?${params}`);const data:CatalogPage=await r.json();
      setProducts(prev=>{const incoming=(data.products||[]).map((p,i)=>placeProduct(p,prev.length+i,true));return dedupe([...prev,...incoming])});
    }finally{setLoadingMore(false)}
  },[loadingMore,submitted,focus]);

  useEffect(()=>{fetchProducts(focus)},[submitted]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>()=>{if(moveRafRef.current)cancelAnimationFrame(moveRafRef.current);if(inertiaRef.current)cancelAnimationFrame(inertiaRef.current)},[]);

  const visible=useMemo(()=>products.filter(p=>!hidden.has(p.id)&&(sourceFilter==="Top picks"||sourceKind(p)===sourceFilter)),[products,hidden,sourceFilter]);
  const labels=useMemo(()=>{const fromProducts=visible.flatMap(p=>p.tags||[]).filter(Boolean);const families=visible.map(productFamily);return[...new Set([focus,...scene.labels,...families,...fromProducts])].filter(Boolean).slice(0,12)},[visible,focus,scene.labels]);
  const semanticLevel=zoom<.64?"worlds":zoom<.98?"themes":zoom<1.38?"products":"details";
  const filteredMapProducts=useMemo(()=>{const q=mapSearch.trim().toLowerCase();return q?visible.filter(p=>`${p.title} ${p.brand}`.toLowerCase().includes(q)):visible},[visible,mapSearch]);
  const zoneCount=Math.max(1,Math.ceil(products.length/PRODUCTS_PER_ZONE));

  function resetWorld(){if(inertiaRef.current)cancelAnimationFrame(inertiaRef.current);setPan({x:-WORLD_CX*.92,y:-WORLD_CY*.92});setZoom(.92)}
  function submit(){const q=query.trim()||"Show me something worth discovering";setSubmitted(q);setFocus("");setSelected(null);setHidden(new Set());discoveryWaveRef.current=0;resetWorld()}
  function explore(label:string){setFocus(label);setSelected(null);fetchProducts(label);setZoom(Math.max(zoom,1.02))}
  function selectProduct(p:Product){setSelected(p);setRadial(null)}
  function nextProduct(direction=1){if(!selected||visible.length<2)return;const i=visible.findIndex(p=>p.id===selected.id);setSelected(visible[(i+direction+visible.length)%visible.length])}
  function popNext(){if(!selected||visible.length<2)return;const i=visible.findIndex(p=>p.id===selected.id);const next=visible[(i+1)%visible.length];setHidden(h=>new Set([...h,selected.id]));setSelected(next)}
  function beginHold(e:React.PointerEvent,p:Product){if(holdRef.current)clearTimeout(holdRef.current);holdRef.current=setTimeout(()=>setRadial({product:p,x:e.clientX,y:e.clientY}),520)}
  function endHold(){if(holdRef.current){clearTimeout(holdRef.current);holdRef.current=null}}
  function refineAround(label:string){setRadial(null);explore(label)}
  function jumpToProduct(p:Product){const z=Math.max(zoom,1.05);setZoom(z);setPan({x:-(p.x||WORLD_CX)*z,y:-(p.y||WORLD_CY)*z});setSelected(p);setMapOpen(false)}
  function jumpToZone(zone:number){const c=zoneCenter(zone);setPan({x:-c.x*zoom,y:-c.y*zoom});setMapOpen(false)}
  function schedulePan(next:{x:number;y:number}){pendingPanRef.current=next;if(moveRafRef.current)return;moveRafRef.current=requestAnimationFrame(()=>{moveRafRef.current=null;if(pendingPanRef.current)setPan(pendingPanRef.current)})}
  function startInertia(){if(inertiaRef.current)cancelAnimationFrame(inertiaRef.current);let vx=panRef.current.vx*14,vy=panRef.current.vy*14;if(Math.hypot(vx,vy)<1.2)return;let last=performance.now();const tick=(now:number)=>{const dt=Math.min(32,now-last);last=now;const decay=Math.pow(.91,dt/16);vx*=decay;vy*=decay;setPan(p=>({x:p.x+vx*dt/16,y:p.y+vy*dt/16}));if(Math.hypot(vx,vy)>.22)inertiaRef.current=requestAnimationFrame(tick)};inertiaRef.current=requestAnimationFrame(tick)}
  function maybeExpandWorld(dragDistance=0){if(dragDistance<90||Date.now()-lastAutoLoadRef.current<900)return;lastAutoLoadRef.current=Date.now();if(hasNext(pagination))void loadMore();else void loadDiscoveryWave()}

  function worldPointerDown(e:React.PointerEvent<HTMLElement>){
    pointersRef.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(inertiaRef.current){cancelAnimationFrame(inertiaRef.current);inertiaRef.current=null}
    if(pointersRef.current.size===2){const pts=[...pointersRef.current.values()];pinchRef.current={distance:distance(pts[0],pts[1]),zoom};panRef.current.drag=false;return}
    if((e.target as HTMLElement).closest("button,input,a,.lv4-product,.lv4-textbubble,.lv4-detail,.lv4-map-overlay"))return;
    const edge=e.clientX<28?"left":e.clientX>window.innerWidth-28?"right":"";panRef.current={drag:true,px:e.clientX-pan.x,py:e.clientY-pan.y,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,lastT:performance.now(),vx:0,vy:0,edge};(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function worldPointerMove(e:React.PointerEvent<HTMLElement>){
    if(pointersRef.current.has(e.pointerId))pointersRef.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointersRef.current.size===2&&pinchRef.current){const pts=[...pointersRef.current.values()];const d=distance(pts[0],pts[1]);setZoom(Math.min(1.85,Math.max(.42,pinchRef.current.zoom*(d/pinchRef.current.distance))));return}
    if(panRef.current.drag){const now=performance.now(),dt=Math.max(8,now-panRef.current.lastT);panRef.current.vx=(e.clientX-panRef.current.lastX)/dt;panRef.current.vy=(e.clientY-panRef.current.lastY)/dt;panRef.current.lastX=e.clientX;panRef.current.lastY=e.clientY;panRef.current.lastT=now;schedulePan({x:e.clientX-panRef.current.px,y:e.clientY-panRef.current.py});const drag=Math.hypot(e.clientX-panRef.current.startX,e.clientY-panRef.current.startY);if(drag>280)maybeExpandWorld(drag)}
  }
  function worldPointerUp(e:React.PointerEvent<HTMLElement>){
    pointersRef.current.delete(e.pointerId);if(pointersRef.current.size<2)pinchRef.current=null;
    const swipeX=e.clientX-panRef.current.startX,swipeY=e.clientY-panRef.current.startY,drag=Math.hypot(swipeX,swipeY);if(panRef.current.edge==="left"&&swipeX>52)setMobileNav(true);if(panRef.current.edge==="right"&&swipeX<-52)setMobileSources(true);const wasDragging=panRef.current.drag;panRef.current.drag=false;if(wasDragging){startInertia();maybeExpandWorld(drag)}
  }
  function detailPointerDown(e:React.PointerEvent){detailSwipeRef.current={x:e.clientX,y:e.clientY};setDetailDrag(0)}
  function detailPointerMove(e:React.PointerEvent){if(detailSwipeRef.current)setDetailDrag(e.clientX-detailSwipeRef.current.x)}
  function detailPointerUp(e:React.PointerEvent){if(!detailSwipeRef.current)return;const dx=e.clientX-detailSwipeRef.current.x,dy=e.clientY-detailSwipeRef.current.y;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy))nextProduct(dx<0?1:-1);else if(dy>100)setSelected(null);setDetailDrag(0);detailSwipeRef.current=null}

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
        <button className="lv4-intent" style={{left:WORLD_CX,top:WORLD_CY}} onClick={()=>document.querySelector<HTMLInputElement>(".lv4-search input")?.focus()}><span>{focus||submitted}</span><small>{loading?"Finding products…":`${products.length} products${loadingMore?" · discovering more":""}`}</small></button>

        {semanticLevel==="worlds"&&NICHES.map((n,i)=>{const a=i/NICHES.length*Math.PI*2-.6;const x=WORLD_CX+Math.cos(a)*440,y=WORLD_CY+Math.sin(a)*310;return <button key={n} className="lv4-worldbubble" style={{left:x,top:y}} onClick={()=>{setQuery(SCENES[n].query);setSubmitted(SCENES[n].query);setFocus("")}}>{n}</button>})}
        {labels.map((label,i)=>{const a=i/Math.max(labels.length,1)*Math.PI*2-.4;const r=225+(i%3)*100;const x=WORLD_CX+Math.cos(a)*r,y=WORLD_CY+Math.sin(a)*(r*.7);return <button key={`${label}-${i}`} className={`lv4-textbubble ${focus===label?"active":""}`} style={{left:x,top:y,"--chip":CHIP_COLORS[hash(label)%CHIP_COLORS.length]} as React.CSSProperties} onClick={()=>explore(label)}>{label}</button>})}

        {Array.from({length:zoneCount}).map((_,zone)=>{const c=zoneCenter(zone);const family=products.find(p=>p.zone===zone)?.family||"Discover";return <button key={`zone-${zone}`} className="lv4-zone-title" style={{left:c.x,top:c.y-430}} onClick={()=>jumpToZone(zone)}>{family} · {String(zone+1).padStart(2,"0")}</button>})}

        {visible.map(p=>{const x=p.x||WORLD_CX,y=p.y||WORLD_CY;const size=92+(hash(p.id)%54);const showMeta=semanticLevel==="details"||selected?.id===p.id;return <button key={p.id} className={`lv4-product ${p.fresh?"lv4-new-product":""} ${selected?.id===p.id?"selected":""}`} style={{left:x,top:y,"--s":`${size}px`,"--vita-delay":`${-(hash(p.id)%5000)}ms`} as React.CSSProperties} onPointerDown={e=>beginHold(e,p)} onPointerUp={endHold} onPointerLeave={endHold} onClick={()=>selectProduct(p)}><span className="lv4-vita-gloss"/><img src={p.image} alt=""/>{p.price!=null&&<span className="lv4-price">{money(p)}</span>}{showMeta&&<span className="lv4-orbmeta"><b>{p.title}</b><em>{p.brand}</em></span>}</button>})}
      </div>
    </section>

    <button className="lv4-map-button" onClick={()=>setMapOpen(true)} aria-label="Open world map"><MapIcon/><span>Map</span></button>
    {mapOpen&&<div className="lv4-map-overlay" onClick={()=>setMapOpen(false)}>
      <div className="lv4-map-panel" onClick={e=>e.stopPropagation()}>
        <header><div><small>WORLD MAP</small><h2>{focus||submitted}</h2></div><button onClick={()=>setMapOpen(false)}><X/></button></header>
        <div className="lv4-map-tools"><Search/><input value={mapSearch} onChange={e=>setMapSearch(e.target.value)} placeholder="Find a product or brand"/><span>{filteredMapProducts.length} items · {zoneCount} collections</span></div>
        <div className="lv4-map-canvas">
          {Array.from({length:zoneCount}).map((_,zone)=>{const c=zoneCenter(zone);return <button key={zone} className="lv4-map-zone" style={{left:`${c.x/WORLD_W*100}%`,top:`${c.y/WORLD_H*100}%`}} onClick={()=>jumpToZone(zone)}>Z{zone+1}</button>})}
          {filteredMapProducts.map(p=><button key={p.id} className="lv4-map-product" title={`${p.title} — ${p.brand}`} style={{left:`${(p.x||WORLD_CX)/WORLD_W*100}%`,top:`${(p.y||WORLD_CY)/WORLD_H*100}%`}} onClick={()=>jumpToProduct(p)}><span>{p.title}</span></button>)}
        </div>
        <button className="lv4-map-expand" disabled={loadingMore} onClick={()=>hasNext(pagination)?void loadMore():void loadDiscoveryWave()}>{loadingMore?"Discovering…":"Explore more"}</button>
      </div>
    </div>}

    <div className="lv4-zoomhint">{semanticLevel}<span>{Math.round(zoom*100)}%</span></div>
    {selected&&<div className="lv4-detail-backdrop" onClick={()=>setSelected(null)}/>}
    {selected&&<aside className="lv4-detail" style={{"--detail-drag":`${detailDrag}px`} as React.CSSProperties} onPointerDown={detailPointerDown} onPointerMove={detailPointerMove} onPointerUp={detailPointerUp} onPointerCancel={detailPointerUp}><button className="lv4-close" onClick={()=>setSelected(null)}><X/></button><img src={selected.image} alt={selected.title}/><div className="lv4-detailcopy"><small>{sourceKind(selected)} · {selected.brand}</small><h2>{selected.title}</h2><strong>{money(selected)}</strong><p>Selected from {selected.family||productFamily(selected)} for “{focus||submitted}”.</p><div className="lv4-tagrow">{(selected.tags||[]).slice(0,4).map(t=><button key={t} onClick={()=>explore(t)}>{t}</button>)}</div><div className="lv4-actions"><button className={liked.has(selected.id)?"active":""} onClick={()=>setLiked(s=>{const n=new Set(s);n.has(selected.id)?n.delete(selected.id):n.add(selected.id);return n})}><Heart/></button><a href={selected.url||"#"} target="_blank" rel="noreferrer">View product <ExternalLink/></a>{cat==="fashion"&&<button className="try"><Sparkles/> Try on</button>}</div><button className="lv4-pop" onClick={popNext}>Next product <ChevronRight/></button></div></aside>}
    {radial&&<div className="lv4-radial" style={{left:radial.x,top:radial.y}}><button onClick={()=>refineAround("More like this")}>Similar</button><button onClick={()=>refineAround("Cheaper")}>Cheaper</button><button onClick={()=>refineAround("More minimal")}>Minimal</button><button onClick={()=>refineAround(sourceKind(radial.product))}>{sourceKind(radial.product)}</button><button className="center" onClick={()=>setRadial(null)}><X/></button></div>}
    <button className="lv4-refine" onClick={()=>setZoom(z=>z<1.05?1.12:.82)}><SlidersHorizontal/><span>{semanticLevel}</span></button>
  </main>
}
