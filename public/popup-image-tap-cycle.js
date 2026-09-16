(()=>{
  const cache=new Map();
  const norm=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const isVideo=url=>/\.(mp4|webm|mov)(?:\?|$)/i.test(String(url||''));

  function titleFor(card){return (card.querySelector('.lv4-detailcopy h2,.ynot-selected-copy h3')?.textContent||'').trim()}
  function currentImage(card){return card.querySelector(':scope > img')?.src||''}

  function collectProductMedia(product,current){
    const raw=[
      current,
      product?.image,
      ...(Array.isArray(product?.images)?product.images:[]),
      ...(Array.isArray(product?.variants)?product.variants.map(v=>v?.image):[]),
      ...(Array.isArray(product?.videos)?product.videos:[]),
      product?.video,
      product?.videoUrl,
      product?.video_url,
      ...(Array.isArray(product?.media)?product.media.map(m=>typeof m==='string'?m:(m?.url||m?.src||m?.video||m?.image)):[])
    ].filter(Boolean);
    return [...new Set(raw.map(String))];
  }

  async function loadMedia(card){
    const title=titleFor(card),key=norm(title),current=currentImage(card);
    if(!title)return current?[current]:[];
    if(cache.has(key))return cache.get(key);
    const promise=(async()=>{
      try{
        const params=new URLSearchParams({q:title,market:'lumina',source:'all',page:'0'});
        const response=await fetch(`/api/catalog?${params.toString()}`,{cache:'no-store'}),data=await response.json();
        const products=Array.isArray(data?.products)?data.products:[];
        const exact=products.find(p=>norm(p?.title)===key)||products.find(p=>norm(p?.title).includes(key)||key.includes(norm(p?.title)))||products[0];
        return collectProductMedia(exact,current);
      }catch{return current?[current]:[]}
    })();
    cache.set(key,promise);
    return promise;
  }

  function syncThumbs(card,url){
    card.querySelectorAll('.ynot-loaded-gallery button,.ynot-rich-gallery button,.lv4-gallery button,.ynot-deal-thumb-gallery button').forEach(button=>{
      const src=button.querySelector('img')?.src||'';
      button.classList.toggle('active',src===url);
    });
  }

  function showMedia(card,url){
    let video=card.querySelector(':scope > .ynot-popup-video');
    const image=card.querySelector(':scope > img');
    if(isVideo(url)){
      if(!video){video=document.createElement('video');video.className='ynot-popup-video';video.controls=true;video.playsInline=true;video.muted=true;image?.insertAdjacentElement('afterend',video)}
      video.src=url;video.load();card.classList.add('ynot-showing-video');
      video.play().catch(()=>{});
    }else{
      if(video){video.pause();video.removeAttribute('src');video.load()}
      card.classList.remove('ynot-showing-video');
      if(image)image.src=url;
      syncThumbs(card,url);
    }
    card.dataset.ynotFullMediaUrl=url;
  }

  async function cycle(card,event){
    const media=await loadMedia(card);if(media.length<2)return;
    event.preventDefault();event.stopPropagation();
    const current=card.dataset.ynotFullMediaUrl||currentImage(card);
    let index=media.findIndex(url=>url===current);if(index<0)index=0;
    showMedia(card,media[(index+1)%media.length]);
  }

  document.addEventListener('click',event=>{
    const target=event.target;
    if(!(target instanceof Element))return;
    const card=target.closest('.lv4-detail,.ynot-selected');
    if(!card)return;

    if(target instanceof HTMLVideoElement&&target.classList.contains('ynot-popup-video')){
      void cycle(card,event);return;
    }
    if(target instanceof HTMLImageElement&&target===card.querySelector(':scope > img')){
      void cycle(card,event);return;
    }

    /* On YNOT Deals, tapping the visual card area advances media too. Controls/copy/gallery remain interactive. */
    if(card.classList.contains('ynot-selected')){
      if(target.closest('button,a,input,select,textarea,video,.ynot-deal-thumb-gallery,.ynot-selected-copy,.ynot-variants'))return;
      void cycle(card,event);
    }
  },true);
})();
