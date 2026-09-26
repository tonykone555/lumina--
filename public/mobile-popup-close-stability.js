(()=>{
  const DRAWER_CLOSE='.ynot-drawer.open .ynot-selected-close,.ynot-drawer.open .ynot-close,.ynot-drawer.open .ynot-story-close,.ynot-drawer.open button[aria-label*="close" i],.ynot-drawer.open button[title*="close" i]';
  const WORLD_CLOSE='.lv4-detail .lv4-close,.lv4-detail button[aria-label*="close" i],.lv4-detail button[title*="close" i]';
  const isXButton=button=>{if(!(button instanceof HTMLButtonElement))return false;const text=(button.textContent||'').trim().toLowerCase();return text==='×'||text==='x'||text==='✕'||text==='✖'};
  const drawerButton=target=>{
    if(!(target instanceof Element))return null;
    const explicit=target.closest(DRAWER_CLOSE);if(explicit instanceof HTMLButtonElement)return explicit;
    const button=target.closest('.ynot-drawer.open .ynot-selected button');return isXButton(button)?button:null;
  };
  const worldButton=target=>target instanceof Element?target.closest(WORLD_CLOSE):null;
  let justClosed=0;
  const syncPopupState=()=>{
    const detail=document.querySelector('.lv4-detail');
    document.body.classList.toggle('ynot-any-product-popup-open',Boolean(detail));
    if(!detail)document.body.classList.remove('ynot-product-popup-open');
  };

  document.addEventListener('pointerdown',event=>{
    const button=drawerButton(event.target);if(!(button instanceof HTMLButtonElement))return;
    event.preventDefault();event.stopImmediatePropagation();justClosed=Date.now();button.click();
    setTimeout(()=>{
      const selected=button.closest('.ynot-selected');
      if(selected?.isConnected){
        const fallback=[...document.querySelectorAll('.ynot-drawer.open button')].find(node=>node!==button&&(node.matches('[aria-label*="close" i],[title*="close" i],.ynot-close,.ynot-selected-close')||isXButton(node)));
        if(fallback instanceof HTMLButtonElement)fallback.click();
      }
    },100);
  },true);
  document.addEventListener('pointerup',event=>{
    if(Date.now()-justClosed>500||!drawerButton(event.target))return;
    event.preventDefault();event.stopImmediatePropagation();
  },true);
  document.addEventListener('touchend',event=>{
    const button=drawerButton(event.target);if(!(button instanceof HTMLButtonElement))return;
    event.preventDefault();event.stopImmediatePropagation();
    if(Date.now()-justClosed>500){justClosed=Date.now();button.click()}
  },{capture:true,passive:false});

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