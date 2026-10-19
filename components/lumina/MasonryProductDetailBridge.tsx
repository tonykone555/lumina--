"use client";

import {useEffect} from "react";

type Variant={id?:string;label?:string;title?:string;price?:number|null;currency?:string;image?:string;images?:string[];url?:string;available?:boolean};
type Product={id:string;title:string;brand?:string;price:number|null;currency?:string;image:string;images?:string[];url?:string;source?:string;description?:string;variants?:Variant[];tags?:string[];variantId?:string};

function parse(value:string|null|undefined):Record<string,unknown>|null{
 if(!value)return null;
 try{const result=JSON.parse(value);return result&&typeof result==="object"&&!Array.isArray(result)?result:null}catch{return null}
}
function text(root:Element,selector:string){return root.querySelector<HTMLElement>(selector)?.textContent?.replace(/\s+/g," ").trim()||""}
function imageUrl(value:unknown){return typeof value==="string"&&/^https?:\/\//i.test(value)?value:""}
function productFrom(card:HTMLElement):Product|null{
 const raw=parse(card.dataset.ynotProduct||card.getAttribute("data-product")||card.getAttribute("data-product-json")||card.querySelector("[data-ynot-product]")?.getAttribute("data-ynot-product")||card.querySelector("[data-product-json]")?.getAttribute("data-product-json"));
 const title=String(raw?.title||text(card,".info h1,.info h2,h1,h2,[data-product-title]")||card.dataset.productTitle||"").trim();
 const image=imageUrl(raw?.image)||imageUrl(card.dataset.productImage)||imageUrl(card.querySelector<HTMLImageElement>(".hero img,.gallery img,img")?.currentSrc)||imageUrl(card.querySelector<HTMLImageElement>(".hero img,.gallery img,img")?.src);
 const id=String(raw?.id||card.dataset.productId||card.getAttribute("data-product-id")||card.dataset.id||image||title).trim();
 if(!id||!title||!image)return null;
 const rawImages=Array.isArray(raw?.images)?raw!.images as unknown[]:[];
 const images=[...new Set([image,...rawImages.map(imageUrl),...Array.from(card.querySelectorAll<HTMLImageElement>(".hero img,.gallery img")).map(img=>imageUrl(img.currentSrc)||imageUrl(img.src))].filter(Boolean))];
 const priceRaw=raw?.price??Number((text(card,".info .price,.price,[data-product-price]")||"").replace(/[^0-9,.-]/g,"").replace(",","."));
 const price=priceRaw==null||priceRaw===""||!Number.isFinite(Number(priceRaw))?null:Number(priceRaw);
 const variants=Array.isArray(raw?.variants)?raw!.variants as Variant[]:[];
 return {
  ...(raw as Partial<Product>||{}),id,title,image,images,price,
  brand:String(raw?.brand||text(card,".info .brand,.brand,[data-product-brand]")||"").trim()||undefined,
  currency:String(raw?.currency||"EUR"),
  description:String(raw?.description||text(card,".info p,.description,[data-product-description]")||"").trim()||undefined,
  source:String(raw?.source||card.dataset.source||"shopify"),
  url:String(raw?.url||raw?.productUrl||card.dataset.productUrl||"").trim()||undefined,
  variants
 };
}

export default function MasonryProductDetailBridge(){
 useEffect(()=>{
  const onClick=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const target=event.target instanceof Element?event.target:null;
   const card=target?.closest<HTMLElement>(".detail");
   if(!card||card.closest(".ynot-pv2,.ynot-selected,.lv4-detail,.ynot-story"))return;
   if(target?.closest("button,a,input,select,textarea,label,[role=button],.actions,.more,.hero .masonry-scan-overlay,.ynot-scan-overlay"))return;
   const product=productFrom(card);
   if(!product)return;
   event.preventDefault();
   event.stopPropagation();
   window.dispatchEvent(new CustomEvent("ynot:open-product",{detail:product}));
  };
  document.addEventListener("click",onClick,true);
  return()=>document.removeEventListener("click",onClick,true);
 },[]);
 return null;
}
