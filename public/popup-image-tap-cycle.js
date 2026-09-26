(()=>{
  const cache=new Map(),lastCycle=new WeakMap(),starts=new Map(),preloaded=new Set();
  const norm=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const isVideo=url=>/\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(String(url||''));
  const mobile=()=>matchMedia('(max-width:760px)').matches;
  const lockWorld=(ms=700)=>{window.__ynotProductGestureLockUntil=Date.now()+ms};
  function titleFor(card){return (card.querySelector('.lv4-detailcopy h2,.ynot-selected-copy h3')?.textContent||'').trim()}
  function currentImage(card){return card.querySelector(':scope > img')?.src||''}
  function preload(url){if(!url||isVideo(url)||preloaded.has(url))return;preloaded.add(url);const img=new Image();img.decoding='async';img.src=url;img.decode?.().catch(()=>{})}
  function warm(list){list.filter(Boolean).slice(0,12).forEach(preload)}
  function galleryMedia(card){return [...card.querySelectorAll('.ynot-loaded-gallery button,.ynot-rich-gallery button,.lv4-gallery button,.ynot-deal-thumb-gallery button')].map(button=>button.dataset.mediaUrl||button.querySelector('img,video')?.src||'').filter(Boolean)}
  function collectProductMedia(product,current,stable=false){const raw=stable?[product?.image,...(Array.isArray(product?.images)?product.images:[]),...(Array.isArray(product?.variants)?product.variants.map(v=>v?.image):[]),...(Array.isArray(product?.videos)?product.videos:[]),product?.video,product?.videoUrl,product?.video_url,...(Array.isArray(product?.media)?product.media.map(m=>typeof m==='string'?m:(m?.url||m?.src||m?.video||m?.image||m?.previewImage?.url||m?.originalSource?.url)):[])]:[current,product?.image,...(Array.isArray(product?.images)?product.images:[]),...(Array.isArray(product?.variants)?product.variants.map(v=>v?.image):[]),...(Array.isArray(product?.videos)?product.videos:[]),product?.video,product?.videoUrl,product?.video_url,...(Array.isArray(product?.media)?product.media.map(m=>typeof m==='string'?m:(m?.url||m?.src||m?.video||m?.image||m?.previewImage?.url||m?.originalSource?.url)):[])];const list=[...new Set(raw.filter(Boolean).map(String))];if(stable&&current&&!list.includes(current))list.unshift(current);return list}
  function etsyProduct(title){const key=norm(title),map=window.__ynotEtsyProducts||{};const values=Object.values(map);return values.find(p=>norm(p?.title)===key)||values.find(p=>{const t=norm(p?.title);return t&&(t.includes(key)||key.includes(t))})||null}
  function resetForProduct(card){const key=norm(titleFor(card));if(!key)return key;if(card.dataset.ynotMediaProductKey===key)return key;card.dataset.ynotMediaProductKey=key;delete card.dataset.ynotFinalMedia;delete card.dataset.ynotFullMediaUrl;const video=card.querySelector(':scope > .ynot-popup-video');if(video){video.pause();video.removeAttribute('src');video.load()}card.classList.remove('ynot-showing-video');return key}
  async function enrichExact(product){if(!product)return product;try{const response=await fetch('/api/commerce/product-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(product),cache:'force-cache'}),data=await response.json();if(response.ok&&data?.product)return {...product,...data.product}}catch{}return product}
  async function loadMedia(card){
    const title=titleFor(card),key=resetForProduct(card)||norm(title),current=currentImage(card),visibleGallery=galleryMedia(card);
    if(visibleGallery.length>1){const list=[...new Set(visibleGallery.filter(Boolean))];if(current&&!list.includes(current))list.push(current);warm(list);return list}
    if(!title)return current?[current]:[];
    const exactEtsy=etsyProduct(title);
    if(exactEtsy){const cacheKey=`etsy:${String(exactEtsy.id||key)}`;if(cache.has(cacheKey)){const cached=await cache.get(cacheKey);warm(cached);return cached}const list=collectProductMedia(exactEtsy,current,true);warm(list);cache.set(cacheKey,Promise.resolve(list));return list}
    const preset=card.dataset.ynotFinalMedia;
    try{const parsed=JSON.parse(preset||'[]');if(Array.isArray(parsed)&&parsed.length>1){const list=[...new Set(parsed.filter(Boolean).map(String))];if(current&&!list.includes(current))list.push(current);warm(list);return list}}catch{}
    if(cache.has(key)){const list=await cache.get(key);warm(list);return list}
    const promise=(async()=>{try{const params=new URLSearchParams({q:title,market:'lumina',source:'all',page:'0'}),response=await fetch(`/api/catalog?${params}`,{cache:'force-cache'}),data=await response.json(),products=Array.isArray(data?.products)?data.products:[],base=products.find(p=>norm(p?.title)===key)||products.find(p=>norm(p?.title).includes(key)||key.includes(norm(p?.title)))||products[0],exact=await enrichExact(base),list=collectProductMedia(exact,current,true);warm(list);return list}catch{return current?[current]:[]}})();cache.set(key,promise);return promise
  }
  function syncThumbs(card,url){card.querySelectorAll('.ynot-loaded-gallery button,.ynot-rich-gallery button,.lv4-gallery button,.ynot-deal-thumb-gallery button').forEach(button=>{const src=button.dataset.mediaUrl||button.querySelector('img,video')?.src||'';button.classList.toggle('active',src===url)})}
  function showMedia(card,url){if(!url)return;resetForProduct(card);let video=card.querySelector(':scope > .ynot-popup-video');const image=card.querySelector(':scope > img');if(isVideo(url)){if(!video){video=document.createElement('video');video.className='ynot-popup-video';video.controls=true;video.playsInline=true;video.muted=true;image?.insertAdjacentElement('afterend',video)}video.src=url;video.load();card.classList.add('ynot-showing-video');video.play().catch(()=>{})}else{preload(url);if(video){video.pause();video.removeAttribute('src');video.load()}card.classList.remove('ynot-showing-video');if(image){image.decoding='async';image.src=url}syncThumbs(card,url)}card.dataset.ynotFullMediaUrl=url}
  function thumbUrl(button){return button.dataset.mediaUrl||button.querySelector('img,video')?.src||''}
  async function cycle(card){resetForProduct(card);const now=Date.now();if((lastCycle.get(card)||0)>now-500)return;lastCycle.set(card,now);lockWorld();const media=await loadMedia(card);if(media.length<2)return;const current=card.dataset.ynotFullMediaUrl||currentImage(card);let index=media.findIndex(url=>url===current);if(index<0)index=0;const next=media[(index+1)%media.length];preload(media[(index+2)%media.length]);showMedia(card,next)}
  function mainDealImage(target){if(!(target instanceof Element))return null;const card=target.closest('.ynot-drawer.open .ynot-selected');if(!card)return null;const main=card.querySelector(':scope > img');return target===main?{card,main}:null}

  /* Mobile hero image fully owns the gesture. Stop it before any world/card handler
     behind the glass drawer can see pointer/touch/click events. */
  document.addEventListener('pointerdown',e=>{
    const hit=mainDealImage(e.target);
    if(mobile()&&hit){e.preventDefault();e.stopImmediatePropagation();lockWorld();starts.set(e.pointerId,{x:e.clientX,y:e.clientY,card:hit.card,mobileDeal:true});return}
    const t=e.target;if(!(t instanceof Element))return;const card=t.closest('.lv4-detail,.ynot-selected');if(!card)return;resetForProduct(card);const main=card.querySelector(':scope > img');if(t===main)starts.set(e.pointerId,{x:e.clientX,y:e.clientY,card})
  },true);
  document.addEventListener('pointerup',e=>{
    const s=starts.get(e.pointerId);if(!s)return;starts.delete(e.pointerId);const dx=e.clientX-s.x,dy=e.clientY-s.y;
    if(s.mobileDeal){e.preventDefault();e.stopImmediatePropagation();lockWorld();if(Math.hypot(dx,dy)<=16)void cycle(s.card);return}
    if(Math.hypot(dx,dy)<=14)void cycle(s.card)
  },true);
  document.addEventListener('pointercancel',e=>starts.delete(e.pointerId),true);

  document.addEventListener('click',event=>{
    const hit=mainDealImage(event.target);
    if(mobile()&&hit){event.preventDefault();event.stopImmediatePropagation();lockWorld();return}
    const target=event.target;if(!(target instanceof Element))return;const card=target.closest('.lv4-detail,.ynot-selected');if(!card)return;resetForProduct(card);const thumb=target.closest('.ynot-loaded-gallery button,.ynot-rich-gallery button,.lv4-gallery button,.ynot-deal-thumb-gallery button');if(thumb){const url=thumbUrl(thumb);if(url){event.preventDefault();event.stopPropagation();showMedia(card,url)}return}if(target instanceof HTMLVideoElement&&target.classList.contains('ynot-popup-video')){event.preventDefault();event.stopPropagation();void cycle(card);return}if(target===card.querySelector(':scope > img')){event.preventDefault();event.stopPropagation();void cycle(card);return}if(card.classList.contains('ynot-selected')){if(target.closest('button,a,input,select,textarea,video,.ynot-deal-thumb-gallery,.ynot-selected-copy,.ynot-variants'))return;event.preventDefault();event.stopPropagation();void cycle(card)}
  },true);

  /* Touch fallback for older iOS only when Pointer Events are unavailable. */
  if(!window.PointerEvent){
    document.addEventListener('touchstart',e=>{const hit=mainDealImage(e.target);if(!hit)return;const touch=e.changedTouches?.[0];if(!touch)return;e.preventDefault();e.stopImmediatePropagation();lockWorld();hit.card.__ynotTouchStart={x:touch.clientX,y:touch.clientY,time:Date.now()}},{passive:false,capture:true});
    document.addEventListener('touchend',e=>{const hit=mainDealImage(e.target);if(!hit)return;const touch=e.changedTouches?.[0],start=hit.card.__ynotTouchStart;delete hit.card.__ynotTouchStart;e.preventDefault();e.stopImmediatePropagation();lockWorld();if(!touch||!start)return;if(Date.now()-start.time>500||Math.hypot(touch.clientX-start.x,touch.clientY-start.y)>16)return;void cycle(hit.card)},{passive:false,capture:true});
  }

  const observer=new MutationObserver(()=>{document.querySelectorAll('.lv4-detail,.ynot-selected').forEach(card=>{resetForProduct(card);const main=card.querySelector(':scope > img');if(main){main.decoding='async';main.style.cursor='pointer';preload(main.src)}void loadMedia(card)})});
  const start=()=>{observer.observe(document.body,{subtree:true,childList:true,characterData:true});document.querySelectorAll('.lv4-detail,.ynot-selected').forEach(card=>void loadMedia(card))};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();