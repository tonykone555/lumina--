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
})();
