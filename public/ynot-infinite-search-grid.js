(()=>{
  if(window.__ynotInfiniteSearchGrid)return;
  window.__ynotInfiniteSearchGrid=true;

  let timer=0,lastCount=0,lastGrowth=Date.now();
  const active=()=>{
    if(document.hidden)return false;
    const intent=document.querySelector('.lv4-intent');
    const products=document.querySelectorAll('.lv4-product');
    return Boolean(intent&&products.length);
  };

  const tick=()=>{
    window.clearTimeout(timer);
    if(active()){
      const products=document.querySelectorAll('.lv4-product').length;
      if(products>lastCount){lastCount=products;lastGrowth=Date.now();}
      const intent=document.querySelector('.lv4-intent');
      if(intent instanceof HTMLButtonElement&&!intent.disabled){
        intent.click();
      }
    }
    timer=window.setTimeout(tick,900);
  };

  const wake=()=>{
    lastGrowth=Date.now();
    if(!timer)tick();
  };
  document.addEventListener('visibilitychange',wake,{passive:true});
  window.addEventListener('ynot:world-active',wake,{passive:true});
  window.addEventListener('shop:tag-search',wake,{passive:true});
  window.addEventListener('pointerup',wake,{passive:true});
  window.addEventListener('wheel',wake,{passive:true});
  tick();
})();
