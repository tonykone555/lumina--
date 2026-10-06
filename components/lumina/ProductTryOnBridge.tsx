"use client";

import {useEffect} from "react";

type Variant={id?:string;label?:string;image?:string;images?:string[]};
type Product={id?:string;title?:string;description?:unknown;tags?:unknown;image?:string;images?:string[];variantId?:string;variants?:Variant[];[key:string]:unknown};
type TryState={person?:string;result?:string;lastVariant?:string;busy?:boolean;mode?:"before"|"after";input?:HTMLInputElement};

const PHOTO_KEY="ynot-try-on-person-v1";
const STYLE_ID="ynot-product-try-on-styles-v1";

function text(value:unknown):string{
 if(value==null)return"";
 if(Array.isArray(value))return value.map(text).filter(Boolean).join(" ");
 if(typeof value==="object"){const v=value as Record<string,unknown>;return text(v.text??v.value??v.label??v.description??"")}
 return String(value).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
}
function parse(value:string|null){try{return value?JSON.parse(value):null}catch{return null}}
function hostProduct(host:HTMLElement):Product|null{
 const raw=host.dataset.ynotProduct||host.getAttribute("data-product")||host.getAttribute("data-product-json");
 if(raw){const p=parse(raw);if(p)return p}
 const nested=host.querySelector<HTMLElement>("[data-ynot-product],[data-product-json]");
 if(nested){const p=parse(nested.dataset.ynotProduct||nested.getAttribute("data-product-json"));if(p)return p}
 return null;
}
function clothing(product:Product|null,host:HTMLElement){
 const hay=[product?.title,product?.description,product?.tags,host.querySelector("h1,h2")?.textContent].map(text).join(" ").toLowerCase();
 if(/\b(shoe|sneaker|trainer|boot|sandal|heel|loafer|bag|handbag|backpack|wallet|jewelry|jewellery|necklace|ring|earring|bracelet|watch|hat|cap|sunglass)\b/.test(hay))return false;
 return /\b(dress|shirt|t[- ]?shirt|tee|top|blouse|hoodie|sweater|jumper|cardigan|jacket|coat|blazer|trouser|pants|jeans|denim|skirt|shorts|legging|jogger|sweatpant|activewear|sportswear|swimwear|bikini|bodysuit|jumpsuit|romper|vest|polo|jersey|clothing|apparel|shoulder\s*pads?|football\s*pads?|protective\s*(?:vest|gear|pads?)|chest\s*protector|compression\s*(?:shirt|top|wear)|uniform|rash\s*guard|wetsuit|base\s*layer)\b/.test(hay);
}
function currentVariant(host:HTMLElement,product:Product|null){
 const id=String(host.dataset.ynotVariantId||product?.variantId||"");
 const variants=Array.isArray(product?.variants)?product!.variants!:[];
 const chosen=variants.find(v=>String(v.id||"")===id)||variants.find(v=>host.querySelector(".ynot-loaded-variants button.active")?.textContent?.trim()===String(v.label||"").trim())||variants[0];
 const image=String(chosen?.image||chosen?.images?.[0]||product?.image||product?.images?.[0]||host.querySelector<HTMLImageElement>("img")?.currentSrc||host.querySelector<HTMLImageElement>("img")?.src||"");
 return{id:String(chosen?.id||id||image),label:text(chosen?.label)||"Selected option",image};
}
async function preparePhoto(file:File){
 if(!file.type.startsWith("image/")||file.size>10_000_000)throw new Error("Choose an image under 10 MB");
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.src=url;await img.decode();
  const maxW=1100,maxH=1400,scale=Math.min(1,maxW/img.width,maxH/img.height),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
  const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Photo could not be prepared");
  ctx.drawImage(img,0,0,w,h);return canvas.toDataURL("image/jpeg",.88);
 }finally{URL.revokeObjectURL(url)}
}
function css(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement("style");style.id=STYLE_ID;style.textContent=`
 .ynot-try-on-box{display:block;width:100%;margin:12px 0 24px;padding:0;color:inherit}
 .ynot-try-on-trigger{width:100%;height:46px;border:1px solid rgba(255,255,255,.30);border-radius:15px;background:rgba(255,255,255,.08);color:inherit;font:740 12px/1 Inter,system-ui;letter-spacing:.02em;display:flex;align-items:center;justify-content:center;gap:8px;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
 .ynot-try-on-trigger:disabled{opacity:.58}.ynot-try-on-trigger i{width:14px;height:14px;border:1.5px solid currentColor;border-top-color:transparent;border-radius:50%;animation:ynotTrySpin .8s linear infinite}
 .ynot-try-on-result{margin-top:12px;border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:9px;background:rgba(255,255,255,.045);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
 .ynot-try-on-result[hidden]{display:none!important}.ynot-try-on-switch{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:8px;padding:4px;border-radius:999px;background:rgba(0,0,0,.16)}
 .ynot-try-on-switch button{height:34px;border:0;border-radius:999px;background:transparent;color:inherit;font:700 10px/1 Inter,system-ui;opacity:.56}.ynot-try-on-switch button.active{background:rgba(255,255,255,.16);opacity:1}
 .ynot-try-on-image{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:14px;background:rgba(0,0,0,.15)}
 .ynot-try-on-save{width:100%;height:42px;margin-top:8px;border:0;border-radius:999px;background:rgba(255,255,255,.92);color:#111;font:760 11px/1 Inter,system-ui}
 .ynot-try-on-error{margin:8px 2px 0;font:600 10px/1.35 Inter,system-ui;color:#ffd1d1}
 .ynot-try-plus-shell{position:fixed;z-index:9400;inset:0;display:grid;place-items:end center;padding:14px;background:rgba(0,0,0,.46);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
 .ynot-try-plus-card{width:min(430px,100%);padding:22px 18px 18px;border:1px solid rgba(255,255,255,.20);border-radius:28px;background:rgba(20,21,21,.88);color:#fff;box-shadow:0 28px 90px rgba(0,0,0,.42);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px)}
 .ynot-try-plus-card small{font:700 9px/1 Inter;letter-spacing:.14em;opacity:.48}.ynot-try-plus-card h3{margin:7px 0 7px;font:780 24px/1.05 Inter,system-ui}.ynot-try-plus-card p{margin:0 0 16px;font:500 12px/1.45 Inter,system-ui;opacity:.67}
 .ynot-try-plus-card>button{width:100%;height:46px;border-radius:999px;font:760 12px/1 Inter}.ynot-try-plus-upgrade{border:0;background:#fff;color:#111}.ynot-try-plus-keep{margin-top:7px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.05);color:#fff}
 html[data-ynot-theme="light"] .ynot-try-on-trigger,html[data-ynot-theme="light"] .ynot-try-on-result{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.58);color:#2c2d29;backdrop-filter:blur(24px) saturate(1.16);-webkit-backdrop-filter:blur(24px) saturate(1.16)}
 html[data-ynot-theme="light"] .ynot-try-on-switch{background:rgba(255,255,255,.22)}html[data-ynot-theme="light"] .ynot-try-on-switch button.active{background:rgba(255,255,255,.62)}
 @keyframes ynotTrySpin{to{transform:rotate(360deg)}}@media(min-width:700px){.ynot-try-plus-shell{place-items:center}}
 `;document.head.appendChild(style);
}
function plusGate(){
 if(document.querySelector(".ynot-try-plus-shell"))return;
 const shell=document.createElement("div");shell.className="ynot-try-plus-shell";
 const card=document.createElement("section");card.className="ynot-try-plus-card";
 card.innerHTML='<small>YNOT+</small><h3>Upload another try-on photo</h3><p>Your first try-on photo stays available for free. Upgrade to YNOT+ to replace it with another photo and create try-ons for different people or looks.</p>';
 const upgrade=document.createElement("button");upgrade.className="ynot-try-plus-upgrade";upgrade.textContent="Get YNOT+";
 const keep=document.createElement("button");keep.className="ynot-try-plus-keep";keep.textContent="Keep current photo";
 upgrade.onclick=()=>{shell.remove();window.dispatchEvent(new CustomEvent("ynot:open-try-pricing",{detail:{compact:true}}))};
 keep.onclick=()=>shell.remove();shell.onclick=e=>{if(e.target===shell)shell.remove()};card.append(upgrade,keep);shell.append(card);document.body.append(shell);
}
function savedPhoto(){try{return localStorage.getItem(PHOTO_KEY)||""}catch{return""}}
function storePhoto(value:string){try{localStorage.setItem(PHOTO_KEY,value)}catch{}}

export default function ProductTryOnBridge():null{
 useEffect(()=>{
  css();let frame=0;
  const render=(section:HTMLElement,state:TryState)=>{
   const viewer=section.querySelector<HTMLElement>(".ynot-try-on-result"),img=section.querySelector<HTMLImageElement>(".ynot-try-on-image");
   if(!viewer||!img)return;if(!state.result){viewer.hidden=true;return}viewer.hidden=false;img.src=state.mode==="before"?(state.person||""):state.result;
   section.querySelectorAll<HTMLButtonElement>(".ynot-try-on-switch button").forEach(btn=>btn.classList.toggle("active",btn.dataset.mode===state.mode));
  };
  const generate=async(section:HTMLElement,host:HTMLElement,product:Product|null,state:TryState)=>{
   const variant=currentVariant(host,product);if(!state.person||!variant.image||state.busy)return;
   const trigger=section.querySelector<HTMLButtonElement>(".ynot-try-on-trigger"),error=section.querySelector<HTMLElement>(".ynot-try-on-error");state.busy=true;if(trigger){trigger.disabled=true;trigger.innerHTML="<i></i> Creating your try-on…"}if(error)error.textContent="";
   try{
    const r=await fetch("/api/commerce/try-on",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({personImage:state.person,garmentImage:variant.image,title:text(product?.title||host.querySelector("h1,h2")?.textContent),variantLabel:variant.label})});
    const data=await r.json().catch(()=>({}));if(!r.ok||!data?.image)throw new Error(String(data?.error||"Try on unavailable").replaceAll("_"," "));
    state.result=String(data.image);state.lastVariant=variant.id;state.mode="after";render(section,state);
   }catch(e){if(error)error.textContent=e instanceof Error?e.message:"Try on unavailable"}finally{state.busy=false;if(trigger){trigger.disabled=false;trigger.textContent="Try On"}}
  };
  const mount=(button:HTMLButtonElement)=>{
   const host=button.closest<HTMLElement>(".detail,.lv4-detail,.ynot-selected,[role='dialog'],aside")||button.parentElement?.parentElement;if(!host)return;
   const product=hostProduct(host);if(!clothing(product,host)){host.querySelector(".ynot-try-on-box")?.remove();return}
   const actionRow=button.closest<HTMLElement>(".actions,.lv4-actions,[class*='actions']")||button.parentElement;if(!actionRow?.parentElement)return;
   let section=host.querySelector<HTMLElement>(".ynot-try-on-box");if(section){
    const about=host.querySelector<HTMLElement>("[data-ynot-force-about='true']");if(about&&section.nextElementSibling!==about)about.insertAdjacentElement("beforebegin",section);return;
   }
   section=document.createElement("section");section.className="ynot-try-on-box";
   const trigger=document.createElement("button");trigger.type="button";trigger.className="ynot-try-on-trigger";trigger.textContent="Try On";
   const input=document.createElement("input");input.type="file";input.accept="image/png,image/jpeg,image/webp";input.hidden=true;
   const viewer=document.createElement("div");viewer.className="ynot-try-on-result";viewer.hidden=true;
   const switcher=document.createElement("div");switcher.className="ynot-try-on-switch";
   const before=document.createElement("button");before.type="button";before.dataset.mode="before";before.textContent="Before";
   const after=document.createElement("button");after.type="button";after.dataset.mode="after";after.textContent="After";after.className="active";
   const image=document.createElement("img");image.className="ynot-try-on-image";image.alt="YNOT virtual try-on";
   const save=document.createElement("button");save.type="button";save.className="ynot-try-on-save";save.textContent="Save result";
   const error=document.createElement("p");error.className="ynot-try-on-error";
   switcher.append(before,after);viewer.append(switcher,image,save);section.append(trigger,input,viewer,error);
   const state:TryState={person:savedPhoto(),mode:"after",input};(section as any).__ynotTryState=state;
   const choose=()=>input.click();
   input.onchange=async()=>{const file=input.files?.[0];input.value="";if(!file)return;try{const prepared=await preparePhoto(file);state.person=prepared;storePhoto(prepared);state.result="";await generate(section!,host,product,state)}catch(e){error.textContent=e instanceof Error?e.message:"Photo could not be prepared"}};
   trigger.onclick=async e=>{e.preventDefault();e.stopPropagation();const variant=currentVariant(host,product);if(!state.person){choose();return}if(state.result&&state.lastVariant===variant.id){plusGate();return}await generate(section!,host,product,state)};
   before.onclick=()=>{state.mode="before";render(section!,state)};after.onclick=()=>{state.mode="after";render(section!,state)};
   save.onclick=()=>{if(!state.result)return;const a=document.createElement("a");a.href=state.result;a.download="ynot-try-on.jpg";document.body.append(a);a.click();a.remove()};
   const about=host.querySelector<HTMLElement>("[data-ynot-force-about='true']");if(about)about.insertAdjacentElement("beforebegin",section);else actionRow.insertAdjacentElement("afterend",section);
  };
  const sync=()=>{frame=0;document.querySelectorAll<HTMLButtonElement>("button").forEach(button=>{if(/^add to bag$/i.test(text(button.textContent)))mount(button)})};
  const queue=()=>{if(!frame)frame=requestAnimationFrame(sync)};sync();const observer=new MutationObserver(queue);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["data-ynot-variant-id"]});
  return()=>{observer.disconnect();if(frame)cancelAnimationFrame(frame)}
 },[]);
 return null;
}
