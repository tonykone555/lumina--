"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Heart, ExternalLink, Sparkles, RotateCcw, Compass, Home, Bookmark, ScanFace } from "lucide-react";

type Product={id:string;title:string;brand:string;price:number|null;currency?:string;image:string;url?:string;tags?:string[];source?:string;x?:number;y?:number;zone?:number;fresh?:boolean};
type CatalogPage={products?:Product[];source?:string;sources?:string[];pagination?:Record<string,unknown>;market?:"lumina"|"ebay";error?:string};
type Scene={a:string;b:string;c:string;image:string;query:string;labels:string[]};
type Category={key:string;label:string;query:string;subtitle:string};
type MarketMode="lumina"|"ebay";

const WORLD_W=200000,WORLD_H=200000,WORLD_CX=WORLD_W/2,WORLD_CY=WORLD_H/2,ZONE_STEP=1480;
const START_ZOOM=.56;
const DISCOVERY_WAVES=["more like this","new arrivals","best value","more premium","same shape","top rated","unexpected picks","editor picks","alternative styles","hidden gems","popular choices","fresh finds"];
const CATEGORIES:Category[]=[
 {key:"fashion",label:"Fashion",query:"Beautiful fashion dresses shoes accessories",subtitle:"Clothing · shoes · accessories"},
 {key:"fitness",label:"Fitness",query:"Fitness gear activewear recovery training accessories",subtitle:"Training · recovery · activewear"},
 {key:"skin",label:"Beauty",query:"Beauty skincare self care products",subtitle:"Skin · self care · beauty"},
 {key:"hair",label:"Hair",query:"Hair care styling tools scalp products",subtitle:"Care · styling · tools"},
 {key:"home",label:"Home",query:"Premium home furniture lighting decor",subtitle:"Furniture · lighting · decor"},
 {key:"tech",label:"Tech",query:"Useful tech gadgets audio phone accessories",subtitle:"Gadgets · audio · mobile"},
 {key:"retail",label:"Discover",query:"Interesting trending products worth discovering",subtitle:"Trending · value · unexpected"}
];
const SCENES:Record<string,Scene>={
 fashion:{a:"#d9c7b8",b:"#8f7567",c:"#2c211b",image:"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2200&q=88",query:"Beautiful fashion dresses shoes accessories",labels:["Dresses","Shoes","Accessories","Minimal","Under €100","New"]},
 fitness:{a:"#c5d0c3",b:"#748479",c:"#26312a",image:"https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2200&q=88",query:"Fitness gear activewear recovery training accessories",labels:["Strength","Workout Gear","Activewear","Recovery","Under €80","Top Rated"]},
 skin:{a:"#e2cbc7",b:"#987874",c:"#372521",image:"https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=2200&q=88",query:"Beauty skincare self care products",labels:["Skincare","Tools","Sensitive","Under €50","Glow","Top Rated"]},
 hair:{a:"#dccab7",b:"#937967",c:"#32251f",image:"https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=2200&q=88",query:"Hair care styling tools scalp products",labels:["Styling","Scalp","Repair","Volume","Tools","Under €50"]},
 home:{a:"#d6c7b1",b:"#867568",c:"#2f2721",image:"https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2200&q=88",query:"Premium home furniture lighting decor",labels:["Lighting","Furniture","Decor","Smart Home","Under €100","Storage"]},
 tech:{a:"#c4ccd5",b:"#697684",c:"#1f262c",image:"https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=2200&q=88",query:"Useful tech gadgets audio phone accessories",labels:["Phone","Audio","Desk","Smart","Under €50","Top Rated"]},
 retail:{a:"#d0cdc4",b:"#777870",c:"#282923",image:"https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=2200&q=88",query:"Interesting trending products worth discovering",labels:["Trending","Best Value","New","Popular","Under €50","Unexpected"]}
};

function money(p:Product){if(p.price==null)return"";try{return new Intl.NumberFormat(undefined,{style:"currency",currency:p.currency||"EUR",maximumFractionDigits:0}).format(p.price)}catch{return String(p.price)}}
function hash(s:string){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return Math.abs(h)}
function cleanTitle(s:string){return String(s||"").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,"").replace(/\s{2,}/g," ").replace(/^\s*[|·—–-]+\s*|\s*[|·—–-]+\s*$/g,"").trim()}
function dedupe(list:Product[]){const seen=new Set<string>();return list.filter(p=>{const k=p.id||`${p.title}|${p.brand}`;if(seen.has(k))return false;seen.add(k);return true})}
function sourceKind(p:Product){const s=(p.source||"").toLowerCase();if(s.includes("ebay"))return"eBay Marketplace";if(s.includes("amazon")||s.includes("shopify"))return"LuminaMarket";return"Store"}
function zoneCenter(zone:number){if(zone<=0)return{x:WORLD_CX,y:WORLD_CY};const golden=2.399963229728653;const radius=ZONE_STEP*Math.sqrt(zone)*1.08;const angle=zone*golden;return{x:WORLD_CX+Math.cos(angle)*radius,y:WORLD_CY+Math.sin(angle)*radius}}

// Keep the large navigation/category bubbles as protected spatial zones. Product orbs are
// physically pushed away from these areas instead of merely being layered underneath them.
function protectedBubbleZones(){
 const zones:{x:number;y:number;r:number}[]=[{x:WORLD_CX,y:WORLD_CY,r:300}];
 for(let i=0;i<12;i++){
  const ring=390+Math.floor(i/6)*210,a=(i%6)/6*Math.PI*2-.52;
  zones.push({x:WORLD_CX+Math.cos(a)*ring,y:WORLD_CY+Math.sin(a)*(ring*.66),r:215});
 }
 for(let i=0;i<CATEGORIES.length;i++){
  const a=i/CATEGORIES.length*Math.PI*2-.55;
  zones.push({x:WORLD_CX+Math.cos(a)*780,y:WORLD_CY+Math.sin(a)*500,r:285});
 }
 return zones;
}
const PROTECTED_BUBBLES=protectedBubbleZones();
function keepClearOfBigBubbles(x:number,y:number,seed:number){let px=x,py=y;for(let pass=0;pass<4;pass++){for(const z of PROTECTED_BUBBLES){let dx=px-z.x,dy=py-z.y,d=Math.hypot(dx,dy);if(d>=z.r)continue;if(d<1){const a=(seed%360)*Math.PI/180;dx=Math.cos(a);dy=Math.sin(a);d=1}const extra=18+(seed%24),scale=(z.r+extra)/d;px=z.x+dx*scale;py=z.y+dy*scale}}return{x:px,y:py}}
function placeProduct(p:Product,index:number,fresh=false){const zone=Math.floor(index/18),local=index%18,h=hash(p.id||`${p.title}-${index}`),center=zoneCenter(zone),ring=230+(local%3)*165+(h%52),angle=(local/18)*Math.PI*2+(h%45)/100;const rawX=center.x+Math.cos(angle)*ring,rawY=center.y+Math.sin(angle)*(ring*.72),safe=keepClearOfBigBubbles(rawX,rawY,h);return{...p,title:cleanTitle(p.title),zone,fresh,x:safe.x,y:safe.y}}

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
 const [market,setMarket]=useState<MarketMode>("lumina");
 const [marketError,setMarketError]=useState("");
 const pointersRef=useRef(new Map<number,{x:number;y:number}>());
 const pinchRef=useRef<{distance:number;zoom:number}|null>(null);
 const dragRef=useRef({drag:false,px:0,py:0,lastX:0,lastY:0,startX:0,startY:0});
 const loadingRef=useRef(false),waveRef=useRef(0),lastExpandRef=useRef(0);
 const scene=SCENES[categoryKey]||SCENES.retail;

 const fetchProducts=useCallback(async(base:string,direction="",append=false,marketOverride:MarketMode=market,page=0)=>{
  if(loadingRef.current)return;loadingRef.current=true;append?setLoadingMore(true):setLoading(true);setMarketError("");
  try{
   const params=new URLSearchParams({q:base||scene.query,market:marketOverride,page:String(Math.max(0,page))});if(direction)params.set("direction",direction);
   const r=await fetch(`/api/catalog?${params}`);const data:CatalogPage=await r.json();const incoming=dedupe((data.products||[]).map(p=>({...p,title:cleanTitle(p.title)})));
   if(data.error)setMarketError(data.error);
   setProducts(prev=>{if(!append)return incoming.map((p,i)=>placeProduct(p,i));const merged=dedupe([...prev,...incoming]);return merged.map((p,i)=>placeProduct(p,i,i>=prev.length))});
  }catch{setMarketError(marketOverride==="ebay"?"eBay Marketplace is temporarily unavailable":"LuminaMarket is temporarily unavailable")}
  finally{loadingRef.current=false;setLoading(false);setLoadingMore(false)}
 },[scene.query,market]);

 function centerWorld(z:number){setZoom(z);setPan({x:-WORLD_CX*z,y:-WORLD_CY*z})}
 function chooseCategory(key:string){const c=CATEGORIES.find(x=>x.key===key)||CATEGORIES[CATEGORIES.length-1];setCategoryKey(c.key);setSubmitted(c.query);setQuery("");setFocus("");setSelected(null);setProducts([]);waveRef.current=0;centerWorld(.93);void fetchProducts(c.query)}
 function submit(){const q=query.trim();if(!q)return;setSubmitted(q);setFocus("");setSelected(null);setCategoryKey("retail");waveRef.current=0;centerWorld(.95);void fetchProducts(q)}
 function branch(direction:string){if(!submitted&&!scene.query)return;setFocus(direction);setSelected(null);setZoom(z=>Math.max(1.08,z));waveRef.current=0;void fetchProducts(submitted||scene.query,direction,true,market,0)}
 function resetWorld(){setSubmitted("");setQuery("");setFocus("");setSelected(null);setProducts([]);setMarketError("");waveRef.current=0;centerWorld(START_ZOOM)}
 function expandWorld(){if(!submitted||loadingRef.current)return;const now=Date.now();if(now-lastExpandRef.current<650)return;lastExpandRef.current=now;const page=waveRef.current+1;waveRef.current=page;const cue=focus||DISCOVERY_WAVES[(page-1)%DISCOVERY_WAVES.length];void fetchProducts(submitted,cue,true,market,page)}
 function changeMarket(next:MarketMode){if(next===market)return;setMarket(next);setSelected(null);setMarketError("");waveRef.current=0;if(submitted)void fetchProducts(submitted,focus,false,next,0)}

 const labels=useMemo(()=>{const fromProducts=products.flatMap(p=>p.tags||[]).filter(Boolean);return[...new Set([focus,...scene.labels,...fromProducts])].filter(Boolean).slice(0,12)},[products,focus,scene.labels]);
 const level=zoom<.68?"worlds":zoom<1?"themes":zoom<1.36?"products":"details";
 const zoneCount=Math.max(1,Math.ceil(products.length/18));
 useEffect(()=>{if(level==="details"&&products.length)expandWorld()},[level]); // eslint-disable-line react-hooks/exhaustive-deps

 function pointerDown(e:React.PointerEvent<HTMLElement>){pointersRef.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointersRef.current.size===2){const p=[...pointersRef.current.values()];pinchRef.current={distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),zoom};dragRef.current.drag=false;return}if((e.target as HTMLElement).closest("button,input,a,.lv4-detail"))return;dragRef.current={drag:true,px:e.clientX-pan.x,py:e.clientY-pan.y,lastX:e.clientX,lastY:e.clientY,startX:e.clientX,startY:e.clientY};(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}
 function pointerMove(e:React.PointerEvent<HTMLElement>){if(pointersRef.current.has(e.pointerId))pointersRef.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointersRef.current.size===2&&pinchRef.current){const p=[...pointersRef.current.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),next=Math.min(2.1,Math.max(.38,pinchRef.current.zoom*(d/pinchRef.current.distance)));setZoom(next);if(next>pinchRef.current.zoom*1.05)expandWorld();return}if(dragRef.current.drag){setPan({x:e.clientX-dragRef.current.px,y:e.clientY-dragRef.current.py});if(Math.hypot(e.clientX-dragRef.current.startX,e.clientY-dragRef.current.startY)>240)expandWorld()}}
 function pointerUp(e:React.PointerEvent<HTMLElement>){pointersRef.current.delete(e.pointerId);if(pointersRef.current.size<2)pinchRef.current=null;dragRef.current.drag=false}

 return <main className={`lv4-shell market-${market}`} style={{"--a":scene.a,"--b":scene.b,"--c":scene.c,"--scene":`url(${scene.image})`} as React.CSSProperties}>
  <div className="lv4-scene"/>
  <aside className={`lv4-rail ${mobileNav?"mobile-open":""}`}><button className="lv4-logo" onClick={()=>setMobileNav(false)}>L@</button><button onClick={resetWorld}><Home/><span>Discover</span></button><button onClick={()=>centerWorld(START_ZOOM)}><Compass/><span>Worlds</span></button><button><ScanFace/><span>Try on</span></button><button><Bookmark/><span>Saved</span></button><button onClick={resetWorld}><RotateCcw/><span>Reset</span></button></aside>
  <header className="lv4-search lv4-search-visible"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder={market==="ebay"?"Search eBay Marketplace — product, style, price…":"Search LuminaMarket — products, style, price…"}/><button onClick={submit}>↵</button></header>
  <div className="lv4-market-toggle"><button className={market==="lumina"?"active":""} onClick={()=>changeMarket("lumina")}><b>LuminaMarket</b><span>Curated stores</span></button><button className={market==="ebay"?"active ebay":"ebay"} onClick={()=>changeMarket("ebay")}><b>eBay</b><span>Marketplace</span></button></div>
  <button className="lv4-mobile-menu" onClick={()=>setMobileNav(v=>!v)}>L@</button>

  <section className={`lv4-world level-${level}`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={e=>{e.preventDefault();const inward=e.deltaY<0;setZoom(z=>Math.min(2.1,Math.max(.38,z*(inward?1.085:.925))));if(inward)expandWorld()}}>
   <div className="lv4-stage" style={{width:WORLD_W,height:WORLD_H,transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}>
    {level==="worlds"&&<><div className="lv4-world-title" style={{left:WORLD_CX,top:WORLD_CY-430}}><small>{market==="ebay"?"EXPLORE EBAY":"EXPLORE LUMINA"}</small><strong>Choose a world</strong><span>or search for anything above</span></div>{CATEGORIES.map((c,i)=>{const a=i/CATEGORIES.length*Math.PI*2-.55,x=WORLD_CX+Math.cos(a)*780,y=WORLD_CY+Math.sin(a)*500;return <button key={c.key} className={`lv4-category-bubble cat-${c.key}`} style={{left:x,top:y}} onClick={()=>chooseCategory(c.key)}><b>{c.label}</b><span>{c.subtitle}</span></button>})}</>}

    {level!=="worlds"&&<button className="lv4-intent" style={{left:WORLD_CX,top:WORLD_CY}} onClick={()=>{setZoom(z=>Math.min(1.65,z+.2));expandWorld()}}><span>{focus||CATEGORIES.find(c=>c.key===categoryKey)?.label}</span><small>{marketError|| (loading?"Finding products…":`${products.length} products · ${zoneCount} zones${loadingMore?" · more arriving":""}`)}</small></button>}
    {level!=="worlds"&&labels.map((label,i)=>{const ring=390+Math.floor(i/6)*210,a=(i%6)/6*Math.PI*2-.52,x=WORLD_CX+Math.cos(a)*ring,y=WORLD_CY+Math.sin(a)*(ring*.66);return <button key={`${label}-${i}`} className={`lv4-textbubble ${focus===label?"active":""}`} style={{left:x,top:y}} onClick={()=>branch(label)}>{label}</button>})}
    {level!=="worlds"&&products.map(p=>{const size=116+(hash(p.id)%42),showMeta=level==="details";return <button key={p.id} className={`lv4-product ${p.fresh?"lv4-new-product":""}`} style={{left:p.x,top:p.y,"--s":`${size}px`} as React.CSSProperties} onClick={()=>setSelected(p)}><span className="lv4-vita-gloss"/><img src={p.image} alt=""/>{p.price!=null&&<span className="lv4-price">{money(p)}</span>}{showMeta&&<span className="lv4-orbmeta"><b>{cleanTitle(p.title)}</b><em>{p.brand}</em></span>}</button>})}
   </div>
  </section>

  {selected&&<aside className="lv4-detail"><button className="lv4-close" onClick={()=>setSelected(null)}><X/></button><img src={selected.image} alt={cleanTitle(selected.title)}/><div className="lv4-detailcopy"><small className="lv4-product-brand">{selected.brand||"Independent store"}</small><span className={`lv4-product-source ${selected.source?.includes("ebay")?"ebay":""}`}>{sourceKind(selected)}</span><h2>{cleanTitle(selected.title)}</h2><strong>{money(selected)}</strong><div className="lv4-actions"><a href={selected.url||"#"} target="_blank" rel="noreferrer">{selected.source?.includes("ebay")?"View on eBay":"View at store"} <ExternalLink/></a><button className={liked.has(selected.id)?"active":""} onClick={()=>setLiked(s=>{const n=new Set(s);n.has(selected.id)?n.delete(selected.id):n.add(selected.id);return n})}><Heart/></button>{categoryKey==="fashion"&&<button className="try"><Sparkles/> Try on</button>}</div><div className="lv4-direction-row"><button onClick={()=>branch("More like this")}>More like this</button><button onClick={()=>branch("Cheaper")}>Cheaper</button><button onClick={()=>branch("More premium")}>More premium</button><button onClick={()=>branch("Same shape")}>Same shape</button></div><div className="lv4-tagrow">{(selected.tags||[]).slice(0,5).map(t=><button key={t} onClick={()=>branch(t)}>{t}</button>)}</div></div></aside>}
 </main>
}