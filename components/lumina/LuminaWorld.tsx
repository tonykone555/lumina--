"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Heart, ExternalLink, Sparkles, RotateCcw, Compass, Home, Bookmark, ScanFace } from "lucide-react";

type Product={id:string;title:string;brand:string;price:number|null;currency?:string;image:string;url?:string;tags?:string[];source?:string;x?:number;y?:number;family?:string;fresh?:boolean};
type CatalogPage={products?:Product[];source?:string;sources?:string[];pagination?:Record<string,unknown>};
type Scene={a:string;b:string;c:string;image:string;query:string;labels:string[]};
type Category={key:string;label:string;query:string;subtitle:string};

const WORLD_W=12000,WORLD_H=7200,WORLD_CX=WORLD_W/2,WORLD_CY=WORLD_H/2;
const START_ZOOM=.48;
const DISCOVERY_WAVES=["popular right now","new arrivals","best value","premium finds","unexpected picks","top rated","new brands","editor picks"];
const FAMILY_ORDER=["Fashion","Shoes","Accessories","Beauty","Tech","Home","Fitness","Discover"];
const CATEGORIES:Category[]=[
 {key:"fashion",label:"Fashion",query:"Beautiful fashion, dresses, shoes and accessories",subtitle:"Clothing · shoes · accessories"},
 {key:"fitness",label:"Fitness",query:"Fitness gear, activewear, recovery and training accessories",subtitle:"Training · recovery · activewear"},
 {key:"skin",label:"Beauty",query:"Beauty, skincare and self care products",subtitle:"Skin · self care · beauty"},
 {key:"hair",label:"Hair",query:"Hair care, styling tools and scalp products",subtitle:"Care · styling · tools"},
 {key:"home",label:"Home",query:"Premium looking home, furniture, lighting and decor",subtitle:"Furniture · lighting · decor"},
 {key:"tech",label:"Tech",query:"Useful tech, gadgets, audio and phone accessories",subtitle:"Gadgets · audio · mobile"},
 {key:"retail",label:"Discover",query:"Interesting products worth discovering",subtitle:"Trending · value · unexpected"}
];
const SCENES:Record<string,Scene>={
 fashion:{a:"#d9c7b8",b:"#8f7567",c:"#2c211b",image:"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2200&q=88",query:"Beautiful fashion, dresses, shoes and accessories",labels:["Dresses","Shoes","Accessories","Minimal","Under €100","New"]},
 fitness:{a:"#c5d0c3",b:"#748479",c:"#26312a",image:"https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2200&q=88",query:"Fitness gear, activewear, recovery and training accessories",labels:["Strength","Workout Gear","Activewear","Recovery","Under €80","Top Rated"]},
 skin:{a:"#e2cbc7",b:"#987874",c:"#372521",image:"https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=2200&q=88",query:"Beauty, skincare and self care products",labels:["Skincare","Tools","Sensitive","Under €50","Glow","Top Rated"]},
 hair:{a:"#dccab7",b:"#937967",c:"#32251f",image:"https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=2200&q=88",query:"Hair care, styling tools and scalp products",labels:["Styling","Scalp","Repair","Volume","Tools","Under €50"]},
 home:{a:"#d6c7b1",b:"#867568",c:"#2f2721",image:"https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2200&q=88",query:"Premium looking home, furniture, lighting and decor",labels:["Lighting","Furniture","Decor","Smart Home","Under €100","Storage"]},
 tech:{a:"#c4ccd5",b:"#697684",c:"#1f262c",image:"https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=2200&q=88",query:"Useful tech, gadgets, audio and phone accessories",labels:["Phone","Audio","Desk","Smart","Under €50","Top Rated"]},
 retail:{a:"#d0cdc4",b:"#777870",c:"#282923",image:"https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=2200&q=88",query:"Interesting products worth discovering",labels:["Trending","Best Value","New","Popular","Under €50","Unexpected"]}
};

function money(p:Product){if(p.price==null)return"";try{return new Intl.NumberFormat(undefined,{style:"currency",currency:p.currency||"EUR",maximumFractionDigits:0}).format(p.price)}catch{return String(p.price)}}
function hash(s:string){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return Math.abs(h)}
function dedupe(list:Product[]){const seen=new Set<string>();return list.filter(p=>{const k=p.id||`${p.title}|${p.brand}`;if(seen.has(k))return false;seen.add(k);return true})}
function sourceKind(p:Product){const s=(p.source||"").toLowerCase();if(s.includes("amazon")||s.includes("shopify"))return"Retail";if(s.includes("ebay")||s.includes("aliexpress"))return"Marketplace";return"Store"}
function productFamily(p:Product){const s=`${p.title} ${(p.tags||[]).join(" ")}`.toLowerCase();if(/dress|skirt|gown|shirt|top|jean|jacket/.test(s))return"Fashion";if(/shoe|sneaker|trainer|boot/.test(s))return"Shoes";if(/bag|wallet|jewel|ring|necklace|bracelet|watch|sunglass/.test(s))return"Accessories";if(/serum|skin|cream|hair|shampoo|beauty|makeup/.test(s))return"Beauty";if(/phone|speaker|keyboard|charger|tech|headphone|earbud/.test(s))return"Tech";if(/lamp|chair|sofa|table|decor|kitchen|home/.test(s))return"Home";if(/fitness|gym|training|recovery|running/.test(s))return"Fitness";return"Discover"}
function familyCenter(family:string){const i=Math.max(0,FAMILY_ORDER.indexOf(family)),a=i/FAMILY_ORDER.length*Math.PI*2-.6;return{x:WORLD_CX+Math.cos(a)*1180,y:WORLD_CY+Math.sin(a)*720}}
function layoutProducts(list:Product[],freshStart=Number.POSITIVE_INFINITY){const counts:Record<string,number>={};return list.map((p,index)=>{const family=productFamily(p),n=counts[family]||0;counts[family]=n+1;const center=familyCenter(family),ring=Math.floor(n/8),slot=n%8,radius=220+ring*205,angle=slot/8*Math.PI*2+(ring%2)*.34;return{...p,family,fresh:index>=freshStart,x:center.x+Math.cos(angle)*radius,y:center.y+Math.sin(angle)*(radius*.78)}})}

export default function LuminaWorld(){
 const [query,setQuery]=useState("");
 const [submitted,setSubmitted]=useState("");
 const [categoryKey,setCategoryKey]=useState("retail");
 const [focus,setFocus]=useState("");
 const [products,setProducts]=useState<Product[]>([]);
 const [selected,setSelected]=useState<Product|null>(null);
 const [liked,setLiked]=useState<Set<string>>(new Set());
 const [zoom,setZoom]=useState(START_ZOOM);
 const [pan,setPan]=useState({x:-WORLD_CX*START_ZOOM,y:-WORLD_CY*START_ZOOM});
 const [loading,setLoading]=useState(false),[loadingMore,setLoadingMore]=useState(false);
 const [mobileNav,setMobileNav]=useState(false);
 const worldRef=useRef<HTMLDivElement>(null);
 const pointersRef=useRef(new Map<number,{x:number;y:number}>());
 const pinchRef=useRef<{distance:number;zoom:number}|null>(null);
 const dragRef=useRef({drag:false,px:0,py:0,lastX:0,lastY:0,lastT:0,vx:0,vy:0,startX:0,startY:0});
 const inertiaRef=useRef<number|null>(null),waveRef=useRef(0),loadingRef=useRef(false);
 const scene=SCENES[categoryKey]||SCENES.retail;

 const fetchProducts=useCallback(async(base:string,direction="",append=false)=>{
  if(loadingRef.current)return;loadingRef.current=true;append?setLoadingMore(true):setLoading(true);
  try{const params=new URLSearchParams({q:base||scene.query});if(direction)params.set("direction",direction);const r=await fetch(`/api/catalog?${params}`);const data:CatalogPage=await r.json();const incoming=dedupe(data.products||[]);setProducts(prev=>{if(!append)return layoutProducts(incoming);const merged=dedupe([...prev,...incoming]);return layoutProducts(merged,prev.length)})}catch{}finally{loadingRef.current=false;setLoading(false);setLoadingMore(false)}
 },[scene.query]);

 const chooseCategory=(key:string)=>{const c=CATEGORIES.find(x=>x.key===key)||CATEGORIES[CATEGORIES.length-1];setCategoryKey(c.key);setSubmitted(c.query);setQuery("");setFocus("");setSelected(null);setProducts([]);setZoom(.82);setPan({x:-WORLD_CX*.82,y:-WORLD_CY*.82});waveRef.current=0;void fetchProducts(c.query)};
 const submit=()=>{const q=query.trim();if(!q)return;setSubmitted(q);setFocus("");setSelected(null);setZoom(.9);setPan({x:-WORLD_CX*.9,y:-WORLD_CY*.9});void fetchProducts(q)};
 const explore=(label:string)=>{setFocus(label);setSelected(null);setZoom(z=>Math.max(1.08,z));void fetchProducts(submitted||scene.query,label)};
 const resetWorld=()=>{setCategoryKey("retail");setSubmitted("");setQuery("");setFocus("");setProducts([]);setSelected(null);setZoom(START_ZOOM);setPan({x:-WORLD_CX*START_ZOOM,y:-WORLD_CY*START_ZOOM})};
 const loadWave=()=>{if(loadingRef.current||!submitted)return;const cue=DISCOVERY_WAVES[waveRef.current++%DISCOVERY_WAVES.length];void fetchProducts(submitted,focus?`${focus}, ${cue}`:cue,true)};

 useEffect(()=>()=>{if(inertiaRef.current)cancelAnimationFrame(inertiaRef.current)},[]);
 const labels=useMemo(()=>{const fromProducts=products.flatMap(p=>p.tags||[]).filter(Boolean);const families=products.map(productFamily);return[...new Set([focus,...scene.labels,...families,...fromProducts])].filter(Boolean).slice(0,12)},[products,focus,scene.labels]);
 const level=zoom<.66?"worlds":zoom<1?"themes":zoom<1.34?"products":"details";

 function startInertia(){let vx=dragRef.current.vx*15,vy=dragRef.current.vy*15;if(Math.hypot(vx,vy)<1)return;let last=performance.now();const tick=(now:number)=>{const dt=Math.min(32,now-last);last=now;const decay=Math.pow(.9,dt/16);vx*=decay;vy*=decay;setPan(p=>({x:p.x+vx*dt/16,y:p.y+vy*dt/16}));if(Math.hypot(vx,vy)>.16)inertiaRef.current=requestAnimationFrame(tick)};inertiaRef.current=requestAnimationFrame(tick)}
 function pointerDown(e:React.PointerEvent<HTMLElement>){pointersRef.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(inertiaRef.current)cancelAnimationFrame(inertiaRef.current);if(pointersRef.current.size===2){const p=[...pointersRef.current.values()];pinchRef.current={distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),zoom};dragRef.current.drag=false;return}if((e.target as HTMLElement).closest("button,input,a,.lv4-detail"))return;dragRef.current={drag:true,px:e.clientX-pan.x,py:e.clientY-pan.y,lastX:e.clientX,lastY:e.clientY,lastT:performance.now(),vx:0,vy:0,startX:e.clientX,startY:e.clientY};(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}
 function pointerMove(e:React.PointerEvent<HTMLElement>){if(pointersRef.current.has(e.pointerId))pointersRef.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointersRef.current.size===2&&pinchRef.current){const p=[...pointersRef.current.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);setZoom(Math.min(1.75,Math.max(.42,pinchRef.current.zoom*(d/pinchRef.current.distance))));return}if(dragRef.current.drag){const now=performance.now(),dt=Math.max(8,now-dragRef.current.lastT);dragRef.current.vx=(e.clientX-dragRef.current.lastX)/dt;dragRef.current.vy=(e.clientY-dragRef.current.lastY)/dt;dragRef.current.lastX=e.clientX;dragRef.current.lastY=e.clientY;dragRef.current.lastT=now;setPan({x:e.clientX-dragRef.current.px,y:e.clientY-dragRef.current.py});const dist=Math.hypot(e.clientX-dragRef.current.startX,e.clientY-dragRef.current.startY);if(dist>420&&products.length&&waveRef.current<8)loadWave()}}
 function pointerUp(e:React.PointerEvent<HTMLElement>){pointersRef.current.delete(e.pointerId);if(pointersRef.current.size<2)pinchRef.current=null;if(dragRef.current.drag){dragRef.current.drag=false;startInertia();const dist=Math.hypot(e.clientX-dragRef.current.startX,e.clientY-dragRef.current.startY);if(dist>160)loadWave()}}

 return <main className="lv4-shell" style={{"--a":scene.a,"--b":scene.b,"--c":scene.c,"--scene":`url(${scene.image})`} as React.CSSProperties}>
  <div className="lv4-scene"/>
  <aside className={`lv4-rail ${mobileNav?"mobile-open":""}`}><button className="lv4-logo" onClick={()=>setMobileNav(false)}>L@</button><button onClick={resetWorld}><Home/><span>Discover</span></button><button onClick={()=>setZoom(START_ZOOM)}><Compass/><span>Worlds</span></button><button><ScanFace/><span>Try on</span></button><button><Bookmark/><span>Saved</span></button><button onClick={resetWorld}><RotateCcw/><span>Reset</span></button></aside>
  <header className="lv4-search lv4-search-visible"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Search anything — products, style, price…" aria-label="Search products"/><button onClick={submit}>↵</button></header>
  <button className="lv4-mobile-menu" onClick={()=>setMobileNav(v=>!v)}>L@</button>

  <section ref={worldRef} className={`lv4-world level-${level}`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={e=>{e.preventDefault();setZoom(z=>Math.min(1.75,Math.max(.42,z*(e.deltaY<0?1.08:.92))))}}>
   <div className="lv4-stage" style={{width:WORLD_W,height:WORLD_H,transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}>
    {level==="worlds"&&<>
      <div className="lv4-world-title" style={{left:WORLD_CX,top:WORLD_CY-420}}><small>EXPLORE LUMINA</small><strong>Choose a world</strong><span>or search for anything above</span></div>
      {CATEGORIES.map((c,i)=>{const a=i/CATEGORIES.length*Math.PI*2-.55,x=WORLD_CX+Math.cos(a)*760,y=WORLD_CY+Math.sin(a)*470;return <button key={c.key} className={`lv4-category-bubble cat-${c.key}`} style={{left:x,top:y}} onClick={()=>chooseCategory(c.key)}><b>{c.label}</b><span>{c.subtitle}</span></button>})}
    </>}

    {level!=="worlds"&&<button className="lv4-intent" style={{left:WORLD_CX,top:WORLD_CY}} onClick={()=>setZoom(z=>Math.min(1.45,z+.18))}><span>{focus||CATEGORIES.find(c=>c.key===categoryKey)?.label}</span><small>{loading?"Finding products…":`${products.length} products${loadingMore?" · more arriving":""}`}</small></button>}

    {level!=="worlds"&&labels.map((label,i)=>{const ring=390+Math.floor(i/6)*190,a=(i%6)/6*Math.PI*2-.52,x=WORLD_CX+Math.cos(a)*ring,y=WORLD_CY+Math.sin(a)*(ring*.64);return <button key={`${label}-${i}`} className={`lv4-textbubble ${focus===label?"active":""}`} style={{left:x,top:y}} onClick={()=>explore(label)}>{label}</button>})}

    {level!=="worlds"&&products.map(p=>{const size=116+(hash(p.id)%30),showMeta=level==="details";return <button key={p.id} className={`lv4-product ${p.fresh?"lv4-new-product":""}`} style={{left:p.x,top:p.y,"--s":`${size}px`} as React.CSSProperties} onClick={()=>setSelected(p)}><span className="lv4-vita-gloss"/><img src={p.image} alt=""/>{p.price!=null&&<span className="lv4-price">{money(p)}</span>}{showMeta&&<span className="lv4-orbmeta"><b>{p.title}</b><em>{p.brand}</em></span>}</button>})}
   </div>
  </section>

  {selected&&<div className="lv4-detail-backdrop" onClick={()=>setSelected(null)}/>} 
  {selected&&<aside className="lv4-detail"><button className="lv4-close" onClick={()=>setSelected(null)}><X/></button><img src={selected.image} alt={selected.title}/><div className="lv4-detailcopy"><small className="lv4-product-brand">{selected.brand||"Independent store"}</small><span className="lv4-product-source">{sourceKind(selected)}</span><h2>{selected.title}</h2><strong>{money(selected)}</strong><div className="lv4-tagrow">{(selected.tags||[]).slice(0,4).map(t=><button key={t} onClick={()=>explore(t)}>{t}</button>)}</div><div className="lv4-actions"><button className={liked.has(selected.id)?"active":""} onClick={()=>setLiked(s=>{const n=new Set(s);n.has(selected.id)?n.delete(selected.id):n.add(selected.id);return n})}><Heart/></button><a href={selected.url||"#"} target="_blank" rel="noreferrer">View product <ExternalLink/></a>{categoryKey==="fashion"&&<button className="try"><Sparkles/> Try on</button>}</div></div></aside>}
 </main>
}
