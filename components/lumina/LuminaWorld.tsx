"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {createPortal} from "react-dom";
import { Search, X, Heart, ExternalLink, Sparkles, RotateCcw, Compass, Home, Bookmark, ScanFace, ChevronDown, SlidersHorizontal, ShoppingBag, Users } from "lucide-react";
import VoiceSearchOrb from "./VoiceSearchOrb";
import ProductMediaSurface from "./ProductMediaSurface";

type Variant={id:string;label:string;price:number|null;currency?:string;image?:string;url?:string;available:boolean};
type Product={id:string;variantId?:string;title:string;brand:string;price:number|null;currency?:string;image:string;images?:string[];url?:string;tags?:string[];source?:string;variants?:Variant[];description?:string;supplierPrice?:number;retailPrice?:number;pricingMode?:string;checkout?:{mode:"ynot"|"merchant";reason:string};x?:number;y?:number;z?:number;zone?:number;fresh?:boolean;contextual?:boolean};
type CatalogPage={products?:Product[];source?:string;sources?:string[];pagination?:Record<string,unknown>;market?:"lumina"|"ebay";luminaSource?:"all"|"shopify"|"amazon";error?:string};
type Scene={a:string;b:string;c:string;image:string;query:string;labels:string[]};
type Category={key:string;label:string;query:string;subtitle:string};
type MarketMode="lumina"|"ebay";
type LuminaSource="all"|"shopify"|"amazon";

const WORLD_W=200000,WORLD_H=200000,WORLD_CX=WORLD_W/2,WORLD_CY=WORLD_H/2,ZONE_STEP=980,PRODUCTS_PER_ZONE=40,PRODUCTS_PER_RING=10,RING_UNIT=108;
const START_ZOOM=.22;
const MIN_ZOOM=.015;
const INITIAL_ROWS=18;
const PRODUCTS_PER_VISIBLE_ROW=10;
const INITIAL_PRODUCT_TARGET=INITIAL_ROWS*PRODUCTS_PER_VISIBLE_ROW;
const SHOPIFY_WARM_TARGET=420;
const DISCOVERY_WAVES=["more like this","new arrivals","best value","more premium","same shape","top rated","unexpected picks","editor picks","alternative styles","hidden gems","popular choices","fresh finds"];
const SOURCE_OPTIONS:{key:LuminaSource;label:string;note:string}[]=[
 {key:"shopify",label:"Shopify",note:"Independent stores"},
 {key:"amazon",label:"Amazon",note:"Broad marketplace catalog"},
 {key:"all",label:"All sources",note:"Organized by source"}
];
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
function productSize(p:Product){const variation=1.08+(hash(p.id||p.title)%19)/100,depth=1+(p.z||0)*.04,context=p.contextual?.94:1;return Math.round(112*variation*depth*context)}
function cleanTitle(s:string){return String(s||"").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,"").replace(/\s{2,}/g," ").replace(/^\s*[|·—–-]+\s*|\s*[|·—–-]+\s*$/g,"").trim()}
function dedupe(list:Product[]){const seen=new Set<string>();return list.filter(p=>{const k=p.id||`${p.title}|${p.brand}`;if(seen.has(k))return false;seen.add(k);return true})}
function productSource(p:Product){const s=(p.source||"").toLowerCase();if(s.includes("amazon"))return"amazon";if(s.includes("shopify"))return"shopify";if(s.includes("ebay"))return"ebay";return"store"}
function sourceKind(p:Product){const source=productSource(p);if(source==="amazon"||source==="ebay")return"YNOT · Marketplace";if(source==="shopify")return"YNOT · Commerce";return"YNOT · Commerce"}
function sourceShort(p:Product){const source=productSource(p);if(source==="amazon")return"Amazon";if(source==="shopify")return"Shopify";if(source==="ebay")return"eBay";return"Store"}
function checkoutCopy(p:Product){const source=sourceShort(p);return source==="Store"?"Checkout securely with the seller":`Checkout securely on ${source}`}
const DETAIL_WORDS=["wireless","leather","cotton","linen","silk","waterproof","portable","minimal","vintage","organic","recycled","black","white","blue","small","large","premium","lightweight","smart","adjustable","sensitive","repair","running","casual"];
const MATERIAL_WORDS=["cotton","organic cotton","fleece","french terry","wool","merino","linen","denim","nylon","polyester","silk","leather","suede","cashmere","viscose","rayon","spandex","elastane","jersey","ribbed","knit","knitted","boucle","velvet","oak","walnut","marble","glass","metal","ceramic"];
const TYPE_WORDS=["hoodie","jogger","joggers","sweatpants","t-shirt","tee","shirt","sweater","knitwear","jacket","overshirt","trousers","pants","cargo","jeans","dress","skirt","shorts","leggings","shoe","shoes","sneaker","bag","sofa","chair","table","lamp","rug","serum","cleanser","cream","mask","shampoo","conditioner","headphones","speaker","charger"];
function variantAttributeText(p:Product){
 const colours=new Set(COLOURS);
 const sizePattern=/^(?:xxxs|xxs|xs|s|m|l|xl|xxl|xxxl|[0-9]{1,3}(?:\.[05])?|[0-9]{1,2}\s*(?:uk|us|eu)|[0-9]{2,3}\s*(?:cm|mm|in|inch|inches))$/i;
 const weightPattern=/\b\d+(?:\.\d+)?\s*(?:g|kg|gsm|oz|lb|lbs)\b/i;
 const optionCue=/\b(?:color|colour|size|weight|waist|length|inseam)\b/i;
 const values=(p.variants||[]).flatMap(v=>cleanTitle(v.label).split(/[·|,/]/).map(x=>x.trim()).filter(Boolean));
 return [...new Set(values.filter(value=>{
  const lower=value.toLowerCase();
  return colours.has(lower)||sizePattern.test(value)||weightPattern.test(value)||optionCue.test(value);
 }))].join(" ");
}
function productSemanticText(p:Product){return `${p.description||""} ${cleanTitle(p.title)} ${variantAttributeText(p)}`.toLowerCase()}
function semanticAttributes(p:Product){
 const text=productSemanticText(p);
 const colours=COLOURS.filter(x=>text.includes(x));
 const materials=MATERIAL_WORDS.filter(x=>text.includes(x));
 const types=TYPE_WORDS.filter(x=>text.includes(x));
 const shapes=SHAPES.filter(s=>s.words.some(w=>text.includes(w))).map(s=>s.label.toLowerCase());
 return{colours,materials,types,shapes};
}
const COLOURS=["black","white","blue","red","green","brown","beige","pink","purple","orange","yellow","grey","silver","gold"];
const SHAPES:{label:string;words:string[]}[]=[{label:"Round",words:["round","circle","orb"]},{label:"Slim",words:["slim","narrow","skinny","column"]},{label:"Oversized",words:["oversized","wide","maxi","large"]},{label:"Compact",words:["compact","mini","small","portable"]},{label:"Structured",words:["structured","boxy","square","tailored"]},{label:"Soft",words:["soft","draped","relaxed","flowy"]}];
function productDetails(p:Product){const text=productSemanticText(p);return DETAIL_WORDS.filter(word=>text.includes(word)).map(cleanTitle).filter(Boolean)}
function selectableVariants(p:Product){const seen=new Set<string>(),list=(p.variants||[]).filter(v=>{const label=cleanTitle(v.label).toLowerCase();if(!v.id||v.available===false||!label||seen.has(label))return false;seen.add(label);return true});if(list.length>1)return list;if(!list.length)return[];const label=cleanTitle(list[0].label).toLowerCase(),title=cleanTitle(p.title).toLowerCase();return label&&label!==title&&!/^default(?: title)?$|^option$/.test(label)?list:[]}
function productText(p:Product){return productSemanticText(p)}
function sourceName(source:LuminaSource){return source==="all"?"All sources":source==="amazon"?"Amazon":"Shopify"}
function shopperCountry(){try{const saved=JSON.parse(localStorage.getItem("ynot-region")||"null") as {country?:string}|null;return String(saved?.country||"FR").toUpperCase().slice(0,2)}catch{return"FR"}}
function zoneCenter(zone:number,offsetX=0){
 if(zone<=0)return{x:WORLD_CX+offsetX,y:WORLD_CY};
 const angle=zone*2.399963229728653;
 const radius=ZONE_STEP*Math.sqrt(zone);
 return{x:WORLD_CX+offsetX+Math.cos(angle)*radius,y:WORLD_CY+Math.sin(angle)*radius};
}

function protectedBubbleZones(){
 const zones:{x:number;y:number;r:number}[]=[{x:WORLD_CX,y:WORLD_CY,r:190}];
 for(let i=0;i<6;i++){
  const a=i/6*Math.PI*2-.52;
  zones.push({x:WORLD_CX+Math.cos(a)*3.25*RING_UNIT,y:WORLD_CY+Math.sin(a)*2.10*RING_UNIT,r:152});
 }
 return zones;
}
const PROTECTED_BUBBLES=protectedBubbleZones();
function keepClearOfBigBubbles(x:number,y:number,seed:number){let px=x,py=y;for(let pass=0;pass<4;pass++){for(const z of PROTECTED_BUBBLES){let dx=px-z.x,dy=py-z.y,d=Math.hypot(dx,dy);if(d>=z.r)continue;if(d<1){const a=(seed%360)*Math.PI/180;dx=Math.cos(a);dy=Math.sin(a);d=1}const extra=18+(seed%24),scale=(z.r+extra)/d;px=z.x+dx*scale;py=z.y+dy*scale}}return{x:px,y:py}}
function placeProduct(p:Product,index:number,fresh=false,offsetX=0){
 const zone=Math.floor(index/PRODUCTS_PER_ZONE),local=index%PRODUCTS_PER_ZONE,center=zoneCenter(zone,offsetX);
 const ringIndex=Math.floor(local/PRODUCTS_PER_RING),slot=local%PRODUCTS_PER_RING;
 const ring=(2.45+ringIndex*1.65)*RING_UNIT;
 const angle=-Math.PI/2+slot/PRODUCTS_PER_RING*Math.PI*2+(ringIndex%2?.34:0);
 const rawX=center.x+Math.cos(angle)*ring,rawY=center.y+Math.sin(angle)*ring;
 return{...p,title:cleanTitle(p.title),zone,fresh,x:rawX,y:rawY,z:[-.3,0,.3][local%3]};
}
function clearOfProducts(candidate:Product,placed:Product[]){const x=candidate.x||0,y=candidate.y||0,r=productSize(candidate)/2;return placed.every(other=>Math.hypot(x-(other.x||0),y-(other.y||0))>=r+productSize(other)/2+18)}
function settleProduct(candidate:Product,placed:Product[]){if(clearOfProducts(candidate,placed))return candidate;const baseX=candidate.x||0,baseY=candidate.y||0,seed=hash(candidate.id||candidate.title),golden=2.399963229728653;for(let attempt=1;attempt<=220;attempt++){const distance=24*Math.sqrt(attempt),angle=seed*.0174533+attempt*golden;const next={...candidate,x:baseX+Math.cos(angle)*distance,y:baseY+Math.sin(angle)*distance};if(clearOfProducts(next,placed))return next}return candidate}
function layoutProducts(list:Product[],freshFrom=Number.POSITIVE_INFINITY,splitSources=false){let shopifyIndex=0,amazonIndex=0,otherIndex=0;const placed:Product[]=[];for(let i=0;i<list.length;i++){const p=list[i],source=productSource(p);let local=i,offset=0;if(splitSources){if(source==="shopify"){local=shopifyIndex++;offset=-980}else if(source==="amazon"){local=amazonIndex++;offset=980}else{local=otherIndex++}}placed.push(settleProduct(placeProduct(p,local,i>=freshFrom,offset),placed))}return placed}
function appendProductLayout(previous:Product[],incoming:Product[],splitSources=false){const known=new Set(previous.map(p=>p.id||`${p.title}|${p.brand}`)),placed=[...previous];let shopifyIndex=previous.filter(p=>productSource(p)==="shopify").length,amazonIndex=previous.filter(p=>productSource(p)==="amazon").length,otherIndex=previous.length-shopifyIndex-amazonIndex;for(const p of incoming){const key=p.id||`${p.title}|${p.brand}`;if(known.has(key))continue;known.add(key);const source=productSource(p);let local=placed.length,offset=0;if(splitSources){if(source==="shopify"){local=shopifyIndex++;offset=-980}else if(source==="amazon"){local=amazonIndex++;offset=980}else{local=otherIndex++}}placed.push(settleProduct(placeProduct(p,local,true,offset),placed))}return placed}

function placeholderBubble(index:number){
 const zone=Math.floor(index/PRODUCTS_PER_ZONE),local=index%PRODUCTS_PER_ZONE,center=zoneCenter(zone);
 const ringIndex=Math.floor(local/PRODUCTS_PER_RING),slot=local%PRODUCTS_PER_RING;
 const ring=(2.15+ringIndex*1.42)*RING_UNIT;
 const angle=-Math.PI/2+slot/PRODUCTS_PER_RING*Math.PI*2+(ringIndex%2?.28:0);
 return{x:center.x+Math.cos(angle)*ring,y:center.y+Math.sin(angle)*ring,size:92+(index%7)*7};
}

export default function LuminaWorld(){
 const [query,setQuery]=useState("");
 const [submitted,setSubmitted]=useState("");
 const [categoryKey,setCategoryKey]=useState("retail");
 const [focus,setFocus]=useState("");
 const [products,setProducts]=useState<Product[]>([]);
 const [selected,setSelected]=useState<Product|null>(null);
 const [suggestionsOpen,setSuggestionsOpen]=useState(false);
 const [visualSimilar,setVisualSimilar]=useState<Product[]>([]);
 const [visualSimilarLoading,setVisualSimilarLoading]=useState(false);
 const [checkoutBusy,setCheckoutBusy]=useState(false),[checkoutError,setCheckoutError]=useState("");
 const [hovered,setHovered]=useState<Product|null>(null);
 const [liked,setLiked]=useState<Set<string>>(new Set());
 const [background,setBackground]=useState(""),[backgroundCredit,setBackgroundCredit]=useState<{name:string;url:string}|null>(null);
 const [zoom,setZoom]=useState(START_ZOOM);
 const [pan,setPan]=useState({x:-WORLD_CX*START_ZOOM,y:-WORLD_CY*START_ZOOM});
 const [loading,setLoading]=useState(false),[loadingMore,setLoadingMore]=useState(false);
 const [mobileNav,setMobileNav]=useState(false);
 const [market,setMarket]=useState<MarketMode>("lumina");
 const [luminaSource,setLuminaSource]=useState<LuminaSource>("shopify");
 const [sourceOpen,setSourceOpen]=useState(false);
 const [refineOpen,setRefineOpen]=useState(false);
 const [sortMode,setSortMode]=useState<"discovery"|"price-asc"|"price-desc"|"similar">("discovery"),[colourFilter,setColourFilter]=useState(""),[shapeFilter,setShapeFilter]=useState("");
 const [marketError,setMarketError]=useState("");
 const pointersRef=useRef(new Map<number,{x:number;y:number}>());
 const pinchRef=useRef<{distance:number;zoom:number;stageX:number;stageY:number}|null>(null);
 const dragRef=useRef({drag:false,px:0,py:0,lastX:0,lastY:0,startX:0,startY:0});
 const loadingRef=useRef(false),waveRef=useRef(0),lastExpandRef=useRef(0),replaceRequestRef=useRef(0),shopifyCursorRef=useRef(""),shopifyPageDirectionRef=useRef("");
 const deepProductRef=useRef("");
 const gallerySwitchRef=useRef(0);
 const wheelFrameRef=useRef<number|null>(null),wheelTargetRef=useRef<{x:number;y:number;zoom:number}|null>(null);
 const overviewRef=useRef(false),overviewFrameRef=useRef<number|null>(null);
 const [shopifyFetchSerial,setShopifyFetchSerial]=useState(0);
 const scene=SCENES[categoryKey]||SCENES.retail;
 useEffect(()=>{let alive=true;const term=(submitted||scene.query).trim();setBackground("");setBackgroundCredit(null);const timer=window.setTimeout(()=>fetch(`/api/background?q=${encodeURIComponent(term)}&market=${market}`).then(r=>r.json()).then(data=>{if(alive&&data.image){setBackground(data.image);setBackgroundCredit(data.credit||null)}}).catch(()=>{}),250);return()=>{alive=false;window.clearTimeout(timer)}},[submitted,scene.query,market]);
 useEffect(()=>{const refresh=()=>{try{const saved=JSON.parse(localStorage.getItem("ynot-saved-items")||"[]") as Product[];setLiked(new Set(Array.isArray(saved)?saved.map(item=>String(item.id)):[]))}catch{setLiked(new Set())}};refresh();window.addEventListener("ynot:saves-changed",refresh);return()=>window.removeEventListener("ynot:saves-changed",refresh)},[]);
 useEffect(()=>{const fitOverview=()=>{let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,count=0;for(const product of products){const x=Number(product.x),y=Number(product.y);if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>WORLD_W*2||Math.abs(y)>WORLD_H*2)continue;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);count+=1}if(!count){centerWorld(.34);return}const padding=260,width=Math.max(1,maxX-minX+padding*2),height=Math.max(1,maxY-minY+padding*2),viewportW=Math.max(320,window.innerWidth-100),viewportH=Math.max(320,window.innerHeight-130),fit=Math.min(viewportW/width,viewportH/height,.5),next=Number.isFinite(fit)?Math.max(MIN_ZOOM,fit):MIN_ZOOM,centerX=(minX+maxX)/2,centerY=(minY+maxY)/2;if(!Number.isFinite(centerX)||!Number.isFinite(centerY))return;if(overviewFrameRef.current!=null)window.cancelAnimationFrame(overviewFrameRef.current);overviewFrameRef.current=window.requestAnimationFrame(()=>{overviewFrameRef.current=null;if(!overviewRef.current)return;setZoom(next);setPan({x:-centerX*next,y:-centerY*next})})};const change=(event:Event)=>{const far=Boolean((event as CustomEvent<{far?:boolean}>).detail?.far);overviewRef.current=far;if(!far){if(overviewFrameRef.current!=null)window.cancelAnimationFrame(overviewFrameRef.current);overviewFrameRef.current=null;centerWorld(submitted?.78:START_ZOOM);return}fitOverview()};window.addEventListener("ynot:set-world-overview",change as EventListener);if(overviewRef.current)fitOverview();return()=>{window.removeEventListener("ynot:set-world-overview",change as EventListener);if(overviewFrameRef.current!=null)window.cancelAnimationFrame(overviewFrameRef.current)}},[products,submitted]);

 const fetchProducts=useCallback(async(base:string,direction="",append=false,marketOverride:MarketMode=market,page=0,sourceOverride:LuminaSource=luminaSource,promoteIncoming=false,categoryLoad=false)=>{
  if(append&&loadingRef.current)return;
  const requestId=append?0:++replaceRequestRef.current;
  loadingRef.current=true;append?setLoadingMore(true):setLoading(true);setMarketError("");
  try{
   const params=new URLSearchParams({q:base||scene.query,market:marketOverride,page:String(Math.max(0,page)),country:shopperCountry()});if(categoryLoad)params.set("category_load","1");
   if(direction)params.set("direction",direction);
   if(marketOverride==="lumina"){
    params.set("source",sourceOverride);
    if(append&&sourceOverride!=="amazon"&&shopifyCursorRef.current)params.set("cursor",shopifyCursorRef.current);
   }
   const r=await fetch(`/api/catalog?${params}`);const data:CatalogPage=await r.json();const incoming=dedupe((data.products||[]).map(p=>({...p,title:cleanTitle(p.title)})));
   if(!append&&requestId!==replaceRequestRef.current)return;
   if(data.error&&!incoming.length)setMarketError(data.error);
   const nextCursor=data.pagination?.next_cursor;
   if(marketOverride==="lumina"&&sourceOverride!=="amazon"){
    shopifyCursorRef.current=typeof nextCursor==="string"?nextCursor:"";
    shopifyPageDirectionRef.current=shopifyCursorRef.current?direction:"";
   }
   const splitSources=marketOverride==="lumina"&&sourceOverride==="all";
   setProducts(prev=>promoteIncoming?layoutProducts(dedupe([...incoming.map(p=>({...p,contextual:false})),...prev.map(p=>({...p,contextual:true}))]),Number.POSITIVE_INFINITY,splitSources).map((p,index)=>({...p,fresh:index<incoming.length})):append?appendProductLayout(prev,incoming,splitSources):layoutProducts(incoming,Number.POSITIVE_INFINITY,splitSources));
   if(append&&marketOverride==="lumina"&&sourceOverride==="shopify")setShopifyFetchSerial(v=>v+1);
  }catch{
   if(!append&&requestId!==replaceRequestRef.current)return;
   setMarketError(marketOverride==="ebay"?"eBay Marketplace is temporarily unavailable":"YNOT is temporarily unavailable");
  }finally{
   if(append||requestId===replaceRequestRef.current){loadingRef.current=false;setLoading(false);setLoadingMore(false)}
  }
 },[scene.query,market,luminaSource]);
 useEffect(()=>{
  const onCatalogSource=(event:Event)=>{
   const requested=String((event as CustomEvent<{source?:string}>).detail?.source||"shopify").toLowerCase();
   const term=(submitted||query.trim()||scene.query).trim();
   setSelected(null);setSuggestionsOpen(false);setHovered(null);setProducts([]);setMarketError("");resetPaging();centerWorld(.95);
   if(requested==="ebay"){
    setMarket("ebay");
    window.setTimeout(()=>void fetchProducts(term,"",false,"ebay",0,luminaSource),0);
    return;
   }
   setMarket("lumina");
   setLuminaSource("shopify");
   // EtsyCatalogBridge observes the same event and swaps the /api/catalog response
   // before this deferred fetch runs.
   window.setTimeout(()=>void fetchProducts(term,"",false,"lumina",0,"shopify"),0);
  };
  window.addEventListener("ynot:catalog-source",onCatalogSource as EventListener);
  return()=>window.removeEventListener("ynot:catalog-source",onCatalogSource as EventListener);
 },[submitted,query,scene.query,fetchProducts,luminaSource]);


 function centerWorld(z:number){setZoom(z);setPan({x:-WORLD_CX*z,y:-WORLD_CY*z})}
 function resetPaging(){waveRef.current=0;shopifyCursorRef.current="";shopifyPageDirectionRef.current="";deepProductRef.current=""}
 function chooseCategory(key:string){window.dispatchEvent(new Event("ynot:world-active"));const c=CATEGORIES.find(x=>x.key===key)||CATEGORIES[CATEGORIES.length-1];setCategoryKey(c.key);setSubmitted(c.query);setQuery("");setFocus("");setSelected(null);setSuggestionsOpen(false);setHovered(null);setSortMode("discovery");setColourFilter("");setShapeFilter("");setProducts([]);setMarketError("");resetPaging();centerWorld(.93);void fetchProducts(c.query,"",false,market,0,luminaSource,false,true)}
 function submit(){const q=query.trim();if(!q)return;window.dispatchEvent(new Event("ynot:world-active"));setSubmitted(q);setFocus("");setSelected(null);setSuggestionsOpen(false);setHovered(null);setSortMode("discovery");setColourFilter("");setShapeFilter("");setCategoryKey("retail");setProducts([]);setMarketError("");resetPaging();centerWorld(.82);void fetchProducts(q,"",false,market,0,luminaSource)}
 function branch(direction:string){if(!submitted&&!scene.query)return;setFocus(direction);setSelected(null);setZoom(z=>Math.max(1.08,z));resetPaging();void fetchProducts(submitted||scene.query,direction,true,market,0,luminaSource,true)}
 function resetWorld(){window.dispatchEvent(new Event("ynot:world-reset"));replaceRequestRef.current++;setSubmitted("");setQuery("");setFocus("");setSelected(null);setSuggestionsOpen(false);setHovered(null);setProducts([]);setMarketError("");resetPaging();loadingRef.current=false;centerWorld(START_ZOOM)}
 function expandWorld(){if(!submitted||loadingRef.current)return;const now=Date.now();if(now-lastExpandRef.current<110)return;lastExpandRef.current=now;const page=waveRef.current+1;waveRef.current=page;const hasShopifyCursor=market==="lumina"&&luminaSource!=="amazon"&&Boolean(shopifyCursorRef.current);const hasNativePaging=market==="ebay"||luminaSource==="amazon"||hasShopifyCursor;const discovery=DISCOVERY_WAVES[(page-1)%DISCOVERY_WAVES.length];const cue=hasShopifyCursor?shopifyPageDirectionRef.current:hasNativePaging?focus:[focus,discovery].filter(Boolean).join(", ");void fetchProducts(submitted,cue,true,market,page,luminaSource)}
 function exploreProduct(p:Product){if(!submitted||loadingRef.current||deepProductRef.current===p.id)return;deepProductRef.current=p.id;const attrs=semanticAttributes(p);const cues=[...attrs.types,...attrs.materials,...attrs.colours,...attrs.shapes].slice(0,5);const cue=[cleanTitle(p.title),...cues,"similar products"].filter(Boolean).join(", ");const sourceOverride:LuminaSource=market==="lumina"&&productSource(p)==="shopify"?"shopify":luminaSource;setFocus(cues[0]||"Similar");shopifyCursorRef.current="";shopifyPageDirectionRef.current="";const page=waveRef.current+1;waveRef.current=page;void fetchProducts(submitted,cue,true,market,page,sourceOverride,true)}
 function changeMarket(next:MarketMode){if(next===market)return;setMarket(next);setSourceOpen(false);setSelected(null);setSuggestionsOpen(false);setHovered(null);setSortMode("discovery");setColourFilter("");setShapeFilter("");setProducts([]);setMarketError("");resetPaging();if(submitted)void fetchProducts(submitted,focus,false,next,0,luminaSource)}
 function changeLuminaSource(next:LuminaSource){setSourceOpen(false);if(next===luminaSource)return;setLuminaSource(next);setSelected(null);setSuggestionsOpen(false);setHovered(null);setSortMode("discovery");setColourFilter("");setShapeFilter("");setProducts([]);setMarketError("");resetPaging();if(submitted)void fetchProducts(submitted,focus,false,"lumina",0,next)}
 function toggleSaved(product:Product){try{const parsed=JSON.parse(localStorage.getItem("ynot-saved-items")||"[]") as Product[];const items=Array.isArray(parsed)?parsed:[];const exists=items.some(item=>item.id===product.id);const next=exists?items.filter(item=>item.id!==product.id):[{...product,section:categoryKey,sections:[categoryKey],savedAt:Date.now()},...items];localStorage.setItem("ynot-saved-items",JSON.stringify(next));localStorage.setItem("ynot-saved-products",JSON.stringify(next.map(item=>item.id)));setLiked(new Set(next.map(item=>item.id)));window.dispatchEvent(new Event("ynot:saves-changed"))}catch{}}
 function zoomAround(clientX:number,clientY:number,next:number){const current=Number.isFinite(zoom)&&zoom>0?zoom:START_ZOOM,safe=Number.isFinite(next)?Math.min(2.8,Math.max(MIN_ZOOM,next)):current,stageX=(clientX-pan.x)/current,stageY=(clientY-pan.y)/current,x=clientX-stageX*safe,y=clientY-stageY*safe;if(!Number.isFinite(x)||!Number.isFinite(y))return;setZoom(safe);setPan({x,y})}
 function openProduct(product:Product){
  gallerySwitchRef.current++;
  const ownImages=[...new Set<string>([
   product.image,
   ...(product.images||[]),
   ...(product.variants||[]).map(v=>v.image||"")
  ].filter(Boolean))];
  const primary=ownImages[0]||product.image;
  setSelected({...product,image:primary,images:ownImages});
  setCheckoutError("");
 }
 function switchGalleryImage(image:string){
  if(!selected||!image||image===selected.image)return;
  const productId=selected.id,request=++gallerySwitchRef.current;
  const preloader=new Image();
  preloader.decoding="async";
  preloader.onload=()=>{
   if(request!==gallerySwitchRef.current)return;
   setSelected(product=>product&&product.id===productId?{...product,image}:product);
  };
  preloader.onerror=()=>{};
  preloader.src=image;
 }

 const labels=useMemo(()=>{const fromProducts=products.flatMap(p=>p.tags||[]).filter(Boolean);return[...new Set([focus,...scene.labels,...fromProducts])].filter(Boolean).slice(0,6)},[products,focus,scene.labels]);
 const availableColours=useMemo(()=>COLOURS.filter(colour=>products.some(p=>productText(p).includes(colour))),[products]);
 const availableShapes=useMemo(()=>SHAPES.filter(shape=>products.some(p=>shape.words.some(word=>productText(p).includes(word)))),[products]);
 const refinedProducts=useMemo(()=>{let list=products.filter(p=>(!colourFilter||productText(p).includes(colourFilter))&&(!shapeFilter||(SHAPES.find(s=>s.label===shapeFilter)?.words||[]).some(word=>productText(p).includes(word))));if(sortMode==="price-asc")list=[...list].sort((a,b)=>(a.price??Number.POSITIVE_INFINITY)-(b.price??Number.POSITIVE_INFINITY));if(sortMode==="price-desc")list=[...list].sort((a,b)=>(b.price??-1)-(a.price??-1));if(sortMode==="similar"){const target=new Set(selected?productDetails(selected):focus?[focus.toLowerCase()]:[]);list=[...list].sort((a,b)=>productDetails(b).filter(t=>target.has(t)).length-productDetails(a).filter(t=>target.has(t)).length)}if(list===products)return products;return layoutProducts(list,Number.POSITIVE_INFINITY,market==="lumina"&&luminaSource==="all")},[products,colourFilter,shapeFilter,sortMode,selected,focus,market,luminaSource]);
 const similar=useMemo(()=>{
  if(!selected)return[];
  const targetDetails=new Set(productDetails(selected).map(v=>v.toLowerCase()));
  const targetWords=new Set(cleanTitle(selected.title).toLowerCase().split(/\s+/).filter(w=>w.length>3));
  const targetAttrs=semanticAttributes(selected);
  const targetPrice=selected.price??0;
  return products
   .filter(p=>p.id!==selected.id&&p.brand!==selected.brand)
   .map(p=>{
    const details=productDetails(p).map(v=>v.toLowerCase());
    const words=cleanTitle(p.title).toLowerCase().split(/\s+/).filter(w=>w.length>3);
    const attrs=semanticAttributes(p);
    const sameType=attrs.types.filter(v=>targetAttrs.types.includes(v)).length;
    const sameMaterial=attrs.materials.filter(v=>targetAttrs.materials.includes(v)).length;
    const sameColour=attrs.colours.filter(v=>targetAttrs.colours.includes(v)).length;
    const sameShape=attrs.shapes.filter(v=>targetAttrs.shapes.includes(v)).length;
    const detailScore=details.filter(v=>targetDetails.has(v)).length*2;
    const wordScore=words.filter(v=>targetWords.has(v)).length;
    const typeScore=sameType*14;
    const materialScore=sameMaterial*10;
    const colourScore=sameColour*7;
    const shapeScore=sameShape*4;
    const categoryScore=sameType>0?3:0;
    const priceScore=targetPrice&&p.price?Math.max(0,2-Math.abs(p.price-targetPrice)/Math.max(1,targetPrice)*2):0;
    const semanticGate=(targetAttrs.types.length?sameType>0:true)&&(targetAttrs.materials.length?sameMaterial>0||sameType>0:true);
    return{p,score:typeScore+materialScore+colourScore+shapeScore+detailScore+wordScore+categoryScore+priceScore,semanticGate};
   })
   .sort((a,b)=>(Number(b.semanticGate)-Number(a.semanticGate))||b.score-a.score)
   .slice(0,18)
   .map(x=>x.p);
 },[products,selected]);
 const displayedSimilar=useMemo(()=>visualSimilar.length?visualSimilar.slice(0,6):similar.slice(0,6),[visualSimilar,similar]);
 async function loadVisualSimilar(){
  if(!selected||visualSimilarLoading)return;
  setVisualSimilarLoading(true);
  try{
   const candidates=similar.slice(0,18).map(p=>({id:p.id,title:p.title,brand:p.brand,image:p.image,price:p.price,currency:p.currency,source:p.source}));
   if(!candidates.length){setVisualSimilar([]);return}
   const response=await fetch("/api/visual-similar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reference:{id:selected.id,title:selected.title,brand:selected.brand,image:selected.image,price:selected.price,currency:selected.currency,source:selected.source},candidates})});
   const data=await response.json().catch(()=>({}));
   if(response.ok&&Array.isArray(data.ids)){
    const byId=new Map(products.map(p=>[p.id,p]));
    setVisualSimilar(data.ids.map((id:string)=>byId.get(id)).filter(Boolean).slice(0,6) as Product[]);
   }else setVisualSimilar([]);
  }catch{setVisualSimilar([])}
  finally{setVisualSimilarLoading(false)}
 }
 const zoneDetails=useMemo(()=>Array.from({length:Math.max(1,Math.ceil(refinedProducts.length/PRODUCTS_PER_ZONE))},(_,zone)=>{const counts=new Map<string,number>();refinedProducts.slice(zone*PRODUCTS_PER_ZONE,(zone+1)*PRODUCTS_PER_ZONE).flatMap(productDetails).forEach(tag=>counts.set(tag,(counts.get(tag)||0)+1));return[...counts].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([tag])=>tag)}),[refinedProducts]);
 const level=zoom<.68?"worlds":zoom<1?"themes":zoom<1.36?"products":"details";
 const displayLevel=products.length?(submitted&&level==="worlds"?"themes":level):"worlds";
 const zoneCount=Math.max(1,Math.ceil(refinedProducts.length/PRODUCTS_PER_ZONE));
 const placeholderCount=submitted?Math.max(0,Math.min(180,INITIAL_PRODUCT_TARGET-refinedProducts.length)+(loadingMore?60:0)):0;
 useEffect(()=>{setVisualSimilar([]);setSuggestionsOpen(Boolean(selected));if(selected){const t=window.setTimeout(()=>void loadVisualSimilar(),40);return()=>window.clearTimeout(t)}},[selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(level!=="details"||!products.length)return;const related=selected||hovered;if(related)exploreProduct(related);else expandWorld()},[level]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>()=>{if(wheelFrameRef.current!=null)window.cancelAnimationFrame(wheelFrameRef.current)},[]);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search),deepId=params.get("product");
  if(!deepId)return;
  deepProductRef.current=deepId;
  let cancelled=false,currentProduct:Product|null=null;
  const loadRelated=async(product:Product,country:string)=>{
   const relatedQuery=[product.title,...(product.tags||[]).slice(0,4)].filter(Boolean).join(" ");
   const relatedParams=new URLSearchParams({q:relatedQuery,market:"lumina",page:"0",country,source:"shopify"});
   try{
    const response=await fetch(`/api/catalog?${relatedParams}`,{cache:"no-store"});
    const data:CatalogPage=await response.json();
    if(cancelled)return;
    const incoming=dedupe((data.products||[]).map(p=>({...p,title:cleanTitle(p.title)}))).slice(0,140);
    setProducts(layoutProducts(dedupe([product,...incoming]),Number.POSITIVE_INFINITY,false));
    setSubmitted(product.title);
    setFocus("Similar");
   }catch{}
  };
  void fetch(`/api/commerce/product/${encodeURIComponent(deepId)}`,{cache:"no-store"})
   .then(async response=>{if(!response.ok)throw new Error("PRODUCT_NOT_FOUND");return response.json()})
   .then(data=>{
    if(cancelled||!data?.product)return;
    const product=data.product as Product;
    currentProduct=product;
    const category=params.get("category")||String((product as Product&{category?:string}).category||"");
    if(category&&SCENES[category])setCategoryKey(category);
    setHovered(product);
    setSelected(product);
    setSuggestionsOpen(true);
    setCheckoutError("");
    const country=(params.get("country")||shopperCountry()).toUpperCase().slice(0,2);
    void loadRelated(product,country);
   })
   .catch(()=>{});
  const onRegion=()=>{if(currentProduct)void loadRelated(currentProduct,shopperCountry())};
  window.addEventListener("ynot:region-changed",onRegion);
  return()=>{cancelled=true;window.removeEventListener("ynot:region-changed",onRegion)};
 },[]);

 useEffect(()=>{if(!submitted||deepProductRef.current||market!=="lumina"||luminaSource!=="shopify"||products.length>=SHOPIFY_WARM_TARGET||loadingRef.current)return;const needInitialRows=products.length<INITIAL_PRODUCT_TARGET;const canPage=Boolean(shopifyCursorRef.current);const t=window.setTimeout(()=>{if(loadingRef.current)return;const page=waveRef.current+1;waveRef.current=page;const cue=canPage?shopifyPageDirectionRef.current:DISCOVERY_WAVES[(page-1)%DISCOVERY_WAVES.length];void fetchProducts(submitted,cue,true,"lumina",page,"shopify")},needInitialRows?70:180);return()=>window.clearTimeout(t)},[submitted,market,luminaSource,products.length,shopifyFetchSerial,loading,fetchProducts]); // eslint-disable-line react-hooks/exhaustive-deps

 function pointerDown(e:React.PointerEvent<HTMLElement>){pointersRef.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointersRef.current.size===2){const p=[...pointersRef.current.values()],midX=(p[0].x+p[1].x)/2,midY=(p[0].y+p[1].y)/2;pinchRef.current={distance:Math.max(1,Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)),zoom,stageX:(midX-pan.x)/zoom,stageY:(midY-pan.y)/zoom};dragRef.current.drag=false;return}if((e.target as HTMLElement).closest("button,input,a,.lv4-detail,.lv4-source-picker"))return;dragRef.current={drag:true,px:e.clientX-pan.x,py:e.clientY-pan.y,lastX:e.clientX,lastY:e.clientY,startX:e.clientX,startY:e.clientY};(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}
 function pointerMove(e:React.PointerEvent<HTMLElement>){if(pointersRef.current.has(e.pointerId))pointersRef.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointersRef.current.size===2&&pinchRef.current){const p=[...pointersRef.current.values()],d=Math.max(1,Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)),midX=(p[0].x+p[1].x)/2,midY=(p[0].y+p[1].y)/2,next=Math.min(2.8,Math.max(MIN_ZOOM,pinchRef.current.zoom*(d/pinchRef.current.distance)));setZoom(next);setPan({x:midX-pinchRef.current.stageX*next,y:midY-pinchRef.current.stageY*next});return}if(dragRef.current.drag){const dx=(e.clientX-dragRef.current.lastX)*1.42,dy=(e.clientY-dragRef.current.lastY)*1.42;dragRef.current.lastX=e.clientX;dragRef.current.lastY=e.clientY;setPan(previous=>{const next={x:previous.x+dx,y:previous.y+dy};if(!submitted){const home={x:-WORLD_CX*zoom,y:-WORLD_CY*zoom};next.x=Math.max(home.x-1100,Math.min(home.x+1100,next.x));next.y=Math.max(home.y-900,Math.min(home.y+900,next.y))}return next});const travel=Math.hypot(e.clientX-dragRef.current.startX,e.clientY-dragRef.current.startY),verticalTravel=Math.abs(e.clientY-dragRef.current.startY),horizontalTravel=Math.abs(e.clientX-dragRef.current.startX);if(!overviewRef.current&&submitted&&(travel>52||verticalTravel>42||horizontalTravel>42))expandWorld()}}
 function pointerUp(e:React.PointerEvent<HTMLElement>){const distance=Math.hypot(e.clientX-dragRef.current.startX,e.clientY-dragRef.current.startY);const loadNext=dragRef.current.drag&&Boolean(submitted)&&distance>42;pointersRef.current.delete(e.pointerId);if(pointersRef.current.size<2)pinchRef.current=null;dragRef.current.drag=false;if(loadNext)expandWorld()}
 function wheelZoom(e:React.WheelEvent<HTMLElement>){e.preventDefault();const inward=e.deltaY<0,current=wheelTargetRef.current?.zoom??zoom;wheelTargetRef.current={x:e.clientX,y:e.clientY,zoom:Math.min(2.8,Math.max(MIN_ZOOM,current*(inward?1.075:.94)))};if(wheelFrameRef.current!=null)return;wheelFrameRef.current=window.requestAnimationFrame(()=>{const target=wheelTargetRef.current;wheelFrameRef.current=null;wheelTargetRef.current=null;if(target)zoomAround(target.x,target.y,target.zoom)})}

 const searchPlaceholder=market==="ebay"?"Search eBay Marketplace — product, style, price…":luminaSource==="amazon"?"Search Amazon — product, style, price…":luminaSource==="shopify"?"Search Shopify stores — product, style, price…":"Search YNOT — Shopify + Amazon…";
 return <main className={`lv4-shell market-${market} scene-${categoryKey} depth-${displayLevel}`} style={{"--a":scene.a,"--b":scene.b,"--c":scene.c,"--scene":`url(${background||scene.image})`} as React.CSSProperties}>
  <div className="lv4-scene"/>
  {backgroundCredit&&<a className="lv4-background-credit" href={backgroundCredit.url} target="_blank" rel="noreferrer">Photo · {backgroundCredit.name}</a>}
  <aside className={`lv4-rail ${mobileNav?"mobile-open":""}`}><button className="lv4-logo" onClick={()=>setMobileNav(false)} aria-label="YNOT home">Y</button><button onClick={resetWorld}><Home/><span>Discover</span></button><button onClick={()=>centerWorld(submitted?.78:START_ZOOM)}><Compass/><span>Worlds</span></button><button><ScanFace/><span>Try on</span></button><button onClick={()=>window.dispatchEvent(new Event("ynot:open-saves"))}><Bookmark/><span>Saved</span></button><button className="lv4-circle-link" onClick={()=>window.dispatchEvent(new Event("ynot:open-circle"))}><Users/><span>Circle</span></button><button onClick={resetWorld}><RotateCcw/><span>Reset</span></button></aside>
  <header className="lv4-search lv4-search-visible"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder={searchPlaceholder}/><button onClick={submit}>↵</button></header>
  <div className="lv4-market-toggle"><button className={market==="lumina"?"active":""} onClick={()=>changeMarket("lumina")}><b>YNOT</b><span>{market==="lumina"?sourceName(luminaSource):"Curated stores"}</span></button><button className={market==="ebay"?"active ebay":"ebay"} onClick={()=>changeMarket("ebay")}><b>eBay</b><span>Marketplace</span></button></div>
  {market==="lumina"&&<div className={`lv4-source-picker ${sourceOpen?"open":""}`}><button className="lv4-source-trigger" onClick={()=>setSourceOpen(v=>!v)} aria-expanded={sourceOpen}><span>Catalog source</span><b>{sourceName(luminaSource)}</b><ChevronDown/></button>{sourceOpen&&<div className="lv4-source-menu">{SOURCE_OPTIONS.map(option=><button key={option.key} className={luminaSource===option.key?"active":""} onClick={()=>changeLuminaSource(option.key)}><b>{option.label}</b><span>{option.note}</span></button>)}</div>}</div>}

  {(loading||marketError)&&!products.length&&<div className={`lv4-category-status ${marketError?"error":""}`}><b>{loading?"Opening category…":"Category unavailable"}</b><span>{marketError||"Finding live products"}</span>{marketError&&<button onClick={()=>void fetchProducts(submitted||scene.query,focus,false,market,0,luminaSource)}>Try again</button>}</div>}
  <section className={`lv4-world level-${displayLevel}`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={wheelZoom}>
   <div className="lv4-stage" style={{width:WORLD_W,height:WORLD_H,transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}>
    {displayLevel==="worlds"&&<><VoiceSearchOrb left={WORLD_CX} top={WORLD_CY}/>{CATEGORIES.map((c,i)=>{const a=i/CATEGORIES.length*Math.PI*2-Math.PI/2,x=WORLD_CX+Math.cos(a)*800,y=WORLD_CY+Math.sin(a)*800;return <button key={c.key} className={`lv4-category-bubble cat-${c.key}`} style={{left:x,top:y}} onClick={()=>chooseCategory(c.key)}><b>{c.label}</b><span>{c.subtitle}</span></button>})}</>}

    {displayLevel!=="worlds"&&<button className="lv4-intent" style={{left:WORLD_CX,top:WORLD_CY}} onClick={()=>{setZoom(z=>Math.min(1.65,z+.2));expandWorld()}}><span>{focus||CATEGORIES.find(c=>c.key===categoryKey)?.label}</span><small>{marketError|| (loading?"Finding products…":`${market==="lumina"?sourceName(luminaSource):"eBay"} · ${products.length} products · ${zoneCount} zones${loadingMore?" · more arriving":""}`)}</small></button>}
    {displayLevel!=="worlds"&&market==="lumina"&&luminaSource==="all"&&products.length>0&&<><button className="lv4-source-anchor shopify" style={{left:WORLD_CX-980,top:WORLD_CY-720}} onClick={()=>changeLuminaSource("shopify")}><b>Shopify</b><span>Independent stores</span></button><button className="lv4-source-anchor amazon" style={{left:WORLD_CX+980,top:WORLD_CY-720}} onClick={()=>changeLuminaSource("amazon")}><b>Amazon</b><span>Marketplace catalog</span></button></>}
    {displayLevel!=="worlds"&&labels.map((label,i)=>{const a=i/6*Math.PI*2-.52,x=WORLD_CX+Math.cos(a)*3.25*RING_UNIT,y=WORLD_CY+Math.sin(a)*2.10*RING_UNIT;return <button key={`${label}-${i}`} className={`lv4-textbubble ${focus===label?"active":""}`} style={{left:x,top:y}} onClick={()=>branch(label)}>{label}</button>})}
    {displayLevel!=="worlds"&&Array.from({length:Math.max(0,zoneCount-1)},(_,i)=>{const zone=i+1,offset=market==="lumina"&&luminaSource==="all"?(zone%2?-980:980):0,previousOffset=market==="lumina"&&luminaSource==="all"?((zone-1)%2?-980:980):0,center=zoneCenter(zone,offset),previous=zoneCenter(zone-1,previousOffset),distance=Math.hypot(center.x-previous.x,center.y-previous.y),angle=Math.atan2(center.y-previous.y,center.x-previous.x),midX=(previous.x+center.x)/2,midY=(previous.y+center.y)/2,start=zone*PRODUCTS_PER_ZONE+1,end=Math.min(refinedProducts.length,(zone+1)*PRODUCTS_PER_ZONE);return <Fragment key={`zone-${zone}`}><div className="lv4-zone-connector" style={{left:previous.x,top:previous.y,width:distance,transform:`rotate(${angle}rad)`}}/><div className="lv4-zone-detail-cluster" style={{left:midX,top:midY}}>{(zoneDetails[zone]||zoneDetails[zone-1]||[]).map((tag,j)=>{const detailAngle=angle+Math.PI/2+(j-1)*.52;return <button key={`${zone}-${tag}`} style={{"--detail-angle":`${detailAngle}rad`,"--detail-counter":`${-detailAngle}rad`} as React.CSSProperties} onClick={()=>branch(tag)}>{tag}</button>})}</div><div className="lv4-zone-annotation" style={{left:center.x,top:center.y}}><small>{focus||CATEGORIES.find(c=>c.key===categoryKey)?.label||"Discover"}</small><b>Explore further</b><span>{start}–{end} · {market==="lumina"?sourceName(luminaSource):"eBay"}</span></div></Fragment>})}
    {displayLevel!=="worlds"&&placeholderCount>0&&Array.from({length:placeholderCount},(_,i)=>{const slot=refinedProducts.length+i,pos=placeholderBubble(slot);return <span key={`placeholder-${slot}`} className="lv4-product-placeholder" style={{left:pos.x,top:pos.y,"--ps":`${pos.size}px`,"--delay":`${(i%12)*45}ms`} as React.CSSProperties}/>})}
    {displayLevel!=="worlds"&&refinedProducts.map(p=>{const size=productSize(p),showMeta=displayLevel==="details",isHovered=hovered?.id===p.id;return <button key={p.id} className={`lv4-product source-${productSource(p)} ${p.fresh?"lv4-new-product":""} ${isHovered?"is-hovered":""}`} data-product-id={p.id} data-product-title={cleanTitle(p.title)} data-product-image={p.image} data-product-category={categoryKey} style={{left:p.x,top:p.y,"--s":`${size}px`} as React.CSSProperties} onPointerEnter={()=>setHovered(p)} onPointerLeave={()=>setHovered(h=>h?.id===p.id?null:h)} onPointerDown={()=>setHovered(p)} onFocus={()=>setHovered(p)} onBlur={()=>setHovered(h=>h?.id===p.id?null:h)} onClick={()=>openProduct(p)}><span className="lv4-vita-gloss"/><img src={p.image} alt=""/><span className="lv4-product-tooltip"><b>{cleanTitle(p.title)}</b><small>{sourceShort(p)}{p.brand?` · ${p.brand}`:""}</small></span>{p.price!=null&&<span className="lv4-price">{money(p)}</span>}{showMeta&&<span className="lv4-orbmeta"><small className="lv4-orb-source">{sourceShort(p)}</small><b>{cleanTitle(p.title)}</b><em>{p.brand}</em></span>}</button>})}
   </div>
  </section>

  <button className={`lv4-refine ${refineOpen?"active":""}`} onClick={()=>setRefineOpen(v=>!v)} aria-expanded={refineOpen} aria-controls="lv4-refine-tags"><SlidersHorizontal/><span>Sort & filter</span><b>∨</b></button>
  {refineOpen&&<div className="lv4-refine-panel" id="lv4-refine-tags"><header><div><small>Rearrange this world</small><b>{refinedProducts.length} matching products</b></div><button onClick={()=>setRefineOpen(false)} aria-label="Close filters">⌄</button></header><section><small>Order</small><div>{([['discovery','Discovery'],['price-asc','Price low–high'],['price-desc','Price high–low'],['similar','Most similar']] as const).map(([key,label])=><button key={key} className={sortMode===key?"active":""} onClick={()=>setSortMode(key)}>{label}</button>)}</div></section>{availableColours.length>0&&<section><small>Colour</small><div><button className={!colourFilter?"active":""} onClick={()=>setColourFilter("")}>All</button>{availableColours.map(colour=><button key={colour} className={colourFilter===colour?"active":""} onClick={()=>setColourFilter(colour)}><i className={`colour-${colour}`}/>{colour}</button>)}</div></section>}{availableShapes.length>0&&<section><small>Shape & form</small><div><button className={!shapeFilter?"active":""} onClick={()=>setShapeFilter("")}>All</button>{availableShapes.map(shape=><button key={shape.label} className={shapeFilter===shape.label?"active":""} onClick={()=>setShapeFilter(shape.label)}>{shape.label}</button>)}</div></section>}<section><small>Details</small><div>{labels.map(label=><button key={label} className={focus===label?"active":""} onClick={()=>{setRefineOpen(false);branch(label)}}>{label}</button>)}</div></section>{(colourFilter||shapeFilter||sortMode!=="discovery")&&<button className="lv4-clear-refine" onClick={()=>{setColourFilter("");setShapeFilter("");setSortMode("discovery")}}>Clear arrangement</button>}</div>}

  {selected&&typeof document!=="undefined"&&createPortal(<button type="button" className="lv4-mobile-floating-close" aria-label="Close product" onPointerDown={event=>{event.preventDefault();event.stopPropagation();setSelected(null);setSuggestionsOpen(false);setCheckoutError("")}} onTouchStart={event=>{event.preventDefault();event.stopPropagation();setSelected(null);setSuggestionsOpen(false);setCheckoutError("")}} onClick={event=>{event.preventDefault();event.stopPropagation();setSelected(null);setSuggestionsOpen(false);setCheckoutError("")}}><X/></button>,document.body)}{selected&&<aside key={selected.id} className="lv4-detail"><button className="lv4-close" type="button" aria-label="Close product" onPointerDown={event=>{event.preventDefault();event.stopPropagation();setSelected(null);setSuggestionsOpen(false);setCheckoutError("")}} onClick={event=>{event.preventDefault();event.stopPropagation();setSelected(null);setSuggestionsOpen(false);setCheckoutError("")}}><X/></button><ProductMediaSurface product={{id:selected.id,title:cleanTitle(selected.title),image:selected.image,category:categoryKey}} className="lv4-detail-media" alt={cleanTitle(selected.title)}/>{(selected.images||[]).length>1&&<div className="lv4-gallery" aria-label="Product photos">{selected.images!.map((image,index)=><button type="button" key={`${selected.id}-${index}-${image}`} className={selected.image===image?"active":""} onPointerDown={event=>event.stopPropagation()} onTouchStart={event=>event.stopPropagation()} onClick={event=>{event.preventDefault();event.stopPropagation();switchGalleryImage(image)}}><img src={image} alt={`${cleanTitle(selected.title)} view ${index+1}`} draggable={false}/></button>)}</div>}<div className="lv4-detailcopy"><small className="lv4-product-brand">{selected.brand||"Independent store"}</small><span className={`lv4-product-source ${selected.source?.includes("ebay")?"ebay":""}`}>{sourceKind(selected)}</span><h2>{cleanTitle(selected.title)}</h2>{selected.description&&<p className="lv4-product-description">{selected.description}</p>}{selected.url&&<a className="lv4-merchant-dot" href={selected.url} target="_blank" rel="noopener noreferrer" aria-label={`View ${cleanTitle(selected.title)} on merchant site`} title="View merchant site">•</a>}<strong>{money(selected)}</strong>{(["home","tech"].includes(categoryKey)&&Number(selected.price||0)>=200)&&<div className="ynot-klarna-message"><b>Flexible payments with Klarna</b><span>Payment options and eligibility are confirmed securely at checkout.</span></div>}{selectableVariants(selected).length>0&&<div className="lv4-variants" aria-label="Product options">{selectableVariants(selected).map(v=><button key={v.id} disabled={!v.available} className={selected.variantId===v.id?"active":""} onClick={()=>setSelected(p=>p?{...p,variantId:v.id,price:v.price,currency:v.currency||p.currency,image:v.image||p.image,url:v.url||p.url}:p)}>{v.label}{v.price!=null?` · ${money({...selected,price:v.price,currency:v.currency||selected.currency})}`:""}</button>)}</div>}<div className="lv4-actions"><button disabled={checkoutBusy}><ShoppingBag/><span>YNOT BAG{(["home","tech"].includes(categoryKey)&&Number(selected.price||0)>=200)&&<small className="ynot-bag-klarna"> · Klarna available</small>}</span></button><button className={`lv4-save-action ${liked.has(selected.id)?"active":""}`} aria-label={liked.has(selected.id)?"Remove from saves":"Save product"} onClick={()=>toggleSaved(selected)}><Heart/></button>{categoryKey==="fashion"&&<button className="try"><Sparkles/> Try on</button>}</div>{checkoutError&&<div className="lv4-checkout-fallback"><small>{checkoutError}. You have not been charged.</small>{similar.length>0&&<div>{similar.map(p=><button key={p.id} onClick={()=>openProduct(p)}><img src={p.image} alt=""/><span>{cleanTitle(p.title)}</span></button>)}</div>}</div>}<div className="lv4-similar-block"><button type="button" className="lv4-similar-pill active" onClick={()=>void loadVisualSimilar()}><Sparkles/>{visualSimilarLoading?"Finding visual matches…":"Similar picks"}</button><div className="lv4-similar-slider" aria-label="Visually similar products and brands">{displayedSimilar.map(p=><button type="button" key={p.id} onClick={()=>{openProduct(p);setSuggestionsOpen(true)}}><img src={p.image} alt=""/><span><b>{p.brand||"Independent store"}</b><small>{cleanTitle(p.title)}</small><em>{money(p)}</em></span></button>)}</div></div><div className="lv4-direction-row"><button onClick={()=>branch("More like this")}>More like this</button><button onClick={()=>branch("Cheaper")}>Cheaper</button><button onClick={()=>branch("More premium")}>More premium</button><button onClick={()=>branch("Same shape")}>Same shape</button></div></div></aside>}
 </main>
}
