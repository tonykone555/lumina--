"use client";

import {useEffect,useMemo,useState} from "react";

type Props={
  product:{
    ynotId:string;
    title:string;
    image:string;
    images:string[];
    price:number;
    currency:string;
    country:string;
    category:string;
    brand:string;
    supplierCount:number;
    tags:string[];
  };
};

function money(value:number,currency:string){
  try{return new Intl.NumberFormat(undefined,{style:"currency",currency}).format(value)}
  catch{return `${value.toFixed(2)} ${currency}`}
}

async function track(body:Record<string,unknown>){
  try{await fetch("/api/commerce/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),keepalive:true})}catch{}
}

export default function ProductActions({product}:Props){
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [active,setActive]=useState(0);
  const images=useMemo(()=>product.images.length?product.images:[product.image],[product.images,product.image]);

  useEffect(()=>{
    void track({eventType:"view",ynotId:product.ynotId,source:"product-page",country:product.country,value:product.price,currency:product.currency});
  },[product]);

  async function buy(){
    setBusy(true);setError("");
    void track({eventType:"checkout_start",ynotId:product.ynotId,source:"product-page",country:product.country,value:product.price,currency:product.currency});
    try{
      const quoteRes=await fetch("/api/checkout/ynot-quote",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ynotId:product.ynotId,country:product.country,quantity:1})
      });
      const quote=await quoteRes.json();
      if(!quoteRes.ok||!quote?.token)throw new Error(quote?.error||"Unable to prepare checkout");
      const sessionRes=await fetch("/api/checkout/session",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token:quote.token})
      });
      const session=await sessionRes.json();
      if(!sessionRes.ok||!session?.url)throw new Error(session?.error||"Unable to start checkout");
      void track({eventType:"purchase_intent",ynotId:product.ynotId,source:"product-page",country:product.country,value:quote.total||product.price,currency:product.currency});
      window.location.assign(session.url);
    }catch(e){
      setError(e instanceof Error?e.message:"Checkout unavailable");
      setBusy(false);
    }
  }

  return <div className="ynot-pdp">
    <div className="ynot-pdp-gallery">
      <div className="ynot-pdp-main-image">
        <img src={images[active]||product.image} alt={product.title}/>
      </div>
      {images.length>1&&<div className="ynot-pdp-thumbs">
        {images.slice(0,6).map((src,i)=><button key={src+i} aria-label={`Show image ${i+1}`} onClick={()=>setActive(i)} className={active===i?"active":""}>
          <img src={src} alt=""/>
        </button>)}
      </div>}
    </div>

    <div className="ynot-pdp-info">
      <div className="ynot-pdp-kicker">YNOT · {product.category}</div>
      <h1>{product.title}</h1>
      <div className="ynot-pdp-brand">Product brand: {product.brand}</div>
      <div className="ynot-pdp-price">{money(product.price,product.currency)}</div>
      <div className="ynot-pdp-included">Shipping reserve included in the YNOT price · Market: {product.country}</div>

      {product.tags.length>0&&<div className="ynot-pdp-tags">
        {product.tags.slice(0,6).map(tag=><span key={tag}>{tag}</span>)}
      </div>}

      <div className="ynot-pdp-trust">
        <strong>One YNOT product, multiple supply options.</strong>
        <span>YNOT currently tracks {product.supplierCount} matching supplier {product.supplierCount===1?"offer":"offers"} for this item and routes the strongest available option behind the scenes.</span>
      </div>

      <button className="ynot-pdp-buy" onClick={buy} disabled={busy}>
        {busy?"Preparing checkout…":`Buy with YNOT · ${money(product.price,product.currency)}`}
      </button>
      {error&&<div className="ynot-pdp-error">{error}</div>}
      <div className="ynot-pdp-note">Payment is authorized first. YNOT confirms the supplier order before capture.</div>
    </div>
  </div>;
}
