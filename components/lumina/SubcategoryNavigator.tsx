"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Sparkles } from "lucide-react";

type CatalogProduct={id:string;title:string;brand?:string;tags?:string[];source?:string;price?:number|null};
type CatalogResponse={products?:CatalogProduct[];error?:string};
type SourceMode="shopify"|"amazon"|"all";

type BranchMap=Record<string,string[]>;

const ROOT_BRANCHES:Record<string,string[]>={
  fashion:["Dresses","Tops","Bottoms","Shoes","Bags","Accessories","Activewear","Outerwear"],
  fitness:["Activewear","Strength","Running","Recovery","Gym Accessories","Training Shoes","Yoga","Mobility"],
  skin:["Skincare","Serums","Moisturizers","Cleansers","SPF","Sensitive Skin","Tools","Body Care"],
  hair:["Shampoo","Conditioner","Repair","Scalp Care","Styling","Hair Tools","Volume","Curl Care"],
  home:["Furniture","Lighting","Decor","Storage","Kitchen","Bedding","Smart Home","Bathroom"],
  tech:["Phones","Audio","Wearables","Gaming","Smart Home","Desk Setup","Accessories","Portable Tech"],
  retail:["Trending","Best Value","New Arrivals","Popular","Premium","Under €50","Hidden Gems","Editor Picks"]
};

const BRANCHES:BranchMap={
  dresses:["Mini Dresses","Midi Dresses","Maxi Dresses","Occasion Dresses","Summer Dresses","Bodycon","Minimal","Under €100"],
  "mini dresses":["Black Mini","Party Mini","Casual Mini","Long Sleeve","Strapless","Fitted","Under €50","Premium"],
  "midi dresses":["Slip Midi","A-Line","Bodycon Midi","Wedding Guest","Workwear","Minimal","Under €100","Premium"],
  "maxi dresses":["Evening Maxi","Summer Maxi","Flowy","Satin","Long Sleeve","Wedding Guest","Under €120","Premium"],
  tops:["T-Shirts","Blouses","Shirts","Knitwear","Crop Tops","Tank Tops","Long Sleeve","Premium Basics"],
  bottoms:["Jeans","Trousers","Skirts","Shorts","Leggings","Cargo","Wide Leg","Tailored"],
  shoes:["Sneakers","Running Shoes","Heels","Boots","Sandals","Loafers","Training Shoes","Under €100"],
  bags:["Handbags","Shoulder Bags","Crossbody","Totes","Backpacks","Clutches","Travel Bags","Under €100"],
  accessories:["Jewelry","Sunglasses","Belts","Hats","Watches","Phone Accessories","Hair Accessories","Under €50"],
  activewear:["Leggings","Sports Bras","Training Tops","Gym Shorts","Running","Yoga","Sets","Recovery"],
  skincare:["Serums","Moisturizers","Cleansers","SPF","Acne Care","Sensitive Skin","Glow","Anti-Aging"],
  serums:["Vitamin C","Niacinamide","Hyaluronic Acid","Retinol","Barrier Repair","Brightening","Sensitive","Under €40"],
  moisturizers:["Gel Creams","Barrier Creams","Lightweight","Dry Skin","Sensitive","SPF Moisturizer","Night Cream","Under €40"],
  "scalp care":["Scalp Serums","Scalp Oils","Dandruff Care","Density","Dry Scalp","Massagers","Clarifying","Under €40"],
  styling:["Hair Dryers","Straighteners","Curlers","Styling Creams","Heat Protectant","Volume","Texture","Under €80"],
  furniture:["Sofas","Chairs","Tables","Shelving","Bedroom","Office","Small Spaces","Premium"],
  lighting:["Table Lamps","Floor Lamps","Pendant Lights","Desk Lamps","Smart Lighting","Ambient","Minimal","Under €100"],
  decor:["Wall Art","Mirrors","Vases","Candles","Rugs","Cushions","Minimal","Under €50"],
  audio:["Headphones","Earbuds","Speakers","Soundbars","Gaming Audio","Portable Audio","Under €100","Premium"],
  phones:["Phone Accessories","Chargers","Cases","Power Banks","Stands","Cables","MagSafe","Under €50"],
  wearables:["Smartwatches","Fitness Trackers","Smart Rings","Watch Bands","Health Tech","Running","Under €150","Premium"],
  running:["Running Shoes","Running Tops","Shorts","Hydration","GPS Watches","Recovery","Accessories","Under €100"],
  strength:["Dumbbells","Resistance Bands","Benches","Grips","Belts","Home Gym","Recovery","Under €100"],
  recovery:["Massage Guns","Foam Rollers","Mobility","Compression","Ice & Heat","Sleep","Stretching","Under €80"]
};

const GENERIC_DEEP=["Best Value","Premium","New Arrivals","Popular","Minimal","Lightweight","Under €50","Top Rated"];
const BAD_TAG=/^(shopify|amazon|ebay|prime|buy now|highly rated seller|live result|best value)$/i;

function cleanTag(value:string){return String(value||"").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,"").replace(/\s+/g," ").trim()}
function rootKeyFromClass(el:Element|null){if(!el)return"retail";for(const key of Object.keys(ROOT_BRANCHES)){if(el.classList.contains(`cat-${key}`))return key}return"retail"}
function currentSource():SourceMode{const text=document.querySelector(".lv4-source-trigger b")?.textContent?.toLowerCase()||"shopify";if(text.includes("amazon"))return"amazon";if(text.includes("all"))return"all";return"shopify"}
function currentMarket(){return document.querySelector(".lv4-market-toggle button.ebay.active")?"ebay":"lumina"}
function setReactInput(input:HTMLInputElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}))}
function sendMainSearch(query:string){const input=document.querySelector(".lv4-search input") as HTMLInputElement|null;if(!input)return;setReactInput(input,query);requestAnimationFrame(()=>{const button=document.querySelector(".lv4-search button") as HTMLButtonElement|null;button?.click()})}
function unique(values:string[]){const seen=new Set<string>();return values.filter(value=>{const k=value.toLowerCase();if(!value||seen.has(k))return false;seen.add(k);return true})}
function suggestedFromProducts(products:CatalogProduct[],used:string[]){const counts=new Map<string,number>();for(const product of products){for(const raw of product.tags||[]){const tag=cleanTag(raw);if(!tag||BAD_TAG.test(tag)||tag.length>28||used.some(u=>u.toLowerCase()===tag.toLowerCase()))continue;counts.set(tag,(counts.get(tag)||0)+1)}}return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([tag])=>tag)}

export default function SubcategoryNavigator(){
  const [root,setRoot]=useState("retail");
  const [path,setPath]=useState<string[]>([]);
  const [suggestions,setSuggestions]=useState<string[]>(ROOT_BRANCHES.retail);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [visible,setVisible]=useState(false);
  const requestRef=useRef(0);
  const abortRef=useRef<AbortController|null>(null);

  const queryBase=useMemo(()=>{const category=ROOT_BRANCHES[root]?root:"retail";return [category==="skin"?"beauty":category,...path].join(" ")},[root,path]);

  const loadBranch=useCallback(async(nextPath:string[],rootOverride=root)=>{
    const request=++requestRef.current;abortRef.current?.abort();const controller=new AbortController();abortRef.current=controller;
    const source=currentSource(),market=currentMarket();const base=[rootOverride==="skin"?"beauty":rootOverride,...nextPath].join(" ");
    setLoading(true);setError("");
    const last=nextPath[nextPath.length-1]?.toLowerCase()||"";
    const seeded=BRANCHES[last]||ROOT_BRANCHES[rootOverride]||GENERIC_DEEP;
    setSuggestions(prev=>prev.length?prev:seeded);
    try{
      const params=new URLSearchParams({q:base,market,source,page:"0"});
      const response=await fetch(`/api/catalog?${params}`,{signal:controller.signal});
      const data:CatalogResponse=await response.json();
      if(request!==requestRef.current)return;
      const dynamic=suggestedFromProducts(data.products||[],nextPath);
      const next=unique([...(BRANCHES[last]||[]),...dynamic,...GENERIC_DEEP]).filter(label=>!nextPath.some(p=>p.toLowerCase()===label.toLowerCase())).slice(0,8);
      setSuggestions(next.length?next:seeded.slice(0,8));
      setError(data.error&&!data.products?.length?"Still searching this branch…":"");
      // Warm the shared catalog first, then hand the same query to the main world. The second request is normally cache-hot.
      sendMainSearch(base);
    }catch(e){if((e as Error)?.name!=="AbortError"){setSuggestions(seeded.slice(0,8));setError("Keeping this branch open while results arrive…");sendMainSearch(base)}}finally{if(request===requestRef.current)setLoading(false)}
  },[root]);

  function choose(label:string){const next=[...path,label];setPath(next);setVisible(true);setSuggestions((BRANCHES[label.toLowerCase()]||GENERIC_DEEP).slice(0,8));void loadBranch(next)}
  function back(){if(path.length<=1){setPath([]);setSuggestions(ROOT_BRANCHES[root]||ROOT_BRANCHES.retail);sendMainSearch(root==="skin"?"beauty":root);return}const next=path.slice(0,-1);setPath(next);setSuggestions((BRANCHES[next[next.length-1].toLowerCase()]||ROOT_BRANCHES[root]||GENERIC_DEEP).slice(0,8));void loadBranch(next)}

  useEffect(()=>{
    const capture=(event:MouseEvent)=>{
      const target=event.target as HTMLElement|null;
      const category=target?.closest(".lv4-category-bubble");
      if(category){const key=rootKeyFromClass(category);setRoot(key);setPath([]);setSuggestions(ROOT_BRANCHES[key]||ROOT_BRANCHES.retail);setVisible(true);return}
      const branch=target?.closest(".lv4-textbubble,.lv4-zone-detail-cluster button") as HTMLElement|null;
      if(!branch)return;
      const label=cleanTag(branch.textContent||"");if(!label)return;
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      choose(label);
    };
    document.addEventListener("click",capture,true);
    return()=>{document.removeEventListener("click",capture,true);abortRef.current?.abort()};
  },[path,root,loadBranch]);

  if(!visible)return null;
  return <div className="ynot-subcat" aria-live="polite">
    <div className="ynot-subcat-head">
      <button className="ynot-subcat-back" onClick={back} disabled={!path.length} aria-label="Previous category"><ChevronLeft/></button>
      <div><small>{path.length?`LEVEL ${path.length+1}`:"EXPLORE DEEPER"}</small><b>{path[path.length-1]||root}</b><span>{loading?"Finding the next branches…":error||"Choose a bubble to go deeper"}</span></div>
      <Sparkles className={loading?"is-loading":""}/>
    </div>
    <div className="ynot-subcat-bubbles">
      {suggestions.map((label,index)=><button key={`${queryBase}-${label}-${index}`} onClick={()=>choose(label)} style={{"--i":index} as React.CSSProperties}>{label}</button>)}
    </div>
  </div>
}
