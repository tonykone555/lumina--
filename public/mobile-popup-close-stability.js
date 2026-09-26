(()=>{
  const DRAWER_CLOSE='.ynot-drawer.open .ynot-selected-close,.ynot-drawer.open .ynot-close,.ynot-drawer.open .ynot-story-close,.ynot-drawer.open button[aria-label*="close" i],.ynot-drawer.open button[title*="close" i],.ynot-drawer.open [role="button"][aria-label*="close" i]';
  const WORLD_CLOSE='.lv4-detail .lv4-close,.lv4-detail button[aria-label*="close" i],.lv4-detail button[title*="close" i]';
  const isXButton=node=>{if(!(node instanceof HTMLElement))return false;const text=(node.textContent||'').trim().toLowerCase();return text==='×'||text==='x'||text==='✕'||text==='✖'};
  const drawerButton=target=>{if(!(target instanceof Element))return null;const explicit=target.closest(DRAWER_CLOSE);if(explicit instanceof HTMLElement)return explicit;const node=target.closest('.ynot-drawer.open .ynot-selected button,.ynot-drawer.open .ynot-selected [role="button"]');return isXButton(node)?node:null};
  const worldButton=target=>target instanceof Element?target.closest(WORLD_CLOSE):null;
  const lockWorld=(ms=900)=>{window.__ynotProductGestureLockUntil=Date.now()+ms};
  const syncPopupState=()=>{
    const detail=document.querySelector('.lv4-detail');
    document.body.classList.toggle('ynot-any-product-popup-open',Boolean(detail));
    if(!detail)document.body.classList.remove('ynot-product-popup-open');
  };

  /* Never swallow the real close gesture: let the app's own pointer/click handler
     run first, then retry a normal click only if the Deal product is still open. */
  document.addEventListener('pointerdown',event=>{if(drawerButton(event.target))lockWorld()},true);
  document.addEventListener('pointerup',event=>{
    const button=drawerButton(event.target);if(!(button instanceof HTMLElement))return;
    lockWorld();const selected=button.closest('.ynot-selected');
    setTimeout(()=>{
      if(!(selected instanceof HTMLElement)||!selected.isConnected)return;
      button.click?.();
      setTimeout(syncPopupState,0);
    },110);
  },true);
  document.addEventListener('touchend',event=>{
    const button=drawerButton(event.target);if(!(button instanceof HTMLElement))return;
    lockWorld();const selected=button.closest('.ynot-selected');
    setTimeout(()=>{if(selected?.isConnected)button.click?.()},140);
  },{capture:true,passive:true});

  /* World popup close stays native; only protect the background around it. */
  document.addEventListener('pointerdown',event=>{if(worldButton(event.target))lockWorld()},true);
  document.addEventListener('pointerup',event=>{
    const button=worldButton(event.target);if(!(button instanceof HTMLButtonElement))return;
    lockWorld();const detail=button.closest('.lv4-detail');
    setTimeout(()=>{if(!(detail instanceof HTMLElement)||!detail.isConnected)return;button.click();setTimeout(syncPopupState,0)},100);
  },true);

  /* Any tap outside the visible product while it is open is swallowed so it can
     never open a product behind the glass layer. */
  const visiblePopup=()=>document.querySelector('.ynot-drawer.open .ynot-selected,.lv4-detail,.ynot-story');
  const targetInsidePopup=target=>target instanceof Element?target.closest('.ynot-drawer.open .ynot-selected,.lv4-detail,.ynot-story'):null;
  const guardOutside=event=>{const popup=visiblePopup();if(!popup||targetInsidePopup(event.target))return;event.preventDefault?.();event.stopImmediatePropagation?.();lockWorld()};
  document.addEventListener('pointerdown',guardOutside,true);
  document.addEventListener('pointerup',guardOutside,true);
  document.addEventListener('click',guardOutside,true);

  const observer=new MutationObserver(syncPopupState);observer.observe(document.body,{subtree:true,childList:true});syncPopupState();
})();