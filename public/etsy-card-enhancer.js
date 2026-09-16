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
 function stars(rating){const n=Math.max(1,Math.min(5,Math.round(Number(rating)||0)));return '★'.repeat(n)}
 async function reviewsFor(product){
  const id=Number(product?.listingId||String(product?.id||'').replace(/\D+/g,''));if(!id)return{rating:null,reviewCount:0,reviews:[]};
  if(reviewCache.has(id))return reviewCache.get(id);
  const promise=fetch(`/api/etsy?mode=reviews&listingId=${id}`,{cache:'no-store'}).then(r=>r.ok?r.json():{}).then(data=>({rating:Number(data.rating)||null,reviewCount:Number(data.reviewCount)||0,reviews:Array.isArray(data.reviews)?data.reviews:[]})).catch(()=>({rating:null,reviewCount:0,reviews:[]}));
  reviewCache.set(id,promise);return promise;
 }
 function removeBubbleRatings(){document.querySelectorAll('.ynot-etsy-bubble-rating').forEach(node=>node.remove())}
 function clearDetail(detail){detail.querySelectorAll('.ynot-etsy-rating,.ynot-etsy-description-toggle,.ynot-etsy-description,.ynot-etsy-review-toggle,.ynot-etsy-reviews').forEach(node=>node.remove())}
 function reviewCard(review){
  const card=document.createElement('article');card.className='ynot-etsy-review-card';
  const rating=Number(review?.rating)||0,text=String(review?.text||'').trim(),image=String(review?.image||'').trim();
  if(image){const img=document.createElement('img');img.src=image;img.alt='Customer review photo';img.loading='lazy';img.decoding='async';card.appendChild(img)}
  if(rating>0){const s=document.createElement('div');s.className='ynot-etsy-review-stars';s.textContent=stars(rating);card.appendChild(s)}
  if(text){const p=document.createElement('p');p.textContent=text;card.appendChild(p)}
  return card;
 }
 async function enhanceDetail(detail){
  if(!(detail instanceof HTMLElement))return;
  const product=matchProduct(detail);if(!product)return;
  const key=String(product.id||product.listingId||norm(product.title));
  if(detail.dataset.etsyDetailProductKey===key)return;
  detail.dataset.etsyDetailProductKey=key;detail.classList.add('ynot-etsy-detail');document.body.classList.add('ynot-product-popup-open');
  clearDetail(detail);
  const copy=detail.querySelector('.lv4-detailcopy');if(!(copy instanceof HTMLElement))return;
  if(String(product.description||'').trim()){
   const button=document.createElement('button');button.type='button';button.className='ynot-etsy-description-toggle';button.textContent='Description';
   const panel=document.createElement('div');panel.className='ynot-etsy-description';panel.hidden=true;panel.textContent=String(product.description||'').trim();
   button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();panel.hidden=!panel.hidden;button.classList.toggle('active',!panel.hidden)});
   copy.append(button,panel);
  }
  const data=await reviewsFor(product);if(!detail.isConnected||detail.dataset.etsyDetailProductKey!==key)return;
  const reviews=Array.isArray(data.reviews)?data.reviews.filter(r=>Number(r?.rating)>0||String(r?.text||'').trim()||String(r?.image||'').trim()):[];
  const count=Number(data.reviewCount)||reviews.length;
  if(!count&&!reviews.length)return;
  const toggle=document.createElement('button');toggle.type='button';toggle.className='ynot-etsy-review-toggle';toggle.textContent=`Reviews${count?` (${count})`:''}`;
  const panel=document.createElement('div');panel.className='ynot-etsy-reviews';panel.hidden=true;
  const value=Number(data.rating)||0;
  if(value>0){const summary=document.createElement('div');summary.className='ynot-etsy-review-summary';summary.innerHTML=`<span>${stars(value)}</span><b>${value.toFixed(1)}</b>${count?`<small>${count} review${count===1?'':'s'}</small>`:''}`;panel.appendChild(summary)}
  const photoReviews=reviews.filter(r=>String(r?.image||'').trim());
  if(photoReviews.length){const strip=document.createElement('div');strip.className='ynot-etsy-review-photo-strip';for(const review of photoReviews.slice(0,8)){const img=document.createElement('img');img.src=String(review.image);img.alt='Customer review photo';img.loading='lazy';img.decoding='async';strip.appendChild(img)}panel.appendChild(strip)}
  const list=document.createElement('div');list.className='ynot-etsy-review-list';reviews.slice(0,8).forEach(review=>list.appendChild(reviewCard(review)));if(reviews.length)panel.appendChild(list);
  toggle.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();panel.hidden=!panel.hidden;toggle.classList.toggle('active',!panel.hidden)});
  copy.append(toggle,panel);
 }
 function scan(){
  removeBubbleRatings();
  const detail=document.querySelector('.lv4-detail');
  if(detail instanceof HTMLElement)enhanceDetail(detail);else document.body.classList.remove('ynot-product-popup-open');
 }
 let frame=0;const schedule=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;scan()})};
 const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true,characterData:true});
 window.addEventListener('ynot:catalog-source',schedule);schedule();
})();
