"use client";

import {useEffect} from "react";

const WORLD_CX=100000;
const WORLD_CY=100000;
const HOME_Y_OFFSET=0;
const PRODUCT_Y_OFFSET=340;
const DESKTOP_COLUMNS=39;
const SLOT_BUFFER=84;
const LAYER_TARGETS={worlds:.42,themes:.82,products:1.15,details:1.55} as const;
const LAYER_ORDER=["worlds","themes","products","details"] as const;
type Layer=(typeof LAYER_ORDER)[number];

function metrics(){
 const w=typeof window!=="undefined"?window.innerWidth:1440;
 if(w<520)return{stepX:158,stepY:142,size:92};
 if(w<700)return{stepX:166,stepY:148,size:98};
 if(w<900)return{stepX:170,stepY:152,size:104};
 if(w<1100)return{stepX:172,stepY:154,size:116};
 return{stepX:176,stepY:156,size:126};
}
function signedSpread(index:number){if(index<=0)return 0;const n=Math.ceil(index/2);return index%2===1?n:-n}
function horizontalCell(index:number){const row=Math.floor(index/DESKTOP_COLUMNS),local=index%DESKTOP_COLUMNS,x=signedSpread(local),y=signedSpread(row);return{x,y,ring:Math.max(Math.abs(x),Math.abs(y))}}
function cellPosition(index:number){const {stepX,stepY,size}=metrics(),cell=horizontalCell(index),stagger=(Math.abs(cell.y)%2)*stepX*.5;return{cell,size,x:WORLD_CX+cell.x*stepX+stagger,y:WORLD_CY+PRODUCT_Y_OFFSET+cell.y*stepY}}
function setImportant(node:HTMLElement,property:string,value:string){if(node.style.getPropertyValue(property)===value&&node.style.getPropertyPriority(property)==="important")return;node.style.setProperty(property,value,"important")}

function centerDesktopHome(shell:HTMLElement,stage:HTMLElement){
 if(window.innerWidth<900||!shell.classList.contains("depth-worlds"))return;
 const voice=stage.querySelector<HTMLElement>(":scope > .ynot-voice-orb");
 const categories=[...stage.querySelectorAll<HTMLElement>(":scope > .lv4-category-bubble")];
 if(!voice||!categories.length)return;
 const centerY=WORLD_CY+HOME_Y_OFFSET;
 setImportant(voice,"left",`${WORLD_CX}px`);setImportant(voice,"top",`${centerY}px`);
 const radius=Math.min(760,Math.max(520,Math.min(window.innerWidth,window.innerHeight)*1.78));
 categories.forEach((node,index)=>{const angle=index/categories.length*Math.PI*2-Math.PI/2;setImportant(node,"left",`${WORLD_CX+Math.cos(angle)*radius}px`);setImportant(node,"top",`${centerY+Math.sin(angle)*radius}px`)})
}
function warmImages(products:HTMLElement[],stage:HTMLElement){
 if(window.innerWidth<900)return;
 const transform=getComputedStyle(stage).transform;
 let scale=1,tx=0,ty=0;
 const match=transform.match(/matrix\(([^)]+)\)/);
 if(match){const values=match[1].split(',').map(Number);scale=Math.abs(values[0])||1;tx=values[4]||0;ty=values[5]||0}
 const viewport={left:-tx/scale-1100,right:(window.innerWidth-tx)/scale+1100,top:-ty/scale-1500,bottom:(window.innerHeight-ty)/scale+1100};
 products.forEach((product,index)=>{
  const image=product.querySelector<HTMLImageElement>("img");if(!image)return;
  const left=parseFloat(product.style.left)||0,top=parseFloat(product.style.top)||0,near=left>=viewport.left&&left<=viewport.right&&top>=viewport.top&&top<=viewport.bottom;
  if(near||index<18){image.loading="eager";image.setAttribute("fetchpriority",index<8?"high":"auto");image.decoding="async";void image.decode?.().catch(()=>{})}
  else{image.loading="lazy";image.setAttribute("fetchpriority","low");image.decoding="async"}
 });
}
function renderSlots(stage:HTMLElement,count:number){
 stage.querySelectorAll(":scope > .ynot-bubble-slot").forEach(node=>node.remove());
 if(window.innerWidth<900||count<=0)return;
 const fragment=document.createDocumentFragment();
 for(let i=0;i<count;i++){
  const position=cellPosition(i),slot=document.createElement("span");
  slot.className="ynot-bubble-slot";slot.setAttribute("aria-hidden","true");
  Object.assign(slot.style,{position:"absolute",left:`${position.x}px`,top:`${position.y}px`,width:`${position.size}px`,height:`${position.size}px`,transform:"translate(-50%,-50%)",borderRadius:"50%",pointerEvents:"none",zIndex:"2",border:"1px solid rgba(255,255,255,.12)",background:"radial-gradient(circle at 32% 24%,rgba(255,255,255,.10),rgba(255,255,255,.025) 52%,rgba(0,0,0,.10))",boxShadow:"inset 0 0 18px rgba(255,255,255,.04),0 12px 28px rgba(0,0,0,.08)",opacity:".38"});
  fragment.appendChild(slot);
 }
 stage.insertBefore(fragment,stage.firstChild);
}
function applyLattice(){
 if(typeof window==="undefined")return;
 const shell=document.querySelector<HTMLElement>(".lv4-shell");if(!shell)return;
 const stage=shell.querySelector<HTMLElement>(".lv4-stage");if(!stage)return;
 centerDesktopHome(shell,stage);
 const products=[...stage.querySelectorAll<HTMLElement>(":scope > .lv4-product")];
 if(!products.length){shell.classList.remove("ynot-desktop-lattice-active");stage.querySelectorAll(":scope > .ynot-bubble-slot").forEach(node=>node.remove());return}
 shell.classList.add("ynot-desktop-lattice-active");
 products.forEach((product,index)=>{const {cell,size,x,y}=cellPosition(index),signature=`stable6:${size}:${cell.x}:${cell.y}`;if(product.dataset.ynotLattice===signature&&product.style.getPropertyPriority("left")==="important")return;product.dataset.ynotLattice=signature;product.dataset.ynotLatticeRow=String(cell.y);product.dataset.ynotBufferRing=String(cell.ring);delete product.dataset.hexSlot;setImportant(product,"position","absolute");setImportant(product,"left",`${x}px`);setImportant(product,"top",`${y}px`);setImportant(product,"width",`${size}px`);setImportant(product,"height",`${size}px`);product.style.setProperty("--s",`${size}px`);setImportant(product,"margin","0");setImportant(product,"z-index",String(20+(Math.abs(cell.y)%3)))})
 renderSlots(stage,products.length+SLOT_BUFFER);
 warmImages(products,stage);
}
function activeLayer(shell:HTMLElement):Layer{
 for(const layer of LAYER_ORDER)if(shell.classList.contains(`depth-${layer}`))return layer;
 return"themes";
}
function stageScale(stage:HTMLElement){
 const inline=stage.style.transform.match(/scale\(([-\d.]+)\)/);if(inline)return Number(inline[1])||.82;
 const matrix=getComputedStyle(stage).transform.match(/matrix\(([^)]+)\)/);if(matrix)return Math.abs(Number(matrix[1].split(",")[0]))||.82;
 return.82;
}
function sendZoomTo(target:number){
 const world=document.querySelector<HTMLElement>(".lv4-world"),stage=document.querySelector<HTMLElement>(".lv4-stage");if(!world||!stage)return;
 let current=stageScale(stage),guard=0;
 const cx=Math.round(window.innerWidth*.5),cy=Math.round(window.innerHeight*.5);
 while(Math.abs(current-target)>.045&&guard++<36){const inward=current<target;world.dispatchEvent(new WheelEvent("wheel",{bubbles:true,cancelable:true,clientX:cx,clientY:cy,deltaY:inward?-100:100}));current*=inward?1.075:.94}
}
function ensureZoomControl(){
 const shell=document.querySelector<HTMLElement>(".lv4-shell");if(!shell)return null;
 let control=document.querySelector<HTMLElement>(".ynot-map-zoom");
 if(!control){
  const style=document.createElement("style");style.id="ynot-map-zoom-style";style.textContent=`.ynot-map-zoom{position:fixed;z-index:84;left:84px;bottom:92px;display:flex;align-items:center;gap:4px;padding:4px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(18,18,20,.42);box-shadow:0 12px 38px rgba(0,0,0,.18);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);color:#fff}.ynot-map-zoom button{width:30px;height:30px;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;display:grid;place-items:center;font:500 19px/1 Inter,sans-serif;cursor:pointer}.ynot-map-zoom button:hover{background:rgba(255,255,255,.16)}.ynot-map-zoom button:disabled{opacity:.28;cursor:default}.ynot-map-zoom span{min-width:58px;padding:0 7px;text-align:center;font:650 8px/1 Inter,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.7)}@media(max-width:899px){.ynot-map-zoom{left:auto;right:12px;bottom:96px}.ynot-map-zoom span{display:none}.ynot-map-zoom button{width:32px;height:32px}}.ynot-app-shell.chrome-hidden .ynot-map-zoom{opacity:0;pointer-events:none}`;if(!document.getElementById(style.id))document.head.appendChild(style);
  control=document.createElement("div");control.className="ynot-map-zoom";control.innerHTML='<button type="button" data-zoom="out" aria-label="Zoom out one layer">−</button><span>Layer</span><button type="button" data-zoom="in" aria-label="Zoom in one layer">+</button>';
  const stop=(event:Event)=>event.stopPropagation();control.addEventListener("pointerdown",stop);control.addEventListener("wheel",stop,{passive:true});
  control.addEventListener("click",event=>{const button=(event.target as HTMLElement).closest<HTMLButtonElement>("button[data-zoom]");if(!button)return;event.preventDefault();event.stopPropagation();const current=activeLayer(shell!),index=LAYER_ORDER.indexOf(current),direction=button.dataset.zoom==="in"?1:-1,next=LAYER_ORDER[Math.max(0,Math.min(LAYER_ORDER.length-1,index+direction))];sendZoomTo(LAYER_TARGETS[next]);window.setTimeout(()=>syncZoomControl(),80)});
  document.body.appendChild(control);
 }
 syncZoomControl();return control;
}
function syncZoomControl(){
 const shell=document.querySelector<HTMLElement>(".lv4-shell"),control=document.querySelector<HTMLElement>(".ynot-map-zoom");if(!shell||!control)return;
 const layer=activeLayer(shell),index=LAYER_ORDER.indexOf(layer),label=control.querySelector("span"),out=control.querySelector<HTMLButtonElement>('button[data-zoom="out"]'),zoomIn=control.querySelector<HTMLButtonElement>('button[data-zoom="in"]');if(label)label.textContent=layer; if(out)out.disabled=index===0;if(zoomIn)zoomIn.disabled=index===LAYER_ORDER.length-1;
}

export default function DesktopLatticeController():null{
 useEffect(()=>{
  let frame=0,stageObserver:MutationObserver|null=null,shellObserver:MutationObserver|null=null,rebindTimer:number|null=null;
  const schedule=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;applyLattice();ensureZoomControl();syncZoomControl()})};
  const bindStage=()=>{stageObserver?.disconnect();const stage=document.querySelector<HTMLElement>(".lv4-stage");if(!stage)return false;stageObserver=new MutationObserver(mutations=>{if(mutations.some(m=>m.type==="childList"&&[...m.addedNodes,...m.removedNodes].some(node=>node instanceof Element&&(node.matches?.('.lv4-product')||node.querySelector?.('.lv4-product')))))schedule()});stageObserver.observe(stage,{childList:true});return true};
  const bindShell=()=>{shellObserver?.disconnect();const shell=document.querySelector<HTMLElement>(".lv4-shell");if(!shell)return false;shellObserver=new MutationObserver(()=>syncZoomControl());shellObserver.observe(shell,{attributes:true,attributeFilter:["class"]});return true};
  schedule();bindStage();bindShell();
  const delayed=[80,260].map(ms=>window.setTimeout(()=>{bindStage();bindShell();schedule()},ms));
  const onResize=()=>schedule(),onSearch=()=>{window.setTimeout(()=>{bindStage();bindShell();schedule()},0)},onFocus=()=>schedule(),onPointer=()=>{schedule();syncZoomControl()};
  window.addEventListener("resize",onResize,{passive:true});window.addEventListener("shop:tag-search",onSearch as EventListener);window.addEventListener("ynot:world-focus",onFocus as EventListener);window.addEventListener("pointerup",onPointer,{passive:true});
  rebindTimer=window.setInterval(()=>{if(!document.querySelector(".lv4-stage")){stageObserver?.disconnect();stageObserver=null}else if(!stageObserver)bindStage();if(!document.querySelector(".lv4-shell")){shellObserver?.disconnect();shellObserver=null}else if(!shellObserver)bindShell();ensureZoomControl();syncZoomControl()},2000);
  return()=>{stageObserver?.disconnect();shellObserver?.disconnect();if(frame)cancelAnimationFrame(frame);delayed.forEach(clearTimeout);if(rebindTimer)clearInterval(rebindTimer);window.removeEventListener("resize",onResize);window.removeEventListener("shop:tag-search",onSearch as EventListener);window.removeEventListener("ynot:world-focus",onFocus as EventListener);window.removeEventListener("pointerup",onPointer);document.querySelector(".ynot-map-zoom")?.remove();document.getElementById("ynot-map-zoom-style")?.remove()}
 },[]);
 return null;
}
