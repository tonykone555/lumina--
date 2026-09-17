(()=>{
  let used=false,active=false,startedAt=0,observer=null,maxTimer=null,minTimer=null;
  const MIN_MS=260,MAX_MS=1200;
  const root=document.documentElement;
  const ready=()=>Boolean(document.querySelector('.lv4-product,.ynot-orb,.lv4-product-bubble'));
  function ensureOverlay(){
    let overlay=document.getElementById('ynot-initial-world-transition');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='ynot-initial-world-transition';
    overlay.setAttribute('aria-live','polite');
    overlay.innerHTML='<div class="ynot-initial-dots" aria-label="Loading products"><span>·</span><span>·</span><span>·</span></div>';
    document.body.appendChild(overlay);
    return overlay;
  }
  function releaseWorldWhenReady(){
    if(!ready())return false;
    root.classList.remove('ynot-initial-world-await-products');
    if(observer){observer.disconnect();observer=null}
    return true;
  }
  function finishOverlay(force=false){
    if(!active)return;
    const elapsed=performance.now()-startedAt;
    const productsReady=ready();
    if(!force&&(elapsed<MIN_MS||!productsReady))return;
    active=false;
    root.classList.remove('ynot-initial-world-loading');
    if(productsReady||force)root.classList.remove('ynot-initial-world-await-products');
    const overlay=document.getElementById('ynot-initial-world-transition');
    if(overlay){overlay.classList.add('leaving');setTimeout(()=>overlay.remove(),140)}
    if(minTimer){clearTimeout(minTimer);minTimer=null}
    if(maxTimer){clearTimeout(maxTimer);maxTimer=null}
    if(observer){observer.disconnect();observer=null}
  }
  function start(){
    if(used||active)return;
    used=true;active=true;startedAt=performance.now();
    ensureOverlay();
    root.classList.add('ynot-initial-world-loading','ynot-initial-world-await-products');
    observer=new MutationObserver(()=>{releaseWorldWhenReady();finishOverlay(false)});
    observer.observe(document.body,{subtree:true,childList:true});
    minTimer=setTimeout(()=>finishOverlay(false),MIN_MS);
    maxTimer=setTimeout(()=>finishOverlay(true),MAX_MS);
  }
  function isInitialAction(target){
    if(!(target instanceof Element))return false;
    return Boolean(target.closest('.lv4-category-bubble,.lv4-search button'));
  }
  document.addEventListener('pointerdown',event=>{if(isInitialAction(event.target))start()},true);
  document.addEventListener('keydown',event=>{
    if(used||event.key!=='Enter')return;
    const target=event.target;
    if(target instanceof Element&&target.closest('.lv4-search'))start();
  },true);
})();
