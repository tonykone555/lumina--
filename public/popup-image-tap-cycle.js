(()=>{
  /* Single owner for normal WORLD product-card media + horizontal product swipes. */
  const cache=new Map(),last=new WeakMap();
  const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const titleOf=card=>(card.querySelector('.lv4-detailcopy h2')?.textContent||card.querySelector('h2')?.textContent||'').trim();
  const keyOf=card=>norm(titleOf(card));
  const current=card=>card.querySelector(':scope > img')?.src||'';
  const mediaUrl=v=>typeof v==='string'?v:String(v?.url||v?.src||v?.image?.url||v?.image||v?.previewImage?.url||v?.preview_image?.url||v?.originalSource?.url||'');
  const clean=list=>[...new Set((list||[]).map(mediaUrl).filter(Boolean).map(String))];
  const collect=(p,seed=[])=>clean([
    ...seed,p?.image,...(p?.images||[]),...(p?.variants||[]).map(v=>v?.image),
    ...(p?.media||[]),...(p?.videos||[]),p?.video,p?.videoUrl,p?.video_url
  ]);

  async function richProduct(title,key){
    const params=new URLSearchParams({q:title,market:'lumina',source:'all',page:'0'});
    const r=await fetch(`/api/catalog?${params}`,{cache:'no-store'}),d=await r.json();
    const list=Array.isArray(d?.products)?d.products:[];
    const p=list.find(x=>norm(x?.title)===key)||list.find(x=>norm(x?.title).includes(key)||key.includes(norm(x?.title)))||list[0];
    if(!p)return null;
    if(String(p?.source||'').toLowerCase().includes('shopify')){
      try{
        const rr=await fetch('/api/commerce/product-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)}),rd=await rr.json();
        if(rr.ok&&rd?.product)return {...p,...rd.product};
      }catch{}
    }
    return p;
  }

  async function mediaFor(card){
    if(!(card instanceof HTMLElement)||card.classList.contains('ynot-selected'))return [];
    const title=titleOf(card),key=keyOf(card);if(!title||!key)return [];
    const gallery=clean([...card.querySelectorAll('.ynot-loaded-gallery button,.lv4-gallery button,.ynot-rich-gallery button')].flatMap(b=>[b.dataset.mediaUrl,b.querySelector('img')?.src,b.querySelector('video')?.src]));
    const signature=clean((card.querySelector('.ynot-loaded-gallery')?.dataset.mediaSignature||'').split('|'));
    const immediate=clean([current(card),...signature,...gallery]);
    if(cache.has(key)){const cached=await cache.get(key);return clean([...immediate,...cached])}
    const job=(async()=>{try{const p=await richProduct(title,key);return p?collect(p,immediate):immediate}catch{return immediate}})();
    cache.set(key,job);return job;
  }

  async function cycle(card,event){
    if(!(card instanceof HTMLElement)||card.classList.contains('ynot-selected'))return;
    const now=Date.now();if((last.get(card)||0)>now-220)return;last.set(card,now);
    const media=await mediaFor(card);if(media.length<2)return;event?.preventDefault?.();event?.stopPropagation?.();
    const img=card.querySelector(':scope > img');if(!img)return;let i=media.findIndex(src=>src===img.src||src===img.currentSrc);if(i<0)i=0;img.src=media[(i+1)%media.length];
  }

  document.addEventListener('click',e=>{const t=e.target;if(!(t instanceof Element))return;const card=t.closest('.lv4-detail');if(!card||t!==card.querySelector(':scope > img'))return;void cycle(card,e)},true);

  /* Swipe the whole normal product popup to the previous/next visible product bubble. */
  let gesture=null,active=-1;
  const visibleProducts=()=>[...document.querySelectorAll('.lv4-product')].filter(el=>{const r=el.getBoundingClientRect();return r.width>8&&r.height>8});
  const syncActive=()=>{const products=visibleProducts(),title=norm(document.querySelector('.lv4-detail .lv4-detailcopy h2,.lv4-detail h2')?.textContent||'');if(!products.length||!title)return;const i=products.findIndex(el=>norm(el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||'').includes(title));if(i>=0)active=i};
  document.addEventListener('click',e=>{const p=e.target instanceof Element?e.target.closest('.lv4-product'):null;if(!p)return;const products=visibleProducts(),i=products.indexOf(p);if(i>=0)active=i},true);
  document.addEventListener('touchstart',e=>{if(innerWidth>=900||e.touches.length!==1)return;const target=e.target;if(!(target instanceof Element)||!target.closest('.lv4-detail'))return;const t=e.touches[0];gesture={x:t.clientX,y:t.clientY,target}}, {capture:true,passive:true});
  document.addEventListener('touchend',e=>{
    if(innerWidth>=900||!gesture||!e.changedTouches.length)return;const g=gesture;gesture=null;
    if(g.target.closest('button,input,textarea,select,a,.ynot-loaded-gallery,.ynot-complete-image-viewer,.ynot-full-slider,.ynot-description-back'))return;
    const t=e.changedTouches[0],dx=t.clientX-g.x,dy=t.clientY-g.y;if(Math.abs(dx)<48||Math.abs(dx)<Math.abs(dy)*1.05)return;
    const products=visibleProducts();if(products.length<2)return;syncActive();if(active<0||active>=products.length)active=0;
    active=(active+(dx<0?1:-1)+products.length)%products.length;e.preventDefault();e.stopPropagation();products[active]?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
  },{capture:true,passive:false});
})();