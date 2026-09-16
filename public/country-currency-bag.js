(()=>{
 const fmt=(value,currency)=>{try{return new Intl.NumberFormat(undefined,{style:'currency',currency,maximumFractionDigits:2}).format(value)}catch{return `${Number(value).toFixed(2)} ${currency}`}};
 const loadCart=()=>{try{const v=JSON.parse(localStorage.getItem('ynot-cart')||'[]');return Array.isArray(v)?v:[]}catch{return[]}};
 const loadRegion=()=>{try{return JSON.parse(localStorage.getItem('ynot-region')||'null')}catch{return null}};
 let busy=false,queued=false;
 async function refresh(){
  if(busy){queued=true;return}busy=true;
  try{
   const cart=loadCart(),region=loadRegion();if(!cart.length||!region?.country)return;
   const currencies=[...new Set(cart.map(i=>String(i.currency||'EUR').toUpperCase()))];
   const response=await fetch('/api/commerce/fx',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({country:region.country,currencies})});
   if(!response.ok)return;const data=await response.json(),target=String(data.currency||'EUR').toUpperCase(),rates=data.rates||{};
   const cards=[...document.querySelectorAll('.ynot-unified-bag-card')];let total=0;
   cards.forEach((card,index)=>{
    const item=cart[index];if(!item)return;const source=String(item.currency||'EUR').toUpperCase(),rate=source===target?1:Number(rates[source]||0);if(!(rate>0))return;
    const converted=Math.round(Number(item.price||0)*rate*100)/100;total+=converted*Math.max(1,Number(item.quantity||1));
    const strong=card.querySelector('.ynot-unified-bag-copy strong');if(strong)strong.textContent=fmt(converted,target);
    let note=card.querySelector('.ynot-country-fx-note');
    if(source!==target){if(!note){note=document.createElement('small');note.className='ynot-country-fx-note';strong?.insertAdjacentElement('afterend',note)}if(note)note.textContent=`${fmt(Number(item.price||0),source)} converted for your selected country`}else note?.remove();
   });
   const totalNode=document.querySelector('.ynot-bag-total strong');if(totalNode)totalNode.textContent=fmt(total,target);
   const header=document.querySelector('.ynot-unified-bag header b');if(header&&!header.textContent?.includes(target))header.textContent=`${header.textContent||''} · ${target}`;
   let currencyInfo=document.querySelector('.ynot-country-currency-info');
   const footer=document.querySelector('.ynot-unified-bag footer');
   if(footer){if(!currencyInfo){currencyInfo=document.createElement('div');currencyInfo.className='ynot-bag-info ynot-country-currency-info';currencyInfo.innerHTML='<span>Currency</span><b></b>';const totalWrap=footer.querySelector('.ynot-bag-total');footer.insertBefore(currencyInfo,totalWrap)}const b=currencyInfo?.querySelector('b');if(b)b.textContent=`All items converted to ${target} for your selected country`;}
  }catch{}finally{busy=false;if(queued){queued=false;queueMicrotask(refresh)}}
 }
 const schedule=()=>requestAnimationFrame(()=>void refresh());
 const observer=new MutationObserver(m=>{if(m.some(x=>[...x.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.ynot-unified-bag,.ynot-unified-bag-card')||n.querySelector?.('.ynot-unified-bag,.ynot-unified-bag-card')))))schedule()});
 observer.observe(document.documentElement,{subtree:true,childList:true});
 addEventListener('storage',schedule);addEventListener('ynot:bag-changed',schedule);addEventListener('ynot:region-changed',schedule);
 document.addEventListener('click',e=>{if(e.target?.closest?.('.ynot-cart-trigger,.ynot-unified-add,.ynot-shop,.ynot-story-action'))setTimeout(schedule,120)},true);
 schedule();
})();
