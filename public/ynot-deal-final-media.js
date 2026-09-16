(()=>{
  const cache=new Map();
  const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const isVideo=u=>/\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(String(u||''));
  const mediaUrl=m=>typeof m==='string'?m:(m?.url||m?.src||m?.video||m?.image||m?.previewImage?.url||m?.originalSource?.url||'');
  function titleOf(shell){return (shell.querySelector('.lv4-detailcopy h2,.ynot-selected-copy h3')?.textContent||'').trim()}
  async function exactProduct(title){
    const key=norm(title);if(!key)return null;if(cache.has(key))return cache.get(key);
    const job=(async()=>{try{
      const params=new URLSearchParams({q:title,market:'lumina',source:'all',page:'0'});
      const r=await fetch(`/api/catalog?${params}`,{cache:'no-store'}),d=await r.json();
      const list=Array.isArray(d?.products)?d.products:[];
      let p=list.find(x=>norm(x?.title)===key)||list.find(x=>norm(x?.title).includes(key)||key.includes(norm(x?.title)))||list[0]||null;
      if(!p)return null;
      if(String(p.source||'').toLowerCase().includes('shopify')){
        try{const rr=await fetch('/api/commerce/product-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),cache:'no-store'}),dd=await rr.json();if(rr.ok&&dd?.product)p={...p,...dd.product,url:dd.url||dd.product.url||p.url};}catch{}
      }
      return p;
    }catch{return null}})();cache.set(key,job);return job;
  }
  function collectMedia(product,current){
    const raw=[current,product?.image,...(product?.images||[]),...(product?.variants||[]).map(v=>v?.image),...(product?.videos||[]),product?.video,product?.videoUrl,product?.video_url,...(product?.media||[]).map(mediaUrl)].filter(Boolean).map(String);
    return [...new Set(raw)];
  }
  function showMedia(shell,url){
    const img=shell.querySelector(':scope > img');let video=shell.querySelector(':scope > .ynot-popup-video');
    if(isVideo(url)){
      if(!video){video=document.createElement('video');video.className='ynot-popup-video';video.controls=true;video.playsInline=true;video.muted=true;img?.insertAdjacentElement('afterend',video)}
      video.src=url;video.load();shell.classList.add('ynot-showing-video');video.play().catch(()=>{});
    }else{
      if(video){video.pause();video.removeAttribute('src');video.load()}
      shell.classList.remove('ynot-showing-video');if(img)img.src=url;
    }
    shell.dataset.ynotFullMediaUrl=url;
    shell.querySelectorAll('.ynot-deal-thumb-gallery button').forEach(b=>b.classList.toggle('active',b.dataset.mediaUrl===url));
  }
  function makeThumb(url,title,index){
    if(isVideo(url)){
      const v=document.createElement('video');v.src=url;v.muted=true;v.playsInline=true;v.preload='metadata';v.setAttribute('aria-label',`${title} video ${index+1}`);return v;
    }
    const i=document.createElement('img');i.src=url;i.alt=`${title} view ${index+1}`;return i;
  }
  function openViewer(shell,media,start=0){
    shell.querySelector('.ynot-full-slider')?.remove();
    if(!media.length)return;
    let index=Math.max(0,Math.min(start,media.length-1));
    const slider=document.createElement('section');slider.className='ynot-full-slider ynot-deal-full-slider';slider.setAttribute('aria-label','Product media slider');slider.tabIndex=0;
    const stage=document.createElement('div');stage.className='ynot-deal-full-slider-stage';
    const close=document.createElement('button');close.type='button';close.className='ynot-full-slider-close';close.textContent='×';close.setAttribute('aria-label','Close media slider');
    const prev=document.createElement('button');prev.type='button';prev.className='ynot-full-slider-prev';prev.textContent='‹';prev.setAttribute('aria-label','Previous media');
    const next=document.createElement('button');next.type='button';next.className='ynot-full-slider-next';next.textContent='›';next.setAttribute('aria-label','Next media');
    const count=document.createElement('span');count.className='ynot-full-slider-count';
    const render=()=>{stage.replaceChildren();const url=media[index];if(isVideo(url)){const v=document.createElement('video');v.src=url;v.controls=true;v.playsInline=true;v.autoplay=true;v.className='ynot-full-slider-image';stage.appendChild(v)}else{const i=document.createElement('img');i.src=url;i.alt='Product view';i.className='ynot-full-slider-image';stage.appendChild(i)}count.textContent=`${index+1} / ${media.length}`};
    const move=d=>{index=(index+d+media.length)%media.length;render()};
    close.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();slider.remove()});
    prev.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();move(-1)});
    next.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();move(1)});
    slider.addEventListener('click',e=>e.stopPropagation());
    slider.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')move(-1);if(e.key==='ArrowRight')move(1);if(e.key==='Escape')slider.remove()});
    slider.append(stage,close,prev,next,count);shell.appendChild(slider);render();requestAnimationFrame(()=>slider.focus());
  }
  async function rebuildGallery(shell){
    if(!(shell instanceof HTMLElement))return;const title=titleOf(shell),main=shell.querySelector(':scope > img');if(!title||!main)return;
    const signature=`final3:${norm(title)}`;const existing=shell.querySelector('.ynot-deal-thumb-gallery');if(existing?.dataset.finalSignature===signature)return;
    const product=await exactProduct(title);if(!document.body.contains(shell)||titleOf(shell)!==title)return;
    const media=collectMedia(product,main.src);if(!media.length)return;
    existing?.remove();
    const gallery=document.createElement('div');gallery.className='ynot-deal-thumb-gallery ynot-deal-thumb-gallery-final';gallery.dataset.finalSignature=signature;
    const visible=Math.min(media.length,4);
    media.slice(0,visible).forEach((url,index)=>{
      const b=document.createElement('button');b.type='button';b.dataset.mediaUrl=url;b.appendChild(makeThumb(url,title,index));if(index===0)b.classList.add('active');
      const more=media.length>4&&index===visible-1;
      if(more){b.classList.add('ynot-deal-thumb-more');b.dataset.more=`+${media.length-(visible-1)}`;b.setAttribute('aria-label',`Open all ${media.length} product media`);b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openViewer(shell,media,0)})}
      else b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showMedia(shell,url)});
      gallery.appendChild(b);
    });
    main.insertAdjacentElement('afterend',gallery);shell.dataset.ynotFinalMedia=JSON.stringify(media);
  }
  function savedList(){try{const x=JSON.parse(localStorage.getItem('ynot-saved-items')||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
  function syncHeart(shell){
    if(shell.querySelector(':scope > .ynot-final-save-heart'))return;
    const b=document.createElement('button');b.type='button';b.className='ynot-final-save-heart';b.setAttribute('aria-label','Save product');
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/></svg>';
    const update=()=>{const t=titleOf(shell);b.classList.toggle('active',savedList().some(x=>norm(x?.title)===norm(t)))};update();
    b.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();const title=titleOf(shell);if(!title)return;const list=savedList(),idx=list.findIndex(x=>norm(x?.title)===norm(title));if(idx>=0)list.splice(idx,1);else{const p=await exactProduct(title);const img=shell.querySelector(':scope > img')?.src||p?.image||'';list.unshift({id:String(p?.id||`saved:${norm(title)}`),title,brand:p?.brand,image:img,url:p?.url,source:p?.source,price:p?.price,currency:p?.currency})}localStorage.setItem('ynot-saved-items',JSON.stringify(list));localStorage.setItem('ynot-saved-products',JSON.stringify(list.map(x=>x.id)));window.dispatchEvent(new Event('ynot:saves-changed'));update()});shell.appendChild(b)
  }
  document.addEventListener('click',async e=>{const target=e.target;if(!(target instanceof Element))return;const dot=target.closest('.ynot-origin-dot');if(!dot)return;const shell=dot.closest('.lv4-detail,.ynot-selected,.ynot-story');if(!shell)return;e.preventDefault();e.stopImmediatePropagation();const tab=window.open('about:blank','_blank');try{const product=await exactProduct(titleOf(shell));const variantId=shell.dataset?.ynotVariantId;let url=product?.url;if(variantId&&Array.isArray(product?.variants)){const v=product.variants.find(x=>String(x?.id||'')===String(variantId));url=v?.url||url}if(!url)throw new Error();if(tab)tab.location.href=url;else window.location.href=url}catch{tab?.close()}},true);
  let queued=false;function sync(){queued=false;document.querySelectorAll('.ynot-drawer.open .ynot-selected').forEach(shell=>{syncHeart(shell);void rebuildGallery(shell)})}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(sync)}
  const observer=new MutationObserver(queue);function start(){observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});sync()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();