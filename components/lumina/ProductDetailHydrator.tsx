"use client";

import {useEffect,useLayoutEffect,useRef} from "react";

type Variant={id?:string;label?:string;price?:number|null;currency?:string;image?:string;url?:string;available?:boolean};
type Product={id:string;title:string;source?:string;description?:string;descriptionHydrated?:boolean;url?:string;image?:string;images?:string[];variantId?:string;variants?:Variant[];[key:string]:unknown};
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
 if(cached.descriptionHydrated&&Array.isArray(cached.images)&&cached.images.length)return cached;
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
 close.textContent="←";
 close.setAttribute("aria-label","Back to product");
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

function openFullSlider(shell:HTMLElement,images:string[],startIndex=0){
 shell.querySelector(".ynot-full-slider")?.remove();
 let index=Math.max(0,Math.min(startIndex,images.length-1));
 const slider=document.createElement("section");
 slider.className="ynot-full-slider";
 slider.setAttribute("aria-label","Product image slider");
 const image=document.createElement("img");
 image.className="ynot-full-slider-image";
 image.alt="Product view";
 const close=document.createElement("button");
 close.type="button";close.className="ynot-full-slider-close";close.textContent="×";close.setAttribute("aria-label","Close image slider");
 const prev=document.createElement("button");
 prev.type="button";prev.className="ynot-full-slider-prev";prev.textContent="‹";prev.setAttribute("aria-label","Previous image");
 const next=document.createElement("button");
 next.type="button";next.className="ynot-full-slider-next";next.textContent="›";next.setAttribute("aria-label","Next image");
 const count=document.createElement("span");
 count.className="ynot-full-slider-count";
 const render=()=>{image.src=images[index];count.textContent=`${index+1} / ${images.length}`};
 const move=(delta:number)=>{index=(index+delta+images.length)%images.length;render()};
 close.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();slider.remove()});
 prev.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();move(-1)});
 next.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();move(1)});
 slider.addEventListener("click",event=>event.stopPropagation());
 slider.addEventListener("keydown",event=>{if(event.key==="ArrowLeft")move(-1);if(event.key==="ArrowRight")move(1);if(event.key==="Escape")slider.remove()});
 slider.tabIndex=0;
 slider.append(image,close,prev,next,count);
 shell.appendChild(slider);
 render();
 requestAnimationFrame(()=>slider.focus());
}

function renderMedia(root:HTMLElement,product:Product){
 const shell=root.closest<HTMLElement>(".lv4-detail");
 if(!shell)return;
 const title=root.querySelector("h2")?.textContent?.trim()||"";
 if(key(title)!==key(product.title))return;
 const main=shell.querySelector<HTMLImageElement>(":scope > img");
 if(!main)return;

 const images=[...new Set<string>([product.image,...(product.images||[]),...(product.variants||[]).map(v=>v.image).filter(Boolean)].filter(Boolean) as string[])];
 const nativeGallery=shell.querySelector<HTMLElement>(".lv4-gallery");
 if(images.length>1){
  nativeGallery?.classList.add("ynot-native-hidden");
  let gallery=shell.querySelector<HTMLElement>(".ynot-loaded-gallery");
  if(!gallery){gallery=document.createElement("div");gallery.className="ynot-loaded-gallery";main.insertAdjacentElement("afterend",gallery)}
  const signature=images.join("|");
  if(gallery.dataset.mediaSignature!==signature){
   gallery.dataset.mediaSignature=signature;
   gallery.replaceChildren();
   const visibleCount=Math.min(images.length,4);
   images.slice(0,visibleCount).forEach((src,index)=>{
    const button=document.createElement("button");
    button.type="button";
    if(index===0)button.classList.add("active");
    const image=document.createElement("img");
    image.src=src;
    image.alt=`${product.title} view ${index+1}`;
    button.appendChild(image);
    const more=images.length>4&&index===visibleCount-1;
    if(more){
     button.classList.add("ynot-gallery-more");
     button.dataset.more=`+${images.length-visibleCount+1}`;
     button.setAttribute("aria-label",`Open all ${images.length} product images`);
     button.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();openFullSlider(shell,images,index)});
    }else{
     button.addEventListener("click",event=>{
      event.preventDefault();event.stopPropagation();
      main.src=src;
      gallery?.querySelectorAll("button").forEach(node=>node.classList.toggle("active",node===button));
     });
    }
    gallery?.appendChild(button);
   });
  }
 }else{
  shell.querySelector(".ynot-loaded-gallery")?.remove();
  nativeGallery?.classList.add("ynot-native-hidden");
 }

 const rawVariants=product.variants||[];
 const seen=new Set<string>();
 const variants=rawVariants.filter(v=>{
  const id=String(v.id||"");
  const label=String(v.label||"").trim();
  const token=`${id}|${label.toLowerCase()}`;
  if(!id||seen.has(token))return false;
  seen.add(token);
  return true;
 });
 const meaningful=variants.filter(v=>!/^default(?: title)?$|^option$/i.test(String(v.label||"").trim()));
 const visible=meaningful.length?meaningful:variants.length>1?variants:[];
 const nativeVariants=root.querySelector<HTMLElement>(".lv4-variants");
 if(visible.length){
  nativeVariants?.classList.add("ynot-native-hidden");
  let wrap=root.querySelector<HTMLElement>(".ynot-loaded-variants");
  if(!wrap){
   wrap=document.createElement("div");
   wrap.className="ynot-loaded-variants";
   const actions=root.querySelector(".lv4-actions");
   actions?.parentElement?.insertBefore(wrap,actions);
  }
  const signature=visible.map(v=>`${v.id}:${v.label}:${v.available}`).join("|");
  if(wrap.dataset.variantSignature!==signature){
   wrap.dataset.variantSignature=signature;
   wrap.replaceChildren();
   visible.forEach(v=>{
    const button=document.createElement("button");
    button.type="button";
    button.disabled=v.available===false;
    button.textContent=String(v.label||"Option");
    if(String(product.variantId||"")===String(v.id||""))button.classList.add("active");
    button.addEventListener("click",event=>{
     event.preventDefault();event.stopPropagation();
     shell.dataset.ynotVariantId=String(v.id||"");
     wrap?.querySelectorAll("button").forEach(node=>node.classList.toggle("active",node===button));
     if(v.image)main.src=v.image;
    });
    wrap?.appendChild(button);
   });
  }
 }else{
  root.querySelector(".ynot-loaded-variants")?.remove();
  nativeVariants?.classList.remove("ynot-native-hidden");
 }
}

function renderRich(root:HTMLElement,product:Product){renderDescription(root,product);renderMedia(root,product)}

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
     shell.querySelector(".ynot-loaded-gallery")?.remove();
     shell.querySelector(".ynot-full-slider")?.remove();
     root.querySelector(".ynot-loaded-variants")?.remove();
     shell.dataset.ynotDescriptionTitle=title;
     delete root.dataset.ynotDescriptionSignature;
    }
    const product=products.get(key(title));
    if(!product)return;
    void hydrate(product).then(rich=>{if(document.body.contains(root))renderRich(root,rich)}).catch(()=>{if(document.body.contains(root))renderRich(root,product)});
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
