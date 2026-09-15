"use client";

import {useEffect,useLayoutEffect,useRef} from "react";

type Product={id:string;title:string;source?:string;description?:string;descriptionHydrated?:boolean;url?:string;[key:string]:unknown};
type RichResponse={url?:string;product?:Product;error?:string};

const products=new Map<string,Product>();
const pending=new Map<string,Promise<Product>>();

function key(value:string){return String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function isShopify(product?:Product){return Boolean(product?.source?.toLowerCase().includes("shopify"))}
function ingestPayload(data:unknown){
 const list=(data as {products?:Product[]})?.products;
 if(!Array.isArray(list))return;
 for(const product of list){
  if(!product?.title)continue;
  const prior=products.get(key(product.title));
  products.set(key(product.title),{...prior,...product});
 }
}

async function hydrate(product:Product){
 const id=key(product.title);
 const cached=products.get(id)||product;
 if(cached.descriptionHydrated)return cached;
 if(!isShopify(cached))return cached;
 const existing=pending.get(id);
 if(existing)return existing;
 const job=(async()=>{
  const response=await fetch("/api/commerce/product-link",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(cached)});
  const data=await response.json() as RichResponse;
  if(!response.ok||!data.product)throw new Error(data.error||"PRODUCT_DETAILS_UNAVAILABLE");
  const rich={...cached,...data.product,url:data.url||data.product.url||cached.url,descriptionHydrated:true};
  products.set(id,rich);
  return rich;
 })().finally(()=>pending.delete(id));
 pending.set(id,job);
 return job;
}

function clearDescription(shell:HTMLElement){
 shell.classList.remove("ynot-description-flipped");
 shell.querySelector(".ynot-description-back")?.remove();
 shell.querySelector(".ynot-description-toggle")?.remove();
}

function renderDescription(root:HTMLElement,product:Product){
 const shell=root.closest<HTMLElement>(".lv4-detail");
 if(!shell)return;
 const title=root.querySelector("h2")?.textContent?.trim()||"";
 if(key(title)!==key(product.title))return;
 const signature=`${key(product.title)}:${product.description?.length||0}`;
 if(root.dataset.ynotDescriptionSignature===signature)return;
 root.dataset.ynotDescriptionSignature=signature;
 clearDescription(shell);
 const toggle=document.createElement("button");
 toggle.type="button";
 toggle.className="ynot-description-toggle";
 toggle.textContent="Description";
 const back=document.createElement("section");
 back.className="ynot-description-back";
 const close=document.createElement("button");
 close.type="button";
 close.className="ynot-description-close";
 close.textContent="Back";
 const label=document.createElement("small");
 label.textContent="PRODUCT DESCRIPTION";
 const heading=document.createElement("h3");
 heading.textContent=product.title;
 const copy=document.createElement("p");
 copy.className="ynot-description-copy";
 copy.textContent=product.description?.trim()||"No merchant description was supplied for this product.";
 back.append(close,label,heading,copy);
 root.appendChild(toggle);
 shell.appendChild(back);
 toggle.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();shell.classList.add("ynot-description-flipped")});
 close.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();shell.classList.remove("ynot-description-flipped")});
}

export default function ProductDetailHydrator():null{
 const observer=useRef<MutationObserver|null>(null);
 const fetchPatched=useRef(false);
 useLayoutEffect(()=>{
  if(fetchPatched.current)return;
  fetchPatched.current=true;
  const previous=window.fetch.bind(window);
  const wrapped=async(input:RequestInfo|URL,init?:RequestInit)=>{
   const response=await previous(input,init);
   const url=typeof input==="string"?input:input instanceof URL?input.toString():input.url;
   if(url.includes("/api/catalog"))response.clone().json().then(ingestPayload).catch(()=>{});
   return response;
  };
  window.fetch=wrapped as typeof fetch;
  return()=>{window.fetch=previous};
 },[]);
 useEffect(()=>{
  let frame=0;
  const scan=()=>{
   frame=0;
   document.querySelectorAll<HTMLElement>(".lv4-detailcopy").forEach(root=>{
    const title=root.querySelector("h2")?.textContent?.trim()||"";
    if(!title)return;
    const shell=root.closest<HTMLElement>(".lv4-detail");
    if(shell&&shell.dataset.ynotDescriptionTitle!==title){
     clearDescription(shell);
     shell.dataset.ynotDescriptionTitle=title;
     delete root.dataset.ynotDescriptionSignature;
    }
    const product=products.get(key(title));
    if(!product)return;
    void hydrate(product).then(rich=>{if(document.body.contains(root))renderDescription(root,rich)}).catch(()=>{if(document.body.contains(root))renderDescription(root,product)});
   });
  };
  const schedule=()=>{if(frame)return;frame=requestAnimationFrame(scan)};
  observer.current=new MutationObserver(schedule);
  observer.current.observe(document.body,{subtree:true,childList:true});
  document.addEventListener("click",schedule,true);
  schedule();
  return()=>{
   document.removeEventListener("click",schedule,true);
   observer.current?.disconnect();
   if(frame)cancelAnimationFrame(frame);
  };
 },[]);
 return null;
}
