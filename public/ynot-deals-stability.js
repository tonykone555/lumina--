(()=>{
 let lastOpen=0;
 const isYnotTrigger=target=>{
  const el=target instanceof Element?target.closest('button,a'):null;if(!el)return false;
  return el.classList.contains('ynot-peek')||/^YNOT$/i.test((el.textContent||'').trim());
 };
 document.addEventListener('click',event=>{
  if(!isYnotTrigger(event.target))return;
  const now=Date.now();
  if(now-lastOpen<900){event.preventDefault();event.stopImmediatePropagation();return}
  lastOpen=now;
 },true);
 function optimizeDrawer(){
  const drawer=document.querySelector('.ynot-drawer.open');if(!(drawer instanceof HTMLElement))return;
  drawer.querySelectorAll('img').forEach(img=>{if(img instanceof HTMLImageElement){img.loading='lazy';img.decoding='async';img.fetchPriority='low'}});
  drawer.querySelectorAll('.ynot-card,.ynot-deal,.ynot-product,.ynot-item,article').forEach(card=>{if(card instanceof HTMLElement){card.style.contentVisibility='auto';card.style.containIntrinsicSize='280px'}});
 }
 let frame=0;const schedule=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;optimizeDrawer()})};
 const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
 window.addEventListener('pageshow',schedule);schedule();
})();
