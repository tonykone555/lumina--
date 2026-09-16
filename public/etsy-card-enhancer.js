(()=>{
 const reviewCache=new Map();
 const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const products=()=>Object.values(window.__ynotEtsyProducts||{}).filter((p,i,a)=>p&&p.id&&a.findIndex(x=>x&&x.id===p.id)===i);
 const isEtsy=p=>String(p?.source||'').toLowerCase().includes('etsy');
 function matchProduct(node){
  const text=norm(node?.textContent||'');if(!text)return null;
  let best=null,bestLen=0;
  for(const product of products()){
   if(!isEtsy(product))continue;
   const title=norm(product.title);if(title&&title.length>bestLen&&text.includes(title)){best=product;bestLen=title.length}
  }
  return best;
 }
 function stars(rating){const n=Math.max(0,Math.min(5,Math.round(Number(rating)||0)));return `${'★'.repeat(n)}${'☆'.repeat(5-n)}`}
 async function reviewsFor(product){
  const id=Number(product?.listingId||String(product?.id||'').replace(/\D+/g,''));if(!id)return{rating:null,reviewCount:0};
  if(reviewCache.has(id))return reviewCache.get(id);
  const promise=fetch(`/api/etsy?mode=reviews&listingId=${id}`,{cache:'no-store'}).then(r=>r.ok?r.json():{}).then(data=>({rating:Number(data.rating)||null,reviewCount:Number(data.reviewCount)||0})).catch(()=>({rating:null,reviewCount:0}));
  reviewCache.set(id,promise);return promise;
 }
 function ratingMarkup(data){const rating=Number(data.rating)||0,count=Number(data.reviewCount)||0;return `<span>${rating?stars(rating):'☆'}</span><b>${rating?rating.toFixed(1):'New'}</b><small>${count?`${count} review${count===1?'':'s'}`:'No reviews yet'}</small>`}
 async function enhanceBubble(node){
  if(!(node instanceof HTMLElement)||node.dataset.etsyReviewBound==='1')return;
  const product=matchProduct(node);if(!product)return;
  node.dataset.etsyReviewBound='1';node.classList.add('ynot-etsy-product');
  const badge=document.createElement('div');badge.className='ynot-etsy-bubble-rating';badge.innerHTML='<span>☆</span><small>Reviews</small>';node.appendChild(badge);
  const data=await reviewsFor(product);if(!node.isConnected)return;
  const rating=Number(data.rating)||0,count=Number(data.reviewCount)||0;
  badge.innerHTML=`<span>${rating?'★':'☆'}</span><b>${rating?rating.toFixed(1):'New'}</b><small>${count?count:''}</small>`;
 }
 async function enhanceDetail(detail){
  if(!(detail instanceof HTMLElement)||detail.dataset.etsyDetailBound==='1')return;
  const product=matchProduct(detail);if(!product)return;
  detail.dataset.etsyDetailBound='1';detail.classList.add('ynot-etsy-detail');document.body.classList.add('ynot-product-popup-open');
  const copy=detail.querySelector('.lv4-detailcopy');if(!(copy instanceof HTMLElement))return;
  const rating=document.createElement('div');rating.className='ynot-etsy-rating';rating.innerHTML='<span>☆</span><small>Loading reviews…</small>';
  const price=copy.querySelector('strong');(price?.parentNode||copy).insertBefore(rating,price?.nextSibling||copy.firstChild);
  if(String(product.description||'').trim()){
   const button=document.createElement('button');button.type='button';button.className='ynot-etsy-description-toggle';button.textContent='Description';
   const panel=document.createElement('div');panel.className='ynot-etsy-description';panel.hidden=true;panel.textContent=String(product.description||'').trim();
   button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();panel.hidden=!panel.hidden;button.classList.toggle('active',!panel.hidden)});
   copy.append(button,panel);
  }
  const data=await reviewsFor(product);if(rating.isConnected)rating.innerHTML=ratingMarkup(data);
 }
 function scan(){
  document.querySelectorAll('.lv4-product').forEach(enhanceBubble);
  const detail=document.querySelector('.lv4-detail');
  if(detail instanceof HTMLElement)enhanceDetail(detail);else document.body.classList.remove('ynot-product-popup-open');
 }
 let frame=0;const schedule=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;scan()})};
 const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true,characterData:true});
 window.addEventListener('ynot:catalog-source',schedule);schedule();
})();
