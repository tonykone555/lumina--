"use client";

import {useEffect,useMemo,useState,type CSSProperties} from "react";

type Review={rating:number;text:string;createdAt?:number};
type Variant={id:string;label:string;price:number|null;currency?:string;available:boolean};
type Product={id:string;listingId:number;shopId?:number;title:string;brand:string;description?:string;price:number|null;currency?:string;image:string;images?:string[];url?:string;variants?:Variant[];rating?:number|null;reviewCount?:number;reviews?:Review[]};
type OAuthStatus={configured?:boolean;connected?:boolean;userId?:string|null;scope?:string|null;expiresAt?:string|null};

type BubbleStyle=CSSProperties&{"--etsy-x":string;"--etsy-y":string;"--etsy-size":string;"--etsy-delay":string};
function money(value:number|null,currency="EUR"){if(value==null)return"";try{return new Intl.NumberFormat(undefined,{style:"currency",currency,maximumFractionDigits:2}).format(value)}catch{return`${value.toFixed(2)} ${currency}`}}
function stars(value:number|null|undefined){const n=Math.max(0,Math.min(5,Number(value||0)));return`${"★".repeat(Math.round(n))}${"☆".repeat(5-Math.round(n))}`}
function bubbleStyle(index:number):BubbleStyle{
 const ring=Math.floor(index/10),slot=index%10,angle=(slot/10)*Math.PI*2+(ring%2)*.31;
 const radius=18+ring*14+(slot%3)*2.4;
 const x=50+Math.cos(angle)*radius,y=50+Math.sin(angle)*radius*.68;
 const size=116+((index*37)%58);
 return{"--etsy-x":`${Math.max(7,Math.min(93,x))}%`,"--etsy-y":`${Math.max(9,Math.min(91,y))}%`,"--etsy-size":`${size}px`,"--etsy-delay":`${-(index%9)*.42}s`};
}

export default function EtsySourceController(){
 const [active,setActive]=useState(false);const [products,setProducts]=useState<Product[]>([]);const [loading,setLoading]=useState(false);const [error,setError]=useState("");const [selected,setSelected]=useState<Product|null>(null);const [showReviews,setShowReviews]=useState(false);const [variant,setVariant]=useState<Variant|null>(null);const [page,setPage]=useState(0);const [oauth,setOauth]=useState<OAuthStatus>({});
 const query=useMemo(()=>{if(typeof document==="undefined")return"gifts";return document.querySelector<HTMLInputElement>(".lv4-search input")?.value?.trim()||"gifts"},[active,page]);
 async function load(nextPage=0,append=false){setLoading(true);setError("");try{const region=(()=>{try{return JSON.parse(localStorage.getItem("ynot-region")||"null")?.country||"FR"}catch{return"FR"}})();const r=await fetch(`/api/etsy?q=${encodeURIComponent(query||"gifts")}&page=${nextPage}&country=${encodeURIComponent(region)}&currency=EUR`,{cache:"no-store"});const data=await r.json();if(!r.ok)throw new Error(data.error||"Etsy unavailable");const list=Array.isArray(data.products)?data.products:[];setProducts(prev=>append?[...prev,...list]:list);setPage(nextPage);if(typeof data.oauthConnected==="boolean")setOauth(prev=>({...prev,connected:data.oauthConnected}))}catch(e){setError(e instanceof Error?e.message:"Etsy unavailable")}finally{setLoading(false)}}
 async function refreshOauth(){try{const r=await fetch("/api/etsy/oauth/status",{cache:"no-store"});const data=await r.json();if(r.ok)setOauth(data)}catch{}}
 useEffect(()=>{if(!active)return;document.body.classList.add("ynot-etsy-mode");void refreshOauth();void load(0,false);return()=>document.body.classList.remove("ynot-etsy-mode")},[active]);
 useEffect(()=>{const host=document.querySelector(".lv4-market-toggle");if(!host)return;let button=host.querySelector<HTMLButtonElement>(".ynot-etsy-tab");if(!button){button=document.createElement("button");button.className="ynot-etsy-tab";button.innerHTML="<b>Etsy</b><span>Marketplace</span>";host.appendChild(button)}const click=(e:Event)=>{e.preventDefault();e.stopPropagation();setActive(true);setSelected(null);setShowReviews(false)};button.addEventListener("click",click,true);const leave=(e:Event)=>{const target=e.target as HTMLElement|null;if(target?.closest(".ynot-etsy-tab"))return;if(target?.closest(".lv4-market-toggle button")){setActive(false);setSelected(null);setShowReviews(false)}};document.addEventListener("click",leave,true);return()=>{button?.removeEventListener("click",click,true);document.removeEventListener("click",leave,true)}},[]);
 useEffect(()=>{if(!active)return;const submit=(e:Event)=>{const target=e.target as HTMLElement|null;if(target?.matches(".lv4-search button")||((e as KeyboardEvent).key==="Enter"&&target?.matches(".lv4-search input"))){e.preventDefault();e.stopImmediatePropagation();void load(0,false)}};document.addEventListener("click",submit,true);document.addEventListener("keydown",submit,true);return()=>{document.removeEventListener("click",submit,true);document.removeEventListener("keydown",submit,true)}},[active,query]);
 if(!active)return null;
 const displayPrice=variant?.price??selected?.price??null;const displayCurrency=variant?.currency||selected?.currency||"EUR";
 return <>
  <section className="ynot-etsy-layer" aria-label="Etsy products only">
   <div className="ynot-etsy-head"><div><small>ETSY · YNOT WORLD</small><h2>Etsy</h2>{!oauth.connected&&<div className="ynot-etsy-oauth"><a href="/api/etsy/oauth/start">Connect Etsy</a></div>}</div><button onClick={()=>void load(0,false)} disabled={loading}>{loading?"Loading…":"Refresh"}</button></div>
   {error&&<div className="ynot-etsy-error">{error}</div>}
   {oauth.connected&&<div className="ynot-etsy-world">{products.map((product,index)=><button key={product.id} style={bubbleStyle(index)} className="ynot-etsy-product" onClick={()=>{setSelected(product);setVariant(null);setShowReviews(false)}}><span className="ynot-etsy-image"><img src={product.image} alt=""/></span><span className="ynot-etsy-copy"><b>{product.title}</b><span className="ynot-etsy-rating">{product.rating?`★ ${product.rating.toFixed(1)} · ${product.reviewCount||0}`:"Etsy"}</span><strong>{money(product.price,product.currency||"EUR")}</strong></span></button>)}</div>}
   {!oauth.connected&&<div className="ynot-etsy-connect-state"><span className="ynot-etsy-connect-orb">Etsy</span><p>Connect Etsy once to power this marketplace for YNOT.</p></div>}
   {oauth.connected&&products.length>0&&<button className="ynot-etsy-more" onClick={()=>void load(page+1,true)} disabled={loading}>{loading?"Loading…":"Explore more"}</button>}
  </section>
  {selected&&<article className={`lv4-detail ynot-etsy-detail ${showReviews?"ynot-etsy-reviews-open":""}`}>
   {!showReviews?<><button className="ynot-etsy-close" onClick={()=>setSelected(null)}>×</button><img src={selected.image} alt=""/><div className="lv4-detailcopy"><small>ETSY · {selected.brand}</small><h2>{selected.title}</h2>{selected.rating?<button className="ynot-etsy-review-trigger" onClick={()=>setShowReviews(true)}>{stars(selected.rating)} <b>{selected.rating.toFixed(1)}</b> · {selected.reviewCount||0} reviews</button>:null}<strong>{money(displayPrice,displayCurrency)}</strong>{(selected.variants||[]).length>0&&<div className="ynot-etsy-variants">{selected.variants?.map(v=><button key={v.id} className={variant?.id===v.id?"active":""} disabled={!v.available} onClick={()=>setVariant(v)}>{v.label}{v.price!=null?` · ${money(v.price,v.currency||selected.currency||"EUR")}`:""}</button>)}</div>}<p>{selected.description}</p>{selected.url&&<a href={selected.url} target="_blank" rel="noreferrer">View on Etsy</a>}</div></>:<section className="ynot-etsy-review-back"><button className="ynot-etsy-back" onClick={()=>setShowReviews(false)}>←</button><small>ETSY REVIEWS</small><h3>{selected.title}</h3><div className="ynot-etsy-review-list">{(selected.reviews||[]).slice(0,5).map((r,i)=><article key={i}><b>{stars(r.rating)} {r.rating.toFixed(1)}</b><p>{r.text||"Rated on Etsy"}</p></article>)}</div></section>}
  </article>}
 </>
}
