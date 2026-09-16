(()=>{
  const bag='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
  let queued=false;
  function sync(){queued=false;document.querySelectorAll('.ynot-unified-add').forEach(button=>{const svg=button.querySelector('svg');if(!svg||svg.dataset.ynotCheckoutBag==='1')return;svg.outerHTML=bag.replace('<svg ','<svg data-ynot-checkout-bag="1" ')})}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(sync)}
  const observer=new MutationObserver(queue);
  function start(){observer.observe(document.body,{subtree:true,childList:true});sync()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
