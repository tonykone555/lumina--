(()=>{
  const cache=new Map();
  const bound=new WeakMap();
  const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const isVideo=u=>/\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(String(u||''));
  const mediaUrl=m=>typeof m==='string'?m:(m?.url||m?.src||m?.video||m?.image||m?.previewImage?.url||m?.originalSource?.url||'');
  const titleOf=s=>(s.querySelector('.ynot-selected-copy h3')?.textContent||'').trim();
  const productKey=s=>norm(titleOf(s));

  function killViewers(){document.querySelectorAll('.ynot-final-media-viewer,.ynot-deal-gallery-viewer,.ynot-full-slider,.ynot-deal-full-slider').forEach(n=>n.remove())}

  async function exactProduct(title){
    const key=norm(title);if(!key)return null;if(cache.has(key))return cache.get(key);
    const job=(async()=>{try{
      const r=await fetch(`/api/catalog?${new URLSearchParams({q:title,market:'lumina',source:'all',page:'0'})}`,{cache:'no-store'}),d=await r.json(),list=Array.isArray(d?.products)?d.products:[];
      let p=list.find(x=>norm(x?.title)===key)||list.find(x=>{const t=norm(x?.title);return t&&(t.includes(key)||key.includes(t))})||list[0]||null;
      if(p&&String(p.source||'').toLowerCase().includes('shopify'))try{const rr=await fetch('/api/commerce/product-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),cache:'no-store'}),dd=await rr.json();if(rr.ok&&dd?.product)p={...p,...dd.product,url:dd.url||dd.product.url||p.url}}catch{}
      return p
    }catch{return null}})();cache.set(key,job);return job
  }

  const collectMedia=(p,f)=>[...new Set([p?.image,...(p?.images||[]),...(p?.variants||[]).map(v=>v?.image),...(p?.videos||[]),p?.video,p?.videoUrl,p?.video_url,...(p?.media||[]).map(mediaUrl),f].filter(Boolean).map(String))];

  function lockStage(s){
    const img=s.querySelector(':scope > img');if(!img)return;
    img.style.setProperty('left','50%','important');img.style.setProperty('right','auto','important');img.style.setProperty('transform','translateX(-50%)','important');img.style.setProperty('margin','0','important');img.style.setProperty('object-position','center','important');img.style.setProperty('pointer-events','auto','important');img.style.setProperty('touch-action','manipulation','important');img.style.cursor='pointer';img.style.zIndex='40'
  }

  function showMedia(s,url){
    if(!url)return;killViewers();const img=s.querySelector(':scope > img');let v=s.querySelector(':scope > .ynot-popup-video');
    if(isVideo(url)){
      if(!v){v=document.createElement('video');v.className='ynot-popup-video';v.controls=true;v.playsInline=true;v.muted=true;img?.insertAdjacentElement('afterend',v)}
      v.src=url;v.load();s.classList.add('ynot-showing-video');v.play().catch(()=>{})
    }else{
      if(v){v.pause();v.removeAttribute('src');v.load()}s.classList.remove('ynot-showing-video');if(img)img.src=url
    }
    s.dataset.ynotFullMediaUrl=url;
    s.querySelectorAll('.ynot-deal-thumb-gallery-final button[data-media-url]').forEach(b=>b.classList.toggle('active',b.dataset.mediaUrl===url));
    lockStage(s)
  }

  function nextMedia(s){
    let media=[];try{media=JSON.parse(s.dataset.ynotFinalMedia||'[]')}catch{}
    if(media.length<2)return;
    const img=s.querySelector(':scope > img');const current=s.dataset.ynotFullMediaUrl||img?.currentSrc||img?.src||media[0];let index=media.indexOf(current);if(index<0)index=Number(s.dataset.ynotMediaIndex||0);
    const next=(index+1)%media.length;s.dataset.ynotMediaIndex=String(next);showMedia(s,media[next])
  }

  function bindMain(s,img,key){
    const old=bound.get(img);if(old===key)return;bound.set(img,key);
    let down=null,last=0;
    img.addEventListener('pointerdown',e=>{if(productKey(s)!==key)return;down={x:e.clientX,y:e.clientY,id:e.pointerId}},true);
    img.addEventListener('pointerup',e=>{if(productKey(s)!==key||!down||down.id!==e.pointerId)return;const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;if(moved>16)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();last=Date.now();nextMedia(s)},true);
    img.addEventListener('click',e=>{if(productKey(s)!==key)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(Date.now()-last>450)nextMedia(s)},true);
    if(!window.PointerEvent){let ts=null;img.addEventListener('touchstart',e=>{const t=e.changedTouches?.[0];if(t)ts={x:t.clientX,y:t.clientY}},{passive:true,capture:true});img.addEventListener('touchend',e=>{const t=e.changedTouches?.[0];if(!t||!ts)return;const moved=Math.hypot(t.clientX-ts.x,t.clientY-ts.y);ts=null;if(moved>16)return;e.preventDefault();e.stopImmediatePropagation();nextMedia(s)},{passive:false,capture:true})}
  }

  function buildThumb(url,title,i,s,key){
    const b=document.createElement('button');b.type='button';b.className='ynot-deal-thumb';b.dataset.mediaUrl=url;b.setAttribute('aria-label',`Show product media ${i+1}`);
    const el=isVideo(url)?document.createElement('video'):document.createElement('img');if(isVideo(url)){el.src=url;el.muted=true;el.playsInline=true;el.preload='metadata'}else{el.src=url;el.alt=`${title} view ${i+1}`};b.appendChild(el);
    b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(productKey(s)===key){s.dataset.ynotMediaIndex=String(i);showMedia(s,url)}},true);return b
  }

  async function rebuild(s){
    killViewers();const title=titleOf(s),img=s.querySelector(':scope > img');if(!title||!img)return;const key=norm(title);lockStage(s);
    const existing=s.querySelector(':scope > .ynot-deal-thumb-gallery-final');if(existing?.dataset.productKey===key&&s.dataset.ynotFinalMedia){bindMain(s,img,key);return}
    existing?.remove();const p=await exactProduct(title);if(!s.isConnected||productKey(s)!==key)return;const media=collectMedia(p,img.src);if(!media.length)return;
    s.dataset.ynotFinalMedia=JSON.stringify(media);if(!s.dataset.ynotFullMediaUrl)s.dataset.ynotFullMediaUrl=img.src||media[0];
    const g=document.createElement('div');g.className='ynot-deal-thumb-gallery ynot-deal-thumb-gallery-final';g.dataset.productKey=key;const limit=Math.min(media.length,4);
    media.slice(0,limit).forEach((url,i)=>{const b=buildThumb(url,title,i,s,key);if((s.dataset.ynotFullMediaUrl||img.src)===url)b.classList.add('active');g.appendChild(b)});
    if(media.length>limit){const more=document.createElement('button');more.type='button';more.className='ynot-deal-thumb ynot-deal-thumb-count';more.textContent=`+${media.length-limit}`;more.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();nextMedia(s)},true);g.appendChild(more)}
    img.insertAdjacentElement('afterend',g);bindMain(s,img,key)
  }

  let queued=false;function sync(){queued=false;killViewers();const s=document.querySelector('.ynot-drawer.open .ynot-selected');if(!s)return;void rebuild(s)}function queue(){if(!queued){queued=true;requestAnimationFrame(sync)}}
  const start=()=>{killViewers();new MutationObserver(queue).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});sync()};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();