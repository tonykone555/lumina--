(()=>{
  let blockCompassUntil=0;
  const closeCompass=event=>{
    const target=event.target;
    if(!(target instanceof Element)||!target.closest('.ynot-compass-close'))return;
    event.preventDefault();
    event.stopPropagation();
    if(typeof event.stopImmediatePropagation==='function')event.stopImmediatePropagation();
    blockCompassUntil=performance.now()+650;
    window.dispatchEvent(new Event('ynot:world-focus'));
  };
  document.addEventListener('pointerdown',closeCompass,true);
  document.addEventListener('touchstart',closeCompass,{capture:true,passive:false});
  document.addEventListener('click',event=>{
    const target=event.target;
    if(!(target instanceof Element))return;
    if(target.closest('.ynot-compass-button')&&performance.now()<blockCompassUntil){
      event.preventDefault();
      event.stopPropagation();
      if(typeof event.stopImmediatePropagation==='function')event.stopImmediatePropagation();
    }
  },true);

  document.addEventListener('click',event=>{
    const target=event.target;
    if(!(target instanceof Element)||!target.closest('.ynot-description-toggle'))return;
    const shell=target.closest('.lv4-detail');
    if(!(shell instanceof HTMLElement))return;
    requestAnimationFrame(()=>{
      ['top','right','bottom','left','transform','translate','margin-top','margin-bottom'].forEach(name=>shell.style.removeProperty(name));
      shell.scrollTop=0;
      const back=shell.querySelector('.ynot-description-back');
      if(back instanceof HTMLElement)back.scrollTop=0;
    });
  },true);

  const MOBILE=()=>window.innerWidth<900;
  const set=(el,prop,value)=>el?.style?.setProperty(prop,value,'important');
  const unset=(el,prop)=>el?.style?.removeProperty(prop);
  const ambientSelectors=['.ynot-entry-ambient','.lv4-stage > .lv4-category-bubble','.lv4-stage > .ynot-voice-orb','.lv4-stage > .ynot-bubble-slot'].join(',');
  const hasProductRows=stage=>!!stage?.querySelector(':scope > .lv4-product');

  function cleanZoom(zoom,show){
    if(!zoom)return;
    if(!MOBILE()){
      ['display','right','left','top','bottom','transform','padding','gap','border','border-radius','background','box-shadow','backdrop-filter','-webkit-backdrop-filter'].forEach(p=>unset(zoom,p));
      zoom.querySelector('span')?.style.removeProperty('display');
      zoom.querySelectorAll('button').forEach(btn=>['width','height','border-radius','border','background','box-shadow','backdrop-filter','-webkit-backdrop-filter'].forEach(p=>unset(btn,p)));
      return;
    }
    set(zoom,'display',show?'flex':'none');
    if(!show)return;
    set(zoom,'right','10px');set(zoom,'left','auto');set(zoom,'top','43%');set(zoom,'bottom','auto');set(zoom,'transform','translateY(-50%)');
    set(zoom,'padding','0');set(zoom,'gap','8px');set(zoom,'border','0');set(zoom,'border-radius','0');set(zoom,'background','transparent');set(zoom,'box-shadow','none');set(zoom,'backdrop-filter','none');set(zoom,'-webkit-backdrop-filter','none');
    const label=zoom.querySelector('span');if(label)set(label,'display','none');
    zoom.querySelectorAll('button').forEach(btn=>{set(btn,'width','32px');set(btn,'height','32px');set(btn,'border-radius','11px');set(btn,'border','1px solid rgba(255,255,255,.20)');set(btn,'background','rgba(16,16,18,.30)');set(btn,'box-shadow','0 5px 15px rgba(0,0,0,.12)');set(btn,'backdrop-filter','blur(10px)');set(btn,'-webkit-backdrop-filter','blur(10px)')});
  }

  function cleanAmbient(stage,resultsActive){
    document.querySelectorAll(ambientSelectors).forEach(el=>{
      if(MOBILE()&&resultsActive){set(el,'display','none');set(el,'animation','none');set(el,'transition','none');el.setAttribute('aria-hidden','true')}
      else{unset(el,'display');unset(el,'animation');unset(el,'transition');if(!el.classList.contains('ynot-entry-ambient'))el.removeAttribute('aria-hidden')}
    });
    document.documentElement.classList.toggle('ynot-mobile-product-rows',MOBILE()&&resultsActive);
  }

  let cleanupFrame=0;
  function syncMobileResults(){const stage=document.querySelector('.lv4-stage');const resultsActive=hasProductRows(stage);cleanZoom(document.querySelector('.ynot-map-zoom'),resultsActive);cleanAmbient(stage,resultsActive)}
  function queueMobileResults(){if(cleanupFrame)return;cleanupFrame=requestAnimationFrame(()=>{cleanupFrame=0;syncMobileResults()})}
  const cleanupObserver=new MutationObserver(queueMobileResults);
  cleanupObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',queueMobileResults,{passive:true});
  ['shop:tag-search','discover:search','ynot:world-active','ynot:world-reset'].forEach(name=>window.addEventListener(name,queueMobileResults));
  syncMobileResults();
})();
