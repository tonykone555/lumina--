"use client";
import {useEffect} from "react";

type Product={id?:string;title?:string;rating?:number|null;reviewCount?:number;review_count?:number;reviews_count?:number;rating_count?:number;[key:string]:unknown};
const STYLE_ID="ynot-product-review-summary-style-v1";

function parse(value:string|null){try{return value?JSON.parse(value):null}catch{return null}}
function text(value:unknown){return String(value??"").replace(/\s+/g," ").trim()}
function productFrom(host:HTMLElement):Product|null{
 const raw=host.dataset.ynotProduct||host.getAttribute("data-product")||host.getAttribute("data-product-json");
 if(raw){const p=parse(raw);if(p)return p}
 const nested=host.querySelector<HTMLElement>("[data-ynot-product],[data-product-json]");
 if(nested){const p=parse(nested.dataset.ynotProduct||nested.getAttribute("data-product-json"));if(p)return p}
 return null;
}
function productId(host:HTMLElement,p:Product|null){
 if(p?.id)return String(p.id);
 return host.dataset.productId||host.getAttribute("data-product-id")||new URLSearchParams(location.search).get("product")||"";
}
function stats(p:any){
 const rating=Number(p?.rating??p?.average_rating??p?.review_rating??p?.aggregateRating?.ratingValue);
 const count=Number(p?.reviewCount??p?.review_count??p?.reviews_count??p?.rating_count??p?.aggregateRating?.reviewCount??p?.aggregateRating?.ratingCount);
 return{rating:Number.isFinite(rating)&&rating>0&&rating<=5?rating:null,count:Number.isFinite(count)&&count>0?Math.round(count):0};
}
function css(){
 if(document.getElementById(STYLE_ID))return;
 const s=document.createElement("style");s.id=STYLE_ID;s.textContent=`
 .ynot-review-summary{display:flex!important;align-items:center!important;gap:6px!important;width:max-content!important;max-width:100%!important;margin:10px 0 14px!important;padding:0!important;color:rgba(255,255,255,.78)!important;font:650 11px/1.25 Inter,system-ui!important;letter-spacing:.005em!important}
 .ynot-review-summary b{font:760 11px/1.25 Inter,system-ui!important;color:#fff!important}
 .ynot-review-summary .star{font-size:12px!important;color:#fff!important}
 .ynot-review-summary .count{opacity:.72!important}
 html[data-ynot-theme="light"] .ynot-review-summary{color:rgba(34,35,32,.72)!important}
 html[data-ynot-theme="light"] .ynot-review-summary b,html[data-ynot-theme="light"] .ynot-review-summary .star{color:#242522!important}
 `;document.head.appendChild(s);
}
function render(host:HTMLElement,p:any){
 const {rating,count}=stats(p);let row=host.querySelector<HTMLElement>(".ynot-review-summary");
 if(!rating||!count){row?.remove();return}
 if(!row){row=document.createElement("div");row.className="ynot-review-summary";row.setAttribute("aria-label",`Rated ${rating.toFixed(1)} out of 5 from ${count} reviews`);
   const actions=host.querySelector(".lv4-actions,.actions,[class*='actions']");
   const desc=host.querySelector(".lv4-product-description,.description,.ynot-selected-description");
   if(actions?.parentElement)actions.parentElement.insertBefore(row,actions);else desc?.insertAdjacentElement("afterend",row);
 }
 row.innerHTML=`<b>Reviews</b><span class="star">★</span><span>${rating.toFixed(1)}</span><span>·</span><span class="count">${count.toLocaleString()} reviews</span>`;
}
export default function ProductReviewSummaryBridge():null{
 useEffect(()=>{
  css();const loaded=new Set<string>();let frame=0;
  const hydrate=async(host:HTMLElement,p:Product|null)=>{
   const id=productId(host,p);if(!id||loaded.has(id))return;loaded.add(id);
   try{
    const r=await fetch(`/api/commerce/product/${encodeURIComponent(id)}`,{cache:"force-cache"}),d=await r.json().catch(()=>null);
    const rich=r.ok&&d?.product?{...(p||{}),...d.product}:(p||{});
    if(host.isConnected)render(host,rich);
    const found=stats(rich);
    if((!found.rating||!found.count)&&host.isConnected){
      const title=text((rich as any)?.title||host.querySelector("h1,h2")?.textContent);
      const brand=text((rich as any)?.brand||"");
      const url=text((rich as any)?.merchantUrl||(rich as any)?.url||"");
      const research=await fetch("/api/commerce/research-product",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,brand,url,description:text((rich as any)?.description||"")}),cache:"no-store"});
      const rd=await research.json().catch(()=>null);
      if(research.ok&&rd&&host.isConnected)render(host,{...rich,rating:rd.rating,reviewCount:rd.reviewCount});
    }
   }catch{}
  };
  const scan=()=>{frame=0;document.querySelectorAll<HTMLElement>(".lv4-detail,.detail,.ynot-selected,[role='dialog'],aside").forEach(host=>{const add=[...host.querySelectorAll("button")].find(b=>/^add to bag$/i.test(text(b.textContent)));if(!add)return;const p=productFrom(host);render(host,p);const s=stats(p);if(!s.rating||!s.count)void hydrate(host,p)})};
  const queue=()=>{if(!frame)frame=requestAnimationFrame(scan)};scan();const observer=new MutationObserver(queue);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["data-ynot-product"]});
  return()=>{observer.disconnect();if(frame)cancelAnimationFrame(frame)}
 },[]);
 return null;
}
