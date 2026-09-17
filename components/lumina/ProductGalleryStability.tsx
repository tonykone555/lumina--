"use client";

import {useEffect} from "react";

function uniqueImages(signature:string){return [...new Set(signature.split("|").map(x=>x.trim()).filter(Boolean))]}

function openViewer(images:string[],startIndex:number){
 document.querySelector(".ynot-complete-image-viewer")?.remove();
 if(!images.length)return;
 let index=Math.max(0,Math.min(startIndex,images.length-1));
 let startX:number|null=null,startY:number|null=null,dragged=false;
 const viewer=document.createElement("section");viewer.className="ynot-complete-image-viewer";viewer.tabIndex=0;viewer.setAttribute("aria-label","Product images");
 const image=document.createElement("img");image.className="ynot-complete-image";image.draggable=false;image.alt="Product image";
 const close=document.createElement("button");close.type="button";close.className="ynot-complete-image-close";close.textContent="×";close.setAttribute("aria-label","Close images");
 const render=()=>{image.src=images[index];image.dataset.index=String(index);const next=images[(index+1)%images.length];if(next){const warm=new Image();warm.src=next}};
 const move=(delta:number)=>{index=(index+delta+images.length)%images.length;render()};
 close.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();viewer.remove()});
 image.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();if(dragged){dragged=false;return}move(1)});
 viewer.addEventListener("pointerdown",e=>{if((e.target as Element).closest(".ynot-complete-image-close"))return;startX=e.clientX;startY=e.clientY;dragged=false;viewer.setPointerCapture?.(e.pointerId)});
 viewer.addEventListener("pointermove",e=>{if(startX===null||startY===null)return;const dx=e.clientX-startX,dy=e.clientY-startY;if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)){dragged=true;e.preventDefault()}});
 viewer.addEventListener("pointerup",e=>{if(startX===null||startY===null)return;const dx=e.clientX-startX,dy=e.clientY-startY;startX=null;startY=null;if(Math.abs(dx)>38&&Math.abs(dx)>Math.abs(dy)){dragged=true;move(dx<0?1:-1)}});
 viewer.addEventListener("pointercancel",()=>{startX=null;startY=null;dragged=false});
 viewer.addEventListener("keydown",e=>{if(e.key==="ArrowLeft")move(-1);if(e.key==="ArrowRight")move(1);if(e.key==="Escape")viewer.remove()});
 viewer.append(image,close);document.body.appendChild(viewer);render();requestAnimationFrame(()=>viewer.focus());
}

function rebuildGallery(gallery:HTMLElement){
 const signature=gallery.dataset.mediaSignature||"";if(!signature)return;
 const images=uniqueImages(signature);if(images.length<2)return;
 const marker=`${signature}:${window.innerWidth<900?"m":"d"}`;if(gallery.dataset.ynotCompleteMarker===marker)return;
 gallery.dataset.ynotCompleteMarker=marker;
 const maxTiles=window.innerWidth<900?5:7;
 const hasMore=images.length>maxTiles;
 const normalCount=hasMore?maxTiles-1:images.length;
 gallery.replaceChildren();
 images.slice(0,normalCount).forEach((src,index)=>{
  const button=document.createElement("button");button.type="button";button.className="ynot-complete-thumb";button.setAttribute("aria-label",`Open product image ${index+1}`);
  const img=document.createElement("img");img.src=src;img.alt="";img.draggable=false;button.appendChild(img);
  button.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();openViewer(images,index)});gallery.appendChild(button)
 });
 if(hasMore){const index=normalCount,button=document.createElement("button");button.type="button";button.className="ynot-complete-thumb ynot-gallery-more";button.dataset.more=`+${images.length-normalCount}`;button.setAttribute("aria-label",`Open all ${images.length} product images`);const img=document.createElement("img");img.src=images[index];img.alt="";img.draggable=false;button.appendChild(img);button.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();openViewer(images,index)});gallery.appendChild(button)}
}

export default function ProductGalleryStability(){
 useEffect(()=>{
  let frame=0;const scan=()=>{frame=0;document.querySelectorAll<HTMLElement>(".ynot-loaded-gallery").forEach(rebuildGallery);document.querySelectorAll<HTMLElement>(".lv4-gallery,.lv4-gallery-nav,.lv4-gallery-count,.lv4-gallery-prev,.lv4-gallery-next").forEach(el=>{el.style.setProperty("display","none","important")})};
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(scan)};schedule();const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["data-media-signature"]});window.addEventListener("resize",schedule,{passive:true});return()=>{observer.disconnect();window.removeEventListener("resize",schedule);if(frame)cancelAnimationFrame(frame);document.querySelector(".ynot-complete-image-viewer")?.remove()}
 },[]);
 return <style>{`
 .lv4-detail .ynot-loaded-gallery{left:auto!important;right:auto!important;margin:8px auto 4px!important;justify-content:center!important;width:fit-content!important;max-width:min(92%,620px)!important;overflow:hidden!important;display:flex!important;gap:7px!important;padding:4px 8px!important}
 .lv4-detail .ynot-loaded-gallery>.ynot-complete-thumb{position:relative!important;flex:0 0 58px!important;width:58px!important;height:54px!important;min-width:58px!important;min-height:54px!important;padding:0!important;border-radius:13px!important;overflow:hidden!important;border:1px solid rgba(255,255,255,.24)!important;background:rgba(255,255,255,.07)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 5px 16px rgba(0,0,0,.14)!important;cursor:pointer!important}
 .lv4-detail .ynot-loaded-gallery>.ynot-complete-thumb img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;border-radius:11px!important}
 .lv4-detail .ynot-loaded-gallery>.ynot-gallery-more img{filter:blur(5px) brightness(.62)!important;transform:scale(1.12)!important}.lv4-detail .ynot-loaded-gallery>.ynot-gallery-more:before{content:""!important;position:absolute!important;inset:0!important;z-index:2!important;background:rgba(8,8,8,.18)!important}.lv4-detail .ynot-loaded-gallery>.ynot-gallery-more:after{content:attr(data-more)!important;position:absolute!important;inset:0!important;z-index:3!important;display:grid!important;place-items:center!important;color:#fff!important;font:800 11px/1 system-ui,-apple-system,sans-serif!important;text-shadow:0 1px 7px rgba(0,0,0,.65)!important}
 .ynot-complete-image-viewer{position:fixed!important;inset:0!important;z-index:2147483647!important;display:grid!important;place-items:center!important;background:rgba(5,5,5,.78)!important;backdrop-filter:blur(26px)!important;-webkit-backdrop-filter:blur(26px)!important;padding:72px 28px!important;overflow:hidden!important;touch-action:none!important;outline:none!important}.ynot-complete-image{display:block!important;max-width:min(88vw,1120px)!important;max-height:84vh!important;width:auto!important;height:auto!important;object-fit:contain!important;border-radius:22px!important;box-shadow:0 28px 90px rgba(0,0,0,.42)!important;user-select:none!important;-webkit-user-drag:none!important}.ynot-complete-image-close{position:fixed!important;top:max(14px,env(safe-area-inset-top))!important;right:16px!important;width:44px!important;height:44px!important;border-radius:999px!important;display:grid!important;place-items:center!important;border:1px solid rgba(255,255,255,.22)!important;background:rgba(20,20,20,.45)!important;color:#fff!important;font-size:27px!important;line-height:1!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important;z-index:2!important}
 .ynot-full-slider{display:none!important}
 @media(max-width:899px){.lv4-detail .ynot-loaded-gallery{max-width:94%!important;gap:5px!important;padding:4px 5px!important}.lv4-detail .ynot-loaded-gallery>.ynot-complete-thumb{flex-basis:48px!important;width:48px!important;min-width:48px!important;height:46px!important;min-height:46px!important;border-radius:11px!important}.ynot-complete-image-viewer{padding:64px 12px!important}.ynot-complete-image{max-width:96vw!important;max-height:78vh!important;border-radius:18px!important}}
 `}</style>
}
