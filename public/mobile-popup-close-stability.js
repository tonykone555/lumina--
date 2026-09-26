(()=>{
  const DRAWER_CLOSE='.ynot-drawer.open .ynot-selected-close,.ynot-drawer.open .ynot-close,.ynot-drawer.open .ynot-story-close,.ynot-drawer.open button[aria-label*="close" i],.ynot-drawer.open button[title*="close" i],.ynot-drawer.open [role="button"][aria-label*="close" i]';
  const WORLD_CLOSE='.lv4-detail .lv4-close,.lv4-detail button[aria-label*="close" i],.lv4-detail button[title*="close" i]';
  const OUTSIDE_CONTROLS='.ynot-glass-side-control,.ynot-detail-side,.ynot-deal-floating-close,.ynot-world-desktop-prev,.ynot-world-desktop-next,.ynot-deal-desktop-prev,.ynot-deal-desktop-next';
  const isXButton=node=>{if(!(node instanceof HTMLElement))return false;const text=(node.textContent||'').trim().toLowerCase();return text==='×'||text==='x'||text==='✕'||text==='✖'};
  const drawerButton=target=>{if(!(target instanceof Element))return null;const explicit=target.closest(DRAWER_CLOSE);if(explicit instanceof HTMLElement)return explicit;const node=target.closest('.ynot-drawer.open .ynot-selected button,.ynot-drawer.open .ynot-selected [role="button"]');return isXButton(node)?node:null};
  const worldButton=target=>target instanceof Element?target.closest(WORLD_CLOSE):null;
  const lockWorld=(ms=900)=>{window.__ynotProductGestureLockUntil=Date.now()+ms};
  const killMediaOverlays=()=>document.querySelectorAll('.ynot-final-media-viewer,.ynot-deal-gallery-viewer').forEach(n=>n.remove());
  const syncPopupState=()=>{const detail=document.querySelector('.lv4-detail');document.body.classList.toggle('ynot-any-product-popup-open',Boolean(detail));if(!detail)document.body.classList.remove('ynot-product-popup-open')};

  function ensureUiFixes(){
    if(!document.getElementById('ynot-product-control-runtime-fix')){
      const style=document.createElement('style');
      style.id='ynot-product-control-runtime-fix';
      style.textContent=`
        html body .lv4-detail>.lv4-close{display:grid!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;touch-action:manipulation!important;z-index:2147483647!important}
        .ynot-drawer.open .ynot-search{display:flex!important;align-items:center!important;gap:9px!important;overflow:hidden!important}
        .ynot-drawer.open .ynot-search>svg{flex:0 0 18px!important;width:18px!important;height:18px!important;min-width:18px!important;max-width:18px!important;margin:0 0 0 2px!important;padding:0!important;transform:none!important}
        .ynot-drawer.open .ynot-search>input{flex:1 1 auto!important;min-width:0!important;width:auto!important;transform:none!important;margin:0!important;padding-left:0!important}
        .ynot-drawer.open .ynot-dock{display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
        .ynot-drawer.open .ynot-dock>button{display:inline-flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;flex:0 0 auto!important}
        @media(max-width:760px){
          .ynot-drawer.open .ynot-search{left:16px!important;right:16px!important;width:auto!important;height:42px!important;min-height:42px!important;max-height:42px!important;padding:0 12px!important;border-radius:21px!important}
          .ynot-drawer.open .ynot-search>svg{width:17px!important;height:17px!important;min-width:17px!important;max-width:17px!important}
          .ynot-drawer.open .ynot-search>input{font-size:15px!important;line-height:1.2!important}
          .ynot-drawer.open .ynot-dock{min-height:40px!important;height:40px!important;overflow-x:auto!important;overflow-y:hidden!important;white-space:nowrap!important;flex-wrap:nowrap!important;-webkit-overflow-scrolling:touch!important;scrollbar-width:none!important}
          .ynot-drawer.open .ynot-dock::-webkit-scrollbar{display:none!important}
        }
      `;
      document.head.appendChild(style);
    }
    document.querySelectorAll('.lv4-detail>.lv4-close').forEach(button=>{
      if(!(button instanceof HTMLElement))return;
      button.style.setProperty('display','grid','important');
      button.style.setProperty('visibility','visible','important');
      button.style.setProperty('opacity','1','important');
      button.style.setProperty('pointer-events','auto','important');
    });
  }

  function fallbackClose(selected,button){
    killMediaOverlays();
    if(!(selected instanceof HTMLElement)||!selected.isConnected)return;
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));
    document.dispatchEvent(new KeyboardEvent('keyup',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));
    setTimeout(()=>{
      if(!selected.isConnected)return;
      const alternate=[...document.querySelectorAll('.ynot-drawer.open button,.ynot-drawer.open [role="button"]')].find(n=>n!==button&&(n.matches?.('.ynot-close,.ynot-selected-close,.ynot-story-close')||isXButton(n)||/close/i.test(n.getAttribute?.('aria-label')||'')));
      alternate?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
    },80)
  }

  document.addEventListener('pointerdown',event=>{const button=drawerButton(event.target);if(!button)return;killMediaOverlays();lockWorld()},true);
  document.addEventListener('pointerup',event=>{
    const button=drawerButton(event.target);if(!(button instanceof HTMLElement))return;
    killMediaOverlays();lockWorld();const selected=button.closest('.ynot-selected');
    setTimeout(()=>{if(!(selected instanceof HTMLElement)||!selected.isConnected)return;button.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));setTimeout(()=>fallbackClose(selected,button),90)},70);
  },true);
  document.addEventListener('click',event=>{const button=drawerButton(event.target);if(!button)return;killMediaOverlays();lockWorld();const selected=button.closest('.ynot-selected');setTimeout(()=>fallbackClose(selected,button),140)},true);
  document.addEventListener('touchend',event=>{const button=drawerButton(event.target);if(!(button instanceof HTMLElement))return;killMediaOverlays();lockWorld();const selected=button.closest('.ynot-selected');setTimeout(()=>fallbackClose(selected,button),150)},{capture:true,passive:true});

  document.addEventListener('pointerdown',event=>{if(worldButton(event.target))lockWorld()},true);
  document.addEventListener('pointerup',event=>{const button=worldButton(event.target);if(!(button instanceof HTMLButtonElement))return;lockWorld();const detail=button.closest('.lv4-detail');setTimeout(()=>{if(!(detail instanceof HTMLElement)||!detail.isConnected)return;button.click();setTimeout(syncPopupState,0)},100)},true);

  const visiblePopup=()=>document.querySelector('.ynot-drawer.open .ynot-selected,.lv4-detail,.ynot-story');
  const targetInsidePopup=target=>target instanceof Element?target.closest('.ynot-drawer.open .ynot-selected,.lv4-detail,.ynot-story'):null;
  const allowedOutsideControl=target=>target instanceof Element?target.closest(OUTSIDE_CONTROLS):null;
  const guardOutside=event=>{const popup=visiblePopup();if(!popup||targetInsidePopup(event.target)||allowedOutsideControl(event.target))return;event.preventDefault?.();event.stopImmediatePropagation?.();lockWorld()};
  document.addEventListener('pointerdown',guardOutside,true);document.addEventListener('pointerup',guardOutside,true);document.addEventListener('click',guardOutside,true);

  const observer=new MutationObserver(()=>{killMediaOverlays();syncPopupState();ensureUiFixes()});observer.observe(document.body,{subtree:true,childList:true});killMediaOverlays();syncPopupState();ensureUiFixes();
})();