(()=>{
  let used=false,active=false,startedAt=0,observer=null,timer=null;
  const MIN_MS=1500,MAX_MS=6500;
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
  function finish(force=false){
    if(!active)return;
    const elapsed=performance.now()-startedAt;
    if(!force&&(elapsed<MIN_MS||!ready()))return;
    active=false;
    document.documentElement.classList.remove('ynot-initial-world-loading');
    const overlay=document.getElementById('ynot-initial-world-transition');
    if(overlay){overlay.classList.add('leaving');setTimeout(()=>overlay.remove(),220)}
    if(observer){observer.disconnect();observer=null}
    if(timer){clearTimeout(timer);timer=null}
  }
  function start(){
    if(used||active)return;
    used=true;active=true;startedAt=performance.now();
    ensureOverlay();
    document.documentElement.classList.add('ynot-initial-world-loading');
    observer=new MutationObserver(()=>finish(false));
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    setTimeout(()=>finish(false),MIN_MS);
    timer=setTimeout(()=>finish(true),MAX_MS);
  }
  function isInitialAction(target){
    if(!(target instanceof Element))return false;
    if(target.closest('.lv4-category-bubble'))return true;
    if(target.closest('.lv4-search button'))return true;
    return false;
  }
  document.addEventListener('pointerdown',event=>{if(isInitialAction(event.target))start()},true);
  document.addEventListener('keydown',event=>{
    if(used||event.key!=='Enter')return;
    const target=event.target;
    if(target instanceof Element&&target.closest('.lv4-search'))start();
  },true);
})();
