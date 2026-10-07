"use client";

import {useMemo,useState} from "react";
import {ChevronDown,Heart,ShoppingBag,Sparkles,X,ExternalLink} from "lucide-react";
import "./ProductDetailModalV2.css";

type Variant={
  id:string;label:string;price:number|null;currency?:string;image?:string;images?:string[];url?:string;available:boolean;
};
export type ProductDetailV2Product={
  id:string;variantId?:string;title:string;brand?:string;price:number|null;currency?:string;image:string;images?:string[];
  url?:string;source?:string;description?:string;variants?:Variant[];tags?:string[];
};
type Props={
  product:ProductDetailV2Product;
  similar:ProductDetailV2Product[];
  liked:boolean;
  checkoutBusy?:boolean;
  checkoutError?:string;
  visualSimilarLoading?:boolean;
  onClose:()=>void;
  onImage:(src:string)=>void;
  onSave:()=>void;
  onOpenProduct:(product:ProductDetailV2Product)=>void;
  onMore:(direction:"More like this"|"Cheaper"|"More premium")=>void;
  onSelectVariant:(variant:Variant)=>void;
};

function money(product:ProductDetailV2Product){
  if(product.price==null)return"";
  try{return new Intl.NumberFormat(undefined,{style:"currency",currency:product.currency||"EUR",maximumFractionDigits:0}).format(product.price)}
  catch{return String(product.price)}
}
function clean(value:string){return String(value||"").replace(/\s+/g," ").trim()}
function sourceKind(product:ProductDetailV2Product){
  const s=String(product.source||"").toLowerCase();
  if(s.includes("ebay"))return"YNOT · Marketplace";
  return"YNOT · Commerce";
}
function media(product:ProductDetailV2Product){
  return [...new Set<string>([
    product.image,
    ...(product.images||[]),
    ...(product.variants||[]).flatMap(v=>[v.image,...(v.images||[])])
  ].filter(Boolean) as string[])];
}
function usableVariants(product:ProductDetailV2Product){
  const seen=new Set<string>();
  return (product.variants||[]).filter(v=>{
    const label=clean(v.label);
    const k=label.toLowerCase();
    if(!v.id||!label||/^default(?: title)?$|^option$/i.test(label)||seen.has(k))return false;
    seen.add(k);return true;
  });
}

export default function ProductDetailModalV2({
  product,similar,liked,checkoutBusy,checkoutError,visualSimilarLoading,onClose,onImage,onSave,onOpenProduct,onMore,onSelectVariant
}:Props){
  const [descriptionOpen,setDescriptionOpen]=useState(false);
  const [optionsOpen,setOptionsOpen]=useState(false);
  const images=useMemo(()=>media(product),[product]);
  const variants=useMemo(()=>usableVariants(product),[product]);
  const activeIndex=Math.max(0,images.findIndex(src=>src===product.image));
  const activeVariant=variants.find(v=>v.id===product.variantId);

  return <div className="ynot-pv2-backdrop" role="presentation" onClick={onClose}>
    <aside className="ynot-pv2" data-ynot-product={JSON.stringify(product)} role="dialog" aria-modal="true" aria-label={clean(product.title)} onClick={e=>e.stopPropagation()}>
      <button className="ynot-pv2-close" onClick={onClose} aria-label="Close product"><X/></button>

      <section className="ynot-pv2-gallery">
        <div className="ynot-pv2-hero">
          <img src={product.image} alt={clean(product.title)} draggable={false}/>
        </div>
        {images.length>1&&<div className="ynot-pv2-thumbs" aria-label="Product images">
          {images.map((src,index)=><button key={src} className={src===product.image?"active":""} onClick={()=>onImage(src)} aria-label={`View image ${index+1}`}>
            <img src={src} alt="" draggable={false}/>
          </button>)}
        </div>}
        {images.length>1&&<div className="ynot-pv2-dots" aria-hidden="true">
          {images.slice(0,8).map((_,index)=><i key={index} className={index===activeIndex?"active":""}/>)}
        </div>}
      </section>

      <section className="ynot-pv2-similar">
        <div className="ynot-pv2-section-label"><Sparkles/><span>{visualSimilarLoading?"Finding similar picks…":"Similar picks"}</span></div>
        <div className="ynot-pv2-similar-track">
          {similar.map(item=><button key={item.id} className="ynot-pv2-similar-card" onClick={()=>onOpenProduct(item)}>
            <img src={item.image} alt=""/>
            <span><b>{item.brand||"Independent store"}</b><small>{clean(item.title)}</small><em>{money(item)}</em></span>
          </button>)}
        </div>
      </section>

      <section className="ynot-pv2-info">
        <small className="ynot-pv2-brand">{product.brand||"Independent store"}</small>
        <span className="ynot-pv2-source">{sourceKind(product)}</span>
        <h2>{clean(product.title)}</h2>
        <strong>{money(product)}</strong>

        {variants.length>0&&<button className="ynot-pv2-option" onClick={()=>setOptionsOpen(true)}>
          <span>{activeVariant?.label||"Choose option"}</span><ChevronDown/>
        </button>}

        <div className="ynot-pv2-actions">
          <button className="ynot-pv2-bag ynot-unified-add" type="button" disabled={checkoutBusy}>
            <ShoppingBag/><span>YNOT BAG</span>
          </button>
          <button className={`ynot-pv2-heart ${liked?"active":""}`} onClick={onSave} aria-label={liked?"Remove from saves":"Save product"}><Heart/></button>
        </div>

        <div className="ynot-pv2-directions">
          <button onClick={()=>onMore("More like this")}>More like this <small>Y</small></button>
          <button onClick={()=>onMore("Cheaper")}>Cheaper <small>Y</small></button>
          <button onClick={()=>onMore("More premium")}>More premium <small>Y</small></button>
        </div>

        {checkoutError&&<p className="ynot-pv2-error">{checkoutError}. You have not been charged.</p>}

        <button className={`ynot-pv2-description-toggle ${descriptionOpen?"active":""}`} onClick={()=>setDescriptionOpen(v=>!v)}>
          Description {descriptionOpen?"−":"+"}
        </button>
        {descriptionOpen&&<div className="ynot-pv2-description">
          <p>{product.description||`Discover more details about ${clean(product.title)}.`}</p>
          {product.url&&<a href={product.url} target="_blank" rel="noopener noreferrer">Original product <ExternalLink/></a>}
        </div>}
      </section>

      {optionsOpen&&<div className="ynot-pv2-options-backdrop" onClick={()=>setOptionsOpen(false)}>
        <section className="ynot-pv2-options" onClick={e=>e.stopPropagation()}>
          <header><div><small>PRODUCT OPTIONS</small><h3>Choose a variant</h3></div><button onClick={()=>setOptionsOpen(false)} aria-label="Close options"><X/></button></header>
          <div className="ynot-pv2-options-list">
            {variants.map(v=><button key={v.id} disabled={!v.available} className={v.id===product.variantId?"active":""} onClick={()=>{onSelectVariant(v);setOptionsOpen(false)}}>
              {v.image&&<img src={v.image} alt=""/>}<span><b>{v.label}</b>{v.price!=null&&<small>{money({...product,price:v.price,currency:v.currency||product.currency})}</small>}</span>
            </button>)}
          </div>
        </section>
      </div>}
    </aside>
  </div>
}
