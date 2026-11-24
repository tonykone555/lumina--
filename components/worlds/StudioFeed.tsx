"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowUpRight,Bookmark,Check,ChevronDown,ChevronUp,Share2} from "lucide-react";
import "./StudioFeed.css";
import {YNOT_VISUAL_WORLDS} from "@/lib/visual/expanded-world-taxonomy";

type Product={id:string;title:string;brand:string;price:number;image:string;sourceUrl:string;category:string;description?:string;score?:number};
type Category="all"|"featured"|"home"|"fashion"|"beauty"|"tech"|"fitness"|"jewelry"|"kitchen"|"outdoor"|"pets"|"travel"|"kids"|"auto"|"electric"|"sports";
const tabs:{key:Category;label:string}[]=[
 {key:"all",label:"For you"},{key:"featured",label:"Best finds"},{key:"home",label:"Home"},{key:"fashion",label:"Fashion"},{key:"beauty",label:"Beauty"},{key:"tech",label:"Tech"},{key:"fitness",label:"Fitness"},{key:"jewelry",label:"Jewelry"},{key:"kitchen",label:"Kitchen"},{key:"outdoor",label:"Outdoor"},{key:"pets",label:"Pets"},{key:"travel",label:"Travel"},{key:"kids",label:"Kids"},{key:"auto",label:"Auto"},{key:"electric",label:"Electric"},{key:"sports",label:"Sports"}
];
type NavStep="categories"|"types"|"brands";
type Subtype={key:string;label:string;test:(title:string)=>boolean};
const subtypeGroups:Record<string,Subtype[]>={
 electric:[{key:"e-bikes",label:"E-bikes",test:t=>/ebike|e-bike|electric bicycle/i.test(t)},{key:"scooters",label:"Scooters",test:t=>/scooter/i.test(t)},{key:"electric-ride",label:"Electric ride",test:t=>/dirt bike|motorcycle|board|efoil|surfboard|electric/i.test(t)}],
 sports:[{key:"football",label:"Football",test:t=>/football|soccer/i.test(t)},{key:"basketball",label:"Basketball",test:t=>/basketball/i.test(t)},{key:"tennis",label:"Tennis",test:t=>/tennis|racket/i.test(t)},{key:"equipment",label:"Equipment",test:t=>/sport|training|ball|equipment/i.test(t)}],
 "home":[
  {key:"lighting",label:"Lighting",test:t=>/pendant|lamp|light|chandelier|fixture/i.test(t)},
  {key:"chairs",label:"Chairs",test:t=>/chair|armchair|recliner|stool/i.test(t)},
  {key:"sofas",label:"Sofas",test:t=>/sofa|couch|loveseat|sectional/i.test(t)},
  {key:"tables",label:"Tables",test:t=>/table|console|desk/i.test(t)},
  {key:"d-cor",label:"Décor",test:t=>/rug|mirror|vase|decor|shelf|cabinet|bed|ottoman/i.test(t)},
 ],
 "fashion":[
  {key:"dresses",label:"Dresses",test:t=>/dress|gown|jumpsuit/i.test(t)},
  {key:"tops",label:"Tops",test:t=>/shirt|blouse|tee|sweater|cardigan|hoodie/i.test(t)},
  {key:"trousers",label:"Trousers",test:t=>/trouser|pant|jean|skirt|shorts/i.test(t)},
  {key:"outerwear",label:"Outerwear",test:t=>/coat|jacket|blazer/i.test(t)},
  {key:"shoes",label:"Shoes",test:t=>/shoe|sneaker|boot|sandal/i.test(t)},
  {key:"bags",label:"Bags",test:t=>/handbag|bag|tote|purse/i.test(t)},
 ],
 "beauty":[
  {key:"skincare",label:"Skincare",test:t=>/serum|moisturiz|skincare|face cream|sunscreen/i.test(t)},
  {key:"makeup",label:"Makeup",test:t=>/lipstick|mascara|foundation|concealer|makeup|blush/i.test(t)},
  {key:"hair",label:"Hair",test:t=>/shampoo|conditioner|hair|curler/i.test(t)},
  {key:"fragrance",label:"Fragrance",test:t=>/perfume|fragrance|eau de/i.test(t)},
 ],
 "tech":[
  {key:"audio",label:"Audio",test:t=>/headphone|earbud|speaker|audio/i.test(t)},
  {key:"phones",label:"Phones",test:t=>/phone|smartphone/i.test(t)},
  {key:"wearables",label:"Wearables",test:t=>/smartwatch|smart watch|wearable/i.test(t)},
  {key:"cameras",label:"Cameras",test:t=>/camera|lens/i.test(t)},
  {key:"computing",label:"Computing",test:t=>/laptop|tablet|keyboard|monitor|computer|projector/i.test(t)},
 ],
 "fitness":[
  {key:"training",label:"Training",test:t=>/dumbbell|kettlebell|resistance|training|weight/i.test(t)},
  {key:"yoga",label:"Yoga",test:t=>/yoga|pilates|mat/i.test(t)},
  {key:"running",label:"Running",test:t=>/running|sneaker|shoe/i.test(t)},
  {key:"gym-gear",label:"Gym gear",test:t=>/gym|sport|fitness|exercise/i.test(t)},
 ],
 "jewelry":[
  {key:"necklaces",label:"Necklaces",test:t=>/necklace|pendant/i.test(t)},
  {key:"earrings",label:"Earrings",test:t=>/earring/i.test(t)},
  {key:"rings",label:"Rings",test:t=>/ring/i.test(t)},
  {key:"bracelets",label:"Bracelets",test:t=>/bracelet/i.test(t)},
  {key:"other-jewelry",label:"Other jewelry",test:t=>/jewel|gemstone/i.test(t)},
 ],
 "kitchen":[
  {key:"coffee",label:"Coffee",test:t=>/coffee|espresso/i.test(t)},
  {key:"appliances",label:"Appliances",test:t=>/air fryer|kettle|blender|mixer|toaster/i.test(t)},
  {key:"dinnerware",label:"Dinnerware",test:t=>/plate|cup|dinnerware|mug|ceramic/i.test(t)},
  {key:"cookware",label:"Cookware",test:t=>/pot|pan|cookware|cast iron|cooking/i.test(t)},
 ],
 "outdoor":[
  {key:"outdoor-furniture",label:"Outdoor furniture",test:t=>/patio|outdoor|pergola|lounge/i.test(t)},
  {key:"lighting",label:"Lighting",test:t=>/lamp|lantern|lighting/i.test(t)},
  {key:"camping",label:"Camping",test:t=>/camp|tent/i.test(t)},
  {key:"garden",label:"Garden",test:t=>/garden|lawn|grill/i.test(t)},
 ],
 "pets":[
  {key:"dogs",label:"Dogs",test:t=>/dog|leash|kennel/i.test(t)},
  {key:"cats",label:"Cats",test:t=>/cat|scratcher/i.test(t)},
  {key:"other-pets",label:"Other pets",test:t=>/pet|aquarium/i.test(t)},
 ],
 "travel":[
  {key:"luggage",label:"Luggage",test:t=>/luggage|suitcase/i.test(t)},
  {key:"bags",label:"Bags",test:t=>/backpack|weekender|duffle/i.test(t)},
  {key:"accessories",label:"Accessories",test:t=>/travel|packing/i.test(t)},
 ],
 "kids":[
  {key:"baby",label:"Baby",test:t=>/baby|nursery|stroller/i.test(t)},
  {key:"toys",label:"Toys",test:t=>/toy|playset|educational/i.test(t)},
  {key:"clothing",label:"Clothing",test:t=>/kids|toddler|children/i.test(t)},
 ],
 "auto":[
  {key:"accessories",label:"Accessories",test:t=>/car|auto|vehicle|phone mount/i.test(t)},
  {key:"care",label:"Care",test:t=>/detailing|cleaner|wash/i.test(t)},
  {key:"interior",label:"Interior",test:t=>/organizer|seat|dashboard/i.test(t)},
 ],
};
const normalizeCategory=(cat:string):Category=>cat==="lighting"||cat==="chairs"||cat==="furniture"?"home":tabs.some(t=>t.key===cat)?cat as Category:"home";
const primary=(name:string)=>subtypeGroups[name]||[];
const matchesSubtype=(p:Product,sub:string)=>primary(normalizeCategory(p.category)).some(x=>x.key===sub&&x.test(p.title));
const cleanBrand=(brand:string)=>brand?.trim().replace(/\s+/g," ")||"Independent";
const describe=(p:Product)=>`Explore ${p.brand||"independent store"} on YNOT World. Discover, save, and view product details.`;
const money=(n:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"EUR",maximumFractionDigits:2}).format(n);
const storageKey="ynot-saved-items";
const valid=(p:Product)=>Boolean(p.id&&p.title&&p.image&&p.price>0&&p.category);
export default function StudioFeed({products}:{products:Product[]}){
 const [category,setCategory]=useState<Category>("all");
 const [index,setIndex]=useState(0);
 const [navStep,setNavStep]=useState<NavStep>("categories");
 const [subtype,setSubtype]=useState("");
 const [brand,setBrand]=useState("");
 const [saved,setSaved]=useState<string[]>([]);
 const [catalog,setCatalog]=useState<Product[]>(products);
 const [nextPage,setNextPage]=useState(0);
 const [loadingMore,setLoadingMore]=useState(false);
 const [loadError,setLoadError]=useState(false);
 const loadingRef=useRef(false);
 const nextRef=useRef(0);
 const [hasMore,setHasMore]=useState(true);
 const [toast,setToast]=useState("");
 const [scrubbing,setScrubbing]=useState(false);
 const zipper=useRef<HTMLDivElement>(null);
 const swipe=useRef<{x:number;y:number;at:number}|null>(null);
 const lastWheel=useRef(0);
 const deepLinkConsumed=useRef(false);
 const categoryItems=useMemo(()=>category==="all"?catalog:category==="featured"?catalog.filter(p=>Number(p.score||0)>=63).sort((a,b)=>Number(b.score||0)-Number(a.score||0)):catalog.filter(p=>normalizeCategory(p.category)===category),[category,catalog]);
 const typedItems=useMemo(()=>!subtype?categoryItems:categoryItems.filter(p=>matchesSubtype(p,subtype)),[categoryItems,subtype]);
 const items=useMemo(()=>!brand?typedItems:typedItems.filter(p=>cleanBrand(p.brand).toLowerCase()===brand.toLowerCase()),[typedItems,brand]);
 const subOptions=useMemo(()=>primary(category).map(option=>({key:option.key,label:option.label,products:categoryItems.filter(p=>option.test(p.title))})).filter(x=>x.products.length>0),[category,categoryItems]);
 const brandOptions=useMemo(()=>{const map=new Map<string,Product[]>();for(const p of typedItems){const name=cleanBrand(p.brand);const current=map.get(name)||[];current.push(p);map.set(name,current)}return [...map.entries()].map(([name,products])=>({name,products})).sort((a,b)=>b.products.length-a.products.length||a.name.localeCompare(b.name))},[typedItems]);
 const displayBubbles=useMemo(()=>{
  if(navStep==="categories")return tabs.map(tab=>({key:tab.key,label:tab.label,products:tab.key==="all"?catalog:tab.key==="featured"?catalog.filter(p=>Number(p.score||0)>=63):catalog.filter(p=>normalizeCategory(p.category)===tab.key)}));
  if(navStep==="types")return subOptions;
  return brandOptions.map(x=>({key:x.name,label:x.name,products:x.products}));
 },[navStep,catalog,subOptions,brandOptions]);
 const current=items[Math.min(index,Math.max(0,items.length-1))];
 const currentIndex=Math.min(index,Math.max(0,items.length-1));
 const setSafeIndex=useCallback((next:number)=>setIndex(Math.max(0,Math.min(items.length-1,Math.round(next)))),[items.length]);
 useEffect(()=>{try{const value=JSON.parse(localStorage.getItem(storageKey)||"[]");if(Array.isArray(value))setSaved(value.filter(x=>typeof x==="string"))}catch{}},[]);
 useEffect(()=>{setIndex(0)},[category,subtype,brand]);
 const loadMore=useCallback(async()=>{
  if(loadingRef.current||nextRef.current>=14)return;
  loadingRef.current=true;setLoadingMore(true);setLoadError(false);
  const page=nextRef.current;
  try{
   const response=await fetch("/api/studio/catalog?page="+page,{cache:"force-cache",signal:AbortSignal.timeout(35000)});
   if(!response.ok)throw new Error("CATALOG_UNAVAILABLE");
   const data=await response.json() as {products?:Product[];hasMore?:boolean};
   const incoming=(Array.isArray(data.products)?data.products:[]).filter(valid);
   setCatalog(previous=>{const keys=new Set(previous.map(p=>p.id));const titles=new Set(previous.map(p=>(p.title+"|"+p.brand).toLowerCase().replace(/[^a-z0-9]/g,"")));const fresh=incoming.filter(p=>{const key=(p.title+"|"+p.brand).toLowerCase().replace(/[^a-z0-9]/g,"");if(keys.has(p.id)||titles.has(key))return false;keys.add(p.id);titles.add(key);return true});return [...previous,...fresh]});
   nextRef.current=page+1;setNextPage(nextRef.current);setHasMore(Boolean(data.hasMore)&&nextRef.current<14);
  }catch{setLoadError(true)}
  finally{loadingRef.current=false;setLoadingMore(false)}
 },[]);
 useEffect(()=>{void loadMore()},[loadMore]);
 useEffect(()=>{if(hasMore&&!loadingMore&&!loadError&&(nextPage<4||items.length-currentIndex<20||(category!=="all"&&items.length<20)))void loadMore()},[items.length,currentIndex,category,hasMore,loadingMore,loadError,loadMore]);
 useEffect(()=>{if(!toast)return;const t=window.setTimeout(()=>setToast(""),2500);return()=>clearTimeout(t)},[toast]);
 useEffect(()=>{if(!current)return;const nearby=items.slice(currentIndex+1,currentIndex+5);for(const p of nearby){const image=new Image();image.src=p.image}},[items,currentIndex,current?.id]);
 const save=()=>{
  if(!current)return;
  let list:Array<Record<string,unknown>>=[];
  try{const stored=JSON.parse(localStorage.getItem(storageKey)||"[]");if(Array.isArray(stored))list=stored.filter(x=>x&&typeof x==="object")}catch{}
  const exists=list.some(p=>String(p.id)===current.id);
  const item={id:current.id,title:current.title,brand:current.brand,price:current.price,currency:"EUR",image:current.image,images:[current.image],url:current.sourceUrl,source:"shopify-global-catalog",section:"Studio",sections:["Studio"],badge:"Saved from Studio",note:"Saved from YNOT Studio interior catalogue"};
  const next=exists?list.filter(p=>String(p.id)!==current.id):[item,...list];
  try{localStorage.setItem(storageKey,JSON.stringify(next));localStorage.setItem("ynot-saved-products",JSON.stringify(next.map(p=>p.id)))}catch{}
  setSaved(next.map(p=>String(p.id)));window.dispatchEvent(new Event("ynot:saves-changed"));
  setToast(exists?"Removed from Saves":"Saved");
 };
 const share=async()=>{if(!current)return;const url=window.location.origin+"/worlds/studio?product="+encodeURIComponent(current.id);try{if(navigator.share)await navigator.share({title:current.title,url});else{await navigator.clipboard.writeText(url);setToast("Link copied")}}catch{}};
 useEffect(()=>{if(deepLinkConsumed.current)return;const params=new URLSearchParams(window.location.search);const selected=params.get("product");if(!selected){deepLinkConsumed.current=true;return}const idx=items.findIndex(p=>p.id===selected);if(idx>=0){setIndex(idx);deepLinkConsumed.current=true}},[items]);
 const onBubbleSelect=(key:string)=>{
  if(navStep==="categories"){
   const next=key as Category;
   setCategory(next);setSubtype("");setBrand("");
   setNavStep(next==="all"||next==="featured"?"categories":"types");
  }else if(navStep==="types"){
   setSubtype(key);setBrand("");setNavStep("brands");
  }else{
   setBrand(key);
  }
  setIndex(0);
 };
 const backLevel=()=>{
  if(navStep==="brands"){setBrand("");setSubtype("");setNavStep("types")}
  else if(navStep==="types"){setCategory("all");setSubtype("");setBrand("");setNavStep("categories")}
  setIndex(0);
 };
 const selectFromPoint=(clientY:number)=>{const el=zipper.current;if(!el)return;const b=el.getBoundingClientRect();const percent=Math.min(1,Math.max(0,(clientY-b.top)/b.height));setSafeIndex(percent*(items.length-1))};
 const onZipperDown=(e:React.PointerEvent<HTMLDivElement>)=>{e.preventDefault();e.stopPropagation();setScrubbing(true);e.currentTarget.setPointerCapture(e.pointerId);selectFromPoint(e.clientY)};
 const onZipperMove=(e:React.PointerEvent<HTMLDivElement>)=>{if(scrubbing)selectFromPoint(e.clientY)};
 const onZipperUp=(e:React.PointerEvent<HTMLDivElement>)=>{setScrubbing(false);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)};
 const onStageDown=(e:React.PointerEvent<HTMLElement>)=>{if((e.target as HTMLElement).closest("button,a,input,.studio-zip,.studio-bubble-browser,.studio-project-panel"))return;swipe.current={x:e.clientX,y:e.clientY,at:Date.now()}};
 const onStageUp=(e:React.PointerEvent<HTMLElement>)=>{const start=swipe.current;swipe.current=null;if(!start)return;const dy=e.clientY-start.y;const dx=e.clientX-start.x;if(Math.abs(dy)>52&&Math.abs(dy)>Math.abs(dx))setSafeIndex(currentIndex+(dy<0?1:-1))};
 const onWheel=(e:React.WheelEvent<HTMLElement>)=>{if((e.target as HTMLElement).closest(".studio-project-panel,.studio-zip"))return;if(Math.abs(e.deltaY)<12)return;const now=Date.now();if(now-lastWheel.current<360)return;lastWheel.current=now;setSafeIndex(currentIndex+(e.deltaY>0?1:-1))};
 if(!current)return <main className="studio-empty"><Link href="/worlds/studio">YNOT Studio</Link><p>{loadingMore?"Finding products in this collection…":"No products found in this collection yet."}</p><button onClick={()=>{setCategory("all");setSubtype("");setBrand("");setNavStep("categories")}} style={{padding:"12px 18px",borderRadius:30}}>All products</button>{loadError&&<button onClick={()=>void loadMore()}>Retry search</button>}</main>;
 const matchingWorld=normalizeCategory(current.category);
 const worldIds:Record<string,string>={home:"home-interiors",fashion:"fashion",beauty:"beauty",tech:"tech",fitness:"fitness",jewelry:"jewelry",kitchen:"kitchen",outdoor:"outdoor",pets:"pets",travel:"travel",kids:"baby-kids",auto:"automotive",electric:"electric",sports:"sports"};
 const selectedWorld=worldIds[matchingWorld]||"home-interiors";
 const taxonomyWorld=YNOT_VISUAL_WORLDS.find(w=>w.id===selectedWorld);
 const productWords=(current.title||"").toLowerCase();
 const taxonomyCandidates=taxonomyWorld?.categories.flatMap(c=>c.subcategories.map(s=>({category:c.id,subcategory:s.id,term:s.queries[0]||s.title})))||[];
 const bestPath=taxonomyCandidates.map(p=>({...p,hit:p.term.toLowerCase().split(/\s+/).filter(w=>w.length>3&&productWords.includes(w)).length})).sort((a,b)=>b.hit-a.hit)[0];
 const categoryPath=matchingWorld==="home"?(current.category==="lighting"||/chandelier|lamp|light/i.test(current.title)?"lighting/chandeliers":current.category==="chairs"||/chair/i.test(current.title)?"living/armchairs":/sofa|couch|loveseat/i.test(current.title)?"living/sofas":"living/coffee-tables"):(bestPath?bestPath.category+"/"+bestPath.subcategory:null);
 const masonryParams=new URLSearchParams({studio:"1",product:current.id,title:current.title,brand:current.brand||"",image:current.image,price:String(current.price),url:current.sourceUrl||"",description:current.description||"",origin:"studio"});
 const masonryHref=categoryPath?"/worlds/"+selectedWorld+"/"+categoryPath+"?"+masonryParams.toString():"/worlds/studio?product="+encodeURIComponent(current.id);
 const progress=items.length>1?currentIndex/(items.length-1):0;
 return <main className="studio-stage" tabIndex={0} aria-label="YNOT Studio vertical interiors product feed" onPointerDown={onStageDown} onPointerUp={onStageUp} onWheel={onWheel} onKeyDown={e=>{if(e.key==="ArrowDown"){e.preventDefault();setSafeIndex(currentIndex+1)}if(e.key==="ArrowUp"){e.preventDefault();setSafeIndex(currentIndex-1)}if(e.key==="Escape")e.currentTarget.blur()}}>
  <div className="studio-backdrop" key={"bg-"+current.id} style={{backgroundImage:`url("${current.image.replaceAll('"',"%22")}")`}} aria-hidden="true"/>
  <div className="studio-hero" key={current.id}><img src={current.image} alt={current.title} fetchPriority="high"/></div>
  <div className="studio-vignette" aria-hidden="true"/>
  <header className="studio-topbar">
   <Link href="/worlds" className="studio-back" aria-label="Back to YNOT Worlds"><ArrowLeft size={18}/></Link>
   <div className="studio-wordmark"><b>YNOT</b> <span>/ STUDIO</span><small>THE INTERIORS EDIT</small></div>
   <Link className="studio-project-trigger" href="/worlds" aria-label="Explore YNOT Worlds"><span>WORLDs</span></Link>
  </header>
  <nav className="studio-bubble-browser" aria-label="Studio categories and collections">
   <div className="studio-bubble-heading">
    {navStep!=="categories"?<button className="studio-bubble-back" type="button" onClick={backLevel} aria-label="Back to previous categories"><ArrowLeft size={15}/></button>:null}
    <span>{navStep==="categories"?"EXPLORE COLLECTIONS":navStep==="types"?category.toUpperCase()+" / TYPES":subtype.replaceAll("-"," ").toUpperCase()+" / BRANDS"}</span>
    {navStep!=="categories"&&<button className="studio-bubble-reset" type="button" onClick={()=>{setCategory("all");setSubtype("");setBrand("");setNavStep("categories");setIndex(0)}}>All</button>}
   </div>
   <div className="studio-bubble-scroll">
    {displayBubbles.map(option=><button type="button" key={option.key} className={`studio-bubble-choice ${navStep==="brands"&&brand===option.key?"selected":""}`} onClick={()=>onBubbleSelect(option.key)} aria-label={option.label+" · "+option.products.length+" pieces"}>
      <span className="studio-bubble-photo">{option.products[0]?.image?<img src={option.products[0].image} alt="" loading="lazy"/>:<span>Y</span>}</span>
      <span className="studio-bubble-label">{option.label}</span>
    </button>)}
    {navStep==="brands"&&brand&&<button type="button" className="studio-bubble-choice" onClick={()=>{setBrand("");setIndex(0)}}><span className="studio-bubble-photo studio-bubble-all">✦</span><span className="studio-bubble-label">All brands</span></button>}
   </div>
  </nav>
  <div className="studio-counter" aria-live="off"><span>{String(currentIndex+1).padStart(3,"0")}</span><em> / {String(items.length).padStart(3,"0")}</em></div>
  <div className="studio-zip-wrap">
  
   <div className={`studio-zip ${scrubbing?"active":""}`} ref={zipper} role="slider" aria-label="Zipper: scrub through products" aria-valuemin={1} aria-valuemax={items.length} aria-valuenow={currentIndex+1} tabIndex={0} onPointerDown={onZipperDown} onPointerMove={onZipperMove} onPointerUp={onZipperUp} onPointerCancel={onZipperUp} onKeyDown={e=>{if(e.key==="ArrowDown"||e.key==="ArrowRight"){e.preventDefault();setSafeIndex(currentIndex+1)}else if(e.key==="ArrowUp"||e.key==="ArrowLeft"){e.preventDefault();setSafeIndex(currentIndex-1)}else if(e.key==="Home"){e.preventDefault();setSafeIndex(0)}else if(e.key==="End"){e.preventDefault();setSafeIndex(items.length-1)}}}>
    <span className="studio-zip-track"/><span className="studio-zip-fill" style={{height:`${progress*100}%`}}/>

    <span className="studio-zip-handle" style={{top:`${progress*100}%`}}><span className="studio-zip-bubble">{currentIndex+1}</span></span>
   </div>
   <button aria-label="Next product" className="studio-next-arrow" onClick={()=>setSafeIndex(currentIndex+1)}><ChevronDown size={21}/></button>
  </div>
  <div className="studio-bottom">
   <div className="studio-kind"><span>YNOT CURATED / {current.category.toUpperCase()}</span><span className="studio-kind-line"/></div>
   <div className="studio-text">
    <p className="studio-brand">{current.brand||"Independent designer"}</p>
    <h1>{current.title}</h1>
    <p className="studio-description">{describe(current)}</p>
    <div className="studio-price">{money(current.price)} <span>Indicative YNOT catalogue price · delivery and availability to confirm</span></div>
   </div>
   <div className="studio-actions">
    <button className={saved.includes(current.id)?"is-saved":""} onClick={save}><Bookmark size={19} fill={saved.includes(current.id)?"currentColor":"none"}/><span>{saved.includes(current.id)?"Saved":"Save"}</span></button>
    <Link href={masonryHref} onClick={()=>{try{sessionStorage.setItem("ynot-studio-product:"+current.id,JSON.stringify(current))}catch{}}}><ArrowUpRight size={19}/><span>Product details</span></Link>
    <button onClick={share} aria-label="Share current product"><Share2 size={18}/><span>Share</span></button>
   </div>
   <div className="studio-hint"><span>SWIPE UP TO DISCOVER · {catalog.length} PIECES{hasMore?"+":""}</span><ChevronUp size={15}/>{loadingMore&&<span>Finding more…</span>}{loadError&&<button className="studio-retry" onClick={()=>void loadMore()}>Retry loading</button>}</div>
  </div>
  {toast&&<div className="studio-toast" role="status"><Check size={16}/>{toast}</div>}

 </main>
}
