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
  function removeSliderChrome(shell){shell.querySelectorAll('.ynot-full-slider,.ynot-deal-full-slider,.ynot-full-slider-prev,.ynot-full-slider-next,.ynot-full-slider-count,.ynot-deal-thumb-more,.ynot-deal-thumb-gallery:not(.ynot-deal-thumb-gallery-final)').forEach(node=>node.remove())}
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
    shell.querySelectorAll('.ynot-deal-thumb-gallery-final button').forEach(b=>b.classList.toggle('active',b.dataset.mediaUrl===url));
  }
  function makeThumb(url,title,index){
    if(isVideo(url)){const v=document.createElement('video');v.src=url;v.muted=true;v.playsInline=true;v.preload='metadata';v.setAttribute('aria-label',`${title} video ${index+1}`);return v}
    const i=document.createElement('img');i.src=url;i.alt=`${title} view ${index+1}`;return i;
  }
  function openViewer(shell,media,start){
    document.querySelector('.ynot-final-media-viewer')?.remove();
    let index=Math.max(0,Math.min(start,media.length-1));
    const viewer=document.createElement('div');viewer.className='ynot-final-media-viewer';
    const stage=document.createElement('div');stage.className='ynot-final-media-stage';viewer.appendChild(stage);
    const close=document.createElement('button');close.className='ynot-final-media-close';close.type='button';close.textContent='×';viewer.appendChild(close);
    const prev=document.createElement('button');prev.className='ynot-final-media-prev';prev.type='button';prev.textContent='‹';viewer.appendChild(prev);
    const next=document.createElement('button');next.className='ynot-final-media-next';next.type='button';next.textContent='›';viewer.appendChild(next);
    const count=document.createElement('div');count.className='ynot-final-media-count';viewer.appendChild(count);
    const render=()=>{stage.replaceChildren();const url=media[index];let el;if(isVideo(url)){el=document.createElement('video');el.controls=true;el.autoplay=true;el.playsInline=true;el.src=url}else{el=document.createElement('img');el.src=url;el.alt=`${titleOf(shell)} view ${index+1}`}el.className='ynot-final-media-main';stage.appendChild(el);count.textContent=`${index+1} / ${media.length}`};
    const shut=()=>viewer.remove();close.onclick=shut;prev.onclick=()=>{index=(index-1+media.length)%media.length;render()};next.onclick=()=>{index=(index+1)%media.length;render()};viewer.addEventListener('click',e=>{if(e.target===viewer)shut()});document.body.appendChild(viewer);render();
  }
  async function rebuildGallery(shell){
    if(!(shell instanceof HTMLElement))return;removeSliderChrome(shell);const title=titleOf(shell),main=shell.querySelector(':scope > img');if(!title||!main)return;
    const key=norm(title);const existing=shell.querySelector(':scope > .ynot-deal-thumb-gallery-final');
    if(existing?.dataset.productKey===key)return;
    existing?.remove();delete shell.dataset.ynotFinalMedia;delete shell.dataset.ynotFullMediaUrl;
    const product=await exactProduct(title);if(!document.body.contains(shell)||norm(titleOf(shell))!==key)return;
    const media=collectMedia(product,main.src);if(!media.length)return;
    removeSliderChrome(shell);
    const gallery=document.createElement('div');gallery.className='ynot-deal-thumb-gallery ynot-deal-thumb-gallery-final';gallery.dataset.productKey=key;
    media.forEach((url,index)=>{const b=document.createElement('button');b.type='button';b.dataset.mediaUrl=url;b.className='ynot-deal-thumb';b.setAttribute('aria-label',`Show product media ${index+1}`);b.appendChild(makeThumb(url,title,index));if(index===0)b.classList.add('active');b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showMedia(shell,url)});b.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();openViewer(shell,media,index)});gallery.appendChild(b)});
    main.insertAdjacentElement('afterend',gallery);shell.dataset.ynotFinalMedia=JSON.stringify(media);
    main.style.cursor='zoom-in';main.onclick=e=>{e.preventDefault();e.stopPropagation();const current=shell.dataset.ynotFullMediaUrl||main.src;const i=Math.max(0,media.indexOf(current));openViewer(shell,media,i)};
  }
  function savedList(){try{const x=JSON.parse(localStorage.getItem('ynot-saved-items')||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
  function syncHeart(shell){if(shell.querySelector(':scope > .ynot-final-save-heart'))return;const b=document.createElement('button');b.type='button';b.className='ynot-final-save-heart';b.setAttribute('aria-label','Save product');b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/></svg>';const update=()=>{const t=titleOf(shell);b.classList.toggle('active',savedList().some(x=>norm(x?.title)===norm(t)))};update();b.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();const title=titleOf(shell);if(!title)return;const list=savedList(),idx=list.findIndex(x=>norm(x?.title)===norm(title));if(idx>=0)list.splice(idx,1);else{const p=await exactProduct(title);const img=shell.querySelector(':scope > img')?.src||p?.image||'';list.unshift({id:String(p?.id||`saved:${norm(title)}`),title,brand:p?.brand,image:img,url:p?.url,source:p?.source,price:p?.price,currency:p?.currency})}localStorage.setItem('ynot-saved-items',JSON.stringify(list));localStorage.setItem('ynot-saved-products',JSON.stringify(list.map(x=>x.id)));window.dispatchEvent(new Event('ynot:saves-changed'));update()});shell.appendChild(b)}
  document.addEventListener('click',async e=>{const target=e.target;if(!(target instanceof Element))return;const dot=target.closest('.ynot-origin-dot');if(!dot)return;const shell=dot.closest('.lv4-detail,.ynot-selected,.ynot-story');if(!shell)return;e.preventDefault();e.stopImmediatePropagation();const tab=window.open('about:blank','_blank');try{const product=await exactProduct(titleOf(shell));const variantId=shell.dataset?.ynotVariantId;let url=product?.url;if(variantId&&Array.isArray(product?.variants)){const v=product.variants.find(x=>String(x?.id||'')===String(variantId));url=v?.url||url}if(!url)throw new Error();if(tab)tab.location.href=url;else window.location.href=url}catch{tab?.close()}},true);
  let lastShell=null,lastKey='';let queued=false;function sync(){queued=false;const shell=document.querySelector('.ynot-drawer.open .ynot-selected');if(!shell){lastShell=null;lastKey='';document.querySelector('.ynot-final-media-viewer')?.remove();return}const key=norm(titleOf(shell));if(shell!==lastShell||key!==lastKey){document.querySelector('.ynot-final-media-viewer')?.remove();shell.querySelectorAll(':scope > .ynot-deal-thumb-gallery-final').forEach(x=>x.remove());delete shell.dataset.ynotFinalMedia;delete shell.dataset.ynotFullMediaUrl;lastShell=shell;lastKey=key}removeSliderChrome(shell);syncHeart(shell);void rebuildGallery(shell)}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(sync)}
  const observer=new MutationObserver(queue);function start(){observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});sync()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();