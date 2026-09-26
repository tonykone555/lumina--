(()=>{
  const cache=new Map(),lastCycle=new WeakMap(),starts=new Map(),preloaded=new Set(),sessions=new WeakMap();
  const norm=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const isVideo=url=>/\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(String(url||''));
  const mobile=()=>matchMedia('(max-width:760px)').matches;
  const lockWorld=(ms=700)=>{window.__ynotProductGestureLockUntil=Date.now()+ms};
  function titleFor(card){return (card.querySelector('.lv4-detailcopy h2,.ynot-selected-copy h3')?.textContent||'').trim()}
  function keyFor(card){return norm(titleFor(card))}
  function currentImage(card){return card.querySelector(':scope > img')?.src||''}
  function preload(url){if(!url||isVideo(url)||preloaded.has(url))return;preloaded.add(url);const img=new Image();img.decoding='async';img.src=url;img.decode?.().catch(()=>{})}
  function warm(list){list.filter(Boolean).slice(0,16).forEach(preload)}
  function cleanMedia(list){return [...new Set((list||[]).filter(Boolean).map(String).filter(url=>/^https?:|^blob:|^data:/i.test(url)))]}
  function productMedia(product){return cleanMedia([product?.image,...(Array.isArray(product?.images)?product.images:[]),...(Array.isArray(product?.variants)?product.variants.map(v=>v?.image):[]),...(Array.isArray(product?.media)?product.media.map(m=>typeof m==='string'?m:(m?.url||m?.src||m?.image||m?.previewImage?.url||m?.originalSource?.url)):[]),...(Array.isArray(product?.videos)?product.videos:[]),product?.video,product?.videoUrl,product?.video_url])}
  function galleryMedia(card,key){
    const galleries=[...card.querySelectorAll('.ynot-deal-thumb-gallery,.ynot-loaded-gallery,.ynot-rich-gallery,.lv4-gallery')];
    const urls=[];
    for(const gallery of galleries){
      const signature=norm(gallery.dataset?.signature||'');
      if(signature&&key&&!signature.includes(key))continue;
      gallery.querySelectorAll('button').forEach(button=>{const url=button.dataset.mediaUrl||button.querySelector('img,video')?.src||'';if(url)urls.push(url)})
    }
    return cleanMedia(urls)
  }
  function etsyProduct(title){const key=norm(title),map=window.__ynotEtsyProducts||{};const values=Object.values(map);return values.find(p=>norm(p?.title)===key)||values.find(p=>{const t=norm(p?.title);return t&&(t.includes(key)||key.includes(t))})||null}
  function resetForProduct(card){
    const key=keyFor(card);if(!key)return key;
    const session=sessions.get(card);
    if(session?.key===key)return key;
    sessions.set(card,{key,index:-1,media:[]});
    card.dataset.ynotMediaProductKey=key;
    delete card.dataset.ynotFullMediaUrl;delete card.dataset.ynotTapMediaIndex;
    const video=card.querySelector(':scope > .ynot-popup-video');if(video){video.pause();video.removeAttribute('src');video.load()}
    card.classList.remove('ynot-showing-video');
    return key
  }
  async function enrichExact(product){if(!product)return product;try{const response=await fetch('/api/commerce/product-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(product),cache:'force-cache'}),data=await response.json();if(response.ok&&data?.product)return {...product,...data.product}}catch{}return product}
  async function fetchExactProduct(title,key){
    const cacheKey=`catalog:${key}`;
    if(cache.has(cacheKey))return cache.get(cacheKey);
    const promise=(async()=>{
      try{
        const params=new URLSearchParams({q:title,market:'lumina',source:'all',page:'0'}),response=await fetch(`/api/catalog?${params}`,{cache:'force-cache'}),data=await response.json(),products=Array.isArray(data?.products)?data.products:[];
        const exact=products.find(p=>norm(p?.title)===key)||products.find(p=>{const t=norm(p?.title);return t&&key&&(t.includes(key)||key.includes(t))});
        return exact?await enrichExact(exact):null
      }catch{return null}
    })();
    cache.set(cacheKey,promise);return promise
  }
  async function loadMedia(card){
    const title=titleFor(card),key=resetForProduct(card)||norm(title);if(!key)return [];
    const session=sessions.get(card);if(session?.key===key&&session.media.length>1)return session.media;
    const exactEtsy=etsyProduct(title);
    let list=exactEtsy?productMedia(exactEtsy):[];
    if(list.length<2){const exact=await fetchExactProduct(title,key);if(keyFor(card)!==key)return [];list=productMedia(exact)}
    if(list.length<2){const gallery=galleryMedia(card,key);if(gallery.length>list.length)list=gallery}
    if(!list.length){const current=currentImage(card);if(current)list=[current]}
    if(keyFor(card)!==key)return [];
    const active=sessions.get(card);if(!active||active.key!==key)return [];
    active.media=cleanMedia(list);active.index=-1;warm(active.media);return active.media
  }
  function syncThumbs(card,url){card.querySelectorAll('.ynot-loaded-gallery button,.ynot-rich-gallery button,.lv4-gallery button,.ynot-deal-thumb-gallery button').forEach(button=>{const src=button.dataset.mediaUrl||button.querySelector('img,video')?.src||'';button.classList.toggle('active',src===url)})}
  function showMedia(card,url,key){if(!url||keyFor(card)!==key)return;let video=card.querySelector(':scope > .ynot-popup-video');const image=card.querySelector(':scope > img');if(isVideo(url)){if(!video){video=document.createElement('video');video.className='ynot-popup-video';video.controls=true;video.playsInline=true;video.muted=true;image?.insertAdjacentElement('afterend',video)}video.src=url;video.load();card.classList.add('ynot-showing-video');video.play().catch(()=>{})}else{preload(url);if(video){video.pause();video.removeAttribute('src');video.load()}card.classList.remove('ynot-showing-video');if(image){image.decoding='async';image.src=url}syncThumbs(card,url)}card.dataset.ynotFullMediaUrl=url}
  function thumbUrl(button){return button.dataset.mediaUrl||button.querySelector('img,video')?.src||''}
  async function cycle(card){
    const key=resetForProduct(card);if(!key)return;
    const now=Date.now();if((lastCycle.get(card)||0)>now-260)return;lastCycle.set(card,now);lockWorld();
    const media=await loadMedia(card);if(keyFor(card)!==key||media.length<2)return;
    const session=sessions.get(card);if(!session||session.key!==key)return;
    const current=card.dataset.ynotFullMediaUrl||currentImage(card);
    let currentIndex=media.findIndex(url=>url===current);
    if(currentIndex<0)currentIndex=session.index>=0?session.index:-1;
    const next=(currentIndex+1)%media.length;session.index=next;card.dataset.ynotTapMediaIndex=String(next);
    preload(media[(next+1)%media.length]);showMedia(card,media[next],key)
  }
  function mainDealImage(target){if(!(target instanceof Element))return null;const card=target.closest('.ynot-drawer.open .ynot-selected');if(!card)return null;const main=card.querySelector(':scope > img');return target===main?{card,main}:null}
  document.addEventListener('pointerdown',e=>{const hit=mainDealImage(e.target);if(mobile()&&hit){lockWorld();starts.set(e.pointerId,{x:e.clientX,y:e.clientY,card:hit.card,mobileDeal:true});return}const t=e.target;if(!(t instanceof Element))return;const card=t.closest('.lv4-detail,.ynot-selected');if(!card)return;resetForProduct(card);const main=card.querySelector(':scope > img');if(t===main)starts.set(e.pointerId,{x:e.clientX,y:e.clientY,card})},true);
  document.addEventListener('pointerup',e=>{const s=starts.get(e.pointerId);if(!s)return;starts.delete(e.pointerId);const dx=e.clientX-s.x,dy=e.clientY-s.y;if(s.mobileDeal){lockWorld();return}if(Math.hypot(dx,dy)<=14)void cycle(s.card)},true);
  document.addEventListener('pointercancel',e=>starts.delete(e.pointerId),true);
  document.addEventListener('click',event=>{const hit=mainDealImage(event.target);if(mobile()&&hit){event.preventDefault();event.stopImmediatePropagation();lockWorld();void cycle(hit.card);return}const target=event.target;if(!(target instanceof Element))return;const card=target.closest('.lv4-detail,.ynot-selected');if(!card)return;const key=resetForProduct(card);const thumb=target.closest('.ynot-loaded-gallery button,.ynot-rich-gallery button,.lv4-gallery button,.ynot-deal-thumb-gallery button');if(thumb){const url=thumbUrl(thumb);if(url){event.preventDefault();event.stopPropagation();showMedia(card,url,key)}return}if(target instanceof HTMLVideoElement&&target.classList.contains('ynot-popup-video')){event.preventDefault();event.stopPropagation();void cycle(card);return}if(target===card.querySelector(':scope > img')){event.preventDefault();event.stopPropagation();void cycle(card);return}if(card.classList.contains('ynot-selected')){if(target.closest('button,a,input,select,textarea,video,.ynot-deal-thumb-gallery,.ynot-selected-copy,.ynot-variants'))return;event.preventDefault();event.stopPropagation();void cycle(card)}},true);
  if(!window.PointerEvent){document.addEventListener('touchstart',e=>{const hit=mainDealImage(e.target);if(!hit)return;const touch=e.changedTouches?.[0];if(!touch)return;lockWorld();hit.card.__ynotTouchStart={x:touch.clientX,y:touch.clientY,time:Date.now()}},{passive:true,capture:true});document.addEventListener('touchend',e=>{const hit=mainDealImage(e.target);if(!hit)return;const touch=e.changedTouches?.[0],start=hit.card.__ynotTouchStart;delete hit.card.__ynotTouchStart;if(!touch||!start)return;if(Date.now()-start.time>500||Math.hypot(touch.clientX-start.x,touch.clientY-start.y)>16)return;e.preventDefault();e.stopImmediatePropagation();lockWorld();void cycle(hit.card)},{passive:false,capture:true})}
  let lastOpenKey='';
  const observer=new MutationObserver(()=>{document.querySelectorAll('.lv4-detail,.ynot-selected').forEach(card=>{const key=resetForProduct(card);if(card.matches('.ynot-drawer.open .ynot-selected')&&key&&key!==lastOpenKey){lastOpenKey=key;delete card.dataset.ynotFullMediaUrl;delete card.dataset.ynotTapMediaIndex}const main=card.querySelector(':scope > img');if(main){main.decoding='async';main.style.cursor='pointer'}void loadMedia(card)})});
  const start=()=>{observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['src']});document.querySelectorAll('.lv4-detail,.ynot-selected').forEach(card=>void loadMedia(card))};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();