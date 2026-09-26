(()=>{
  /* World-product image cycling only. YNOT Deals are owned exclusively by
     ynot-deal-final-media.js so one tap can never advance two hidden layers. */
  const cache=new Map(),last=new WeakMap();
  const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const titleOf=card=>(card.querySelector('.lv4-detailcopy h2')?.textContent||'').trim();
  const keyOf=card=>norm(titleOf(card));
  const current=card=>card.querySelector(':scope > img')?.src||'';
  const clean=list=>[...new Set((list||[]).filter(Boolean).map(String))];

  async function mediaFor(card){
    if(!(card instanceof HTMLElement)||card.classList.contains('ynot-selected'))return [];
    const title=titleOf(card),key=keyOf(card);if(!title||!key)return [];
    const gallery=clean([...card.querySelectorAll('.lv4-gallery button,.ynot-loaded-gallery button,.ynot-rich-gallery button')].map(b=>b.dataset.mediaUrl||b.querySelector('img')?.src));
    if(gallery.length>1)return clean([current(card),...gallery]);
    if(cache.has(key))return cache.get(key);
    const job=(async()=>{try{const r=await fetch(`/api/catalog?${new URLSearchParams({q:title,market:'lumina',source:'all',page:'0'})}`,{cache:'force-cache'}),d=await r.json(),list=Array.isArray(d?.products)?d.products:[],p=list.find(x=>norm(x?.title)===key)||list[0];return clean([current(card),p?.image,...(p?.images||[]),...(p?.variants||[]).map(v=>v?.image)])}catch{return clean([current(card)])}})();cache.set(key,job);return job
  }

  async function cycle(card,event){
    if(!(card instanceof HTMLElement)||card.classList.contains('ynot-selected'))return;
    const now=Date.now();if((last.get(card)||0)>now-260)return;last.set(card,now);
    const media=await mediaFor(card);if(media.length<2)return;event?.preventDefault?.();event?.stopPropagation?.();
    const img=card.querySelector(':scope > img');if(!img)return;let i=media.indexOf(img.src);if(i<0)i=0;img.src=media[(i+1)%media.length]
  }

  document.addEventListener('click',e=>{const t=e.target;if(!(t instanceof Element))return;const card=t.closest('.lv4-detail');if(!card||t!==card.querySelector(':scope > img'))return;void cycle(card,e)},true);
})();