(()=>{
  const DRAWER_CLOSE='.ynot-drawer.open .ynot-selected-close,.ynot-drawer.open .ynot-close,.ynot-story-close';
  const WORLD_CLOSE='.lv4-detail .lv4-close,.lv4-detail button[aria-label*="close" i],.lv4-detail button[title*="close" i]';
  const drawerButton=target=>target instanceof Element?target.closest(DRAWER_CLOSE):null;
  const worldButton=target=>target instanceof Element?target.closest(WORLD_CLOSE):null;
  let justClosed=0;
  const syncPopupState=()=>{
    const detail=document.querySelector('.lv4-detail');
    document.body.classList.toggle('ynot-any-product-popup-open',Boolean(detail));
    if(!detail)document.body.classList.remove('ynot-product-popup-open');
  };

  /* YNOT drawer controls still need the capture guard. */
  document.addEventListener('pointerdown',event=>{
    const button=drawerButton(event.target);if(!(button instanceof HTMLButtonElement))return;
    event.preventDefault();event.stopImmediatePropagation();justClosed=Date.now();button.click();
  },true);
  document.addEventListener('pointerup',event=>{
    if(Date.now()-justClosed>450||!drawerButton(event.target))return;
    event.preventDefault();event.stopImmediatePropagation();
  },true);

  /* IMPORTANT: never prevent/stop the native .lv4-detail close event. React owns
     selected state, so blocking this event leaves the Etsy card logically open.
     If iOS drops the click, retry once after the native event had a chance to run. */
  document.addEventListener('pointerup',event=>{
    const button=worldButton(event.target);if(!(button instanceof HTMLButtonElement))return;
    const detail=button.closest('.lv4-detail');
    setTimeout(()=>{
      if(!(detail instanceof HTMLElement)||!detail.isConnected)return;
      button.click();
      setTimeout(syncPopupState,0);
    },90);
  },true);
  document.addEventListener('touchend',event=>{
    const button=worldButton(event.target);if(!(button instanceof HTMLButtonElement))return;
    const detail=button.closest('.lv4-detail');
    setTimeout(()=>{if(detail?.isConnected)button.click()},120);
  },{capture:true,passive:true});

  const observer=new MutationObserver(syncPopupState);observer.observe(document.body,{subtree:true,childList:true});syncPopupState();
})();
