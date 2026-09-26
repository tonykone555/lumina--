(()=>{
  const DRAWER_CLOSE='.ynot-drawer.open .ynot-selected-close,.ynot-drawer.open .ynot-close,.ynot-drawer.open .ynot-story-close,.ynot-drawer.open button[aria-label*="close" i],.ynot-drawer.open button[title*="close" i]';
  const WORLD_CLOSE='.lv4-detail .lv4-close,.lv4-detail button[aria-label*="close" i],.lv4-detail button[title*="close" i]';
  const isXButton=button=>{if(!(button instanceof HTMLButtonElement))return false;const text=(button.textContent||'').trim().toLowerCase();return text==='×'||text==='x'||text==='✕'||text==='✖'};
  const drawerButton=target=>{if(!(target instanceof Element))return null;const explicit=target.closest(DRAWER_CLOSE);if(explicit instanceof HTMLButtonElement)return explicit;const button=target.closest('.ynot-drawer.open .ynot-selected button');return isXButton(button)?button:null};
  const worldButton=target=>target instanceof Element?target.closest(WORLD_CLOSE):null;
  const lockWorld=(ms=900)=>{window.__ynotProductGestureLockUntil=Date.now()+ms};
  let closingDrawer=false;
  const syncPopupState=()=>{
    const detail=document.querySelector('.lv4-detail');
    document.body.classList.toggle('ynot-any-product-popup-open',Boolean(detail));
    if(!detail)document.body.classList.remove('ynot-product-popup-open');
  };

  /* The visible YNOT Deal X owns the physical pointer gesture. We swallow that
     gesture, then generate exactly one click for the app's own close handler. */
  document.addEventListener('pointerdown',event=>{
    const button=drawerButton(event.target);if(!(button instanceof HTMLButtonElement))return;
    event.preventDefault();event.stopImmediatePropagation();lockWorld();closingDrawer=true;
  },true);
  document.addEventListener('pointerup',event=>{
    const button=drawerButton(event.target);if(!(button instanceof HTMLButtonElement))return;
    event.preventDefault();event.stopImmediatePropagation();lockWorld();
    if(!closingDrawer)return;closingDrawer=false;
    requestAnimationFrame(()=>{if(button.isConnected)button.click()});
  },true);
  document.addEventListener('pointercancel',()=>{closingDrawer=false},true);
  document.addEventListener('click',event=>{
    const button=drawerButton(event.target);if(!(button instanceof HTMLButtonElement))return;
    if(event.isTrusted){event.preventDefault();event.stopImmediatePropagation();lockWorld()}
  },true);

  if(!window.PointerEvent){
    document.addEventListener('touchstart',event=>{const button=drawerButton(event.target);if(!(button instanceof HTMLButtonElement))return;event.preventDefault();event.stopImmediatePropagation();lockWorld();closingDrawer=true},{capture:true,passive:false});
    document.addEventListener('touchend',event=>{const button=drawerButton(event.target);if(!(button instanceof HTMLButtonElement))return;event.preventDefault();event.stopImmediatePropagation();lockWorld();if(!closingDrawer)return;closingDrawer=false;requestAnimationFrame(()=>{if(button.isConnected)button.click()})},{capture:true,passive:false});
  }

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