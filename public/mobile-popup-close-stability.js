(()=>{
  const CLOSE='.ynot-drawer.open .ynot-selected-close,.ynot-drawer.open .ynot-close,.ynot-story-close,.lv4-detail .lv4-close,.lv4-detail button[aria-label*="close" i],.lv4-detail button[title*="close" i]';
  const closeButton=target=>target instanceof Element?target.closest(CLOSE):null;
  let justClosed=0;
  const finishWorldClose=button=>{
    const detail=button.closest('.lv4-detail');if(!detail)return;
    document.body.classList.remove('ynot-product-popup-open');
    setTimeout(()=>{
      if(!detail.isConnected)return;
      const backdrop=document.querySelector('.lv4-detail-backdrop');
      if(backdrop instanceof HTMLElement)backdrop.click();
      setTimeout(()=>{if(detail.isConnected){detail.style.display='none';document.body.classList.remove('ynot-product-popup-open')}},90);
    },40);
  };
  document.addEventListener('pointerdown',event=>{
    const button=closeButton(event.target);if(!(button instanceof HTMLButtonElement))return;
    event.preventDefault();event.stopImmediatePropagation();justClosed=Date.now();button.click();finishWorldClose(button);
  },true);
  document.addEventListener('pointerup',event=>{
    if(Date.now()-justClosed>450||!closeButton(event.target))return;
    event.preventDefault();event.stopImmediatePropagation();
  },true);
  document.addEventListener('click',event=>{
    if(Date.now()-justClosed>450)return;
    const target=event.target instanceof Element?event.target:null;
    if(target&&target.closest('.ynot-drawer,.ynot-story,.lv4-detail'))return;
    event.preventDefault();event.stopImmediatePropagation();
  },true);
})();
