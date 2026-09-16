(()=>{
  const CLOSE='.ynot-drawer.open .ynot-selected-close,.ynot-drawer.open .ynot-close,.ynot-story-close,.lv4-detail .lv4-close,.lv4-detail button[aria-label*="close" i],.lv4-detail button[title*="close" i]';
  const closeButton=target=>target instanceof Element?target.closest(CLOSE):null;
  let justClosed=0;
  const syncPopupState=()=>{
    const detail=document.querySelector('.lv4-detail');
    document.body.classList.toggle('ynot-any-product-popup-open',Boolean(detail));
    if(!detail)document.body.classList.remove('ynot-product-popup-open');
  };
  const finishWorldClose=button=>{
    const detail=button.closest('.lv4-detail');if(!detail)return;
    document.body.classList.remove('ynot-product-popup-open','ynot-any-product-popup-open');
    setTimeout(()=>{
      if(!detail.isConnected){syncPopupState();return}
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));
      const backdrop=document.querySelector('.lv4-detail-backdrop');
      if(backdrop instanceof HTMLElement)backdrop.click();
      setTimeout(()=>{
        if(detail.isConnected){detail.style.display='none';detail.setAttribute('aria-hidden','true')}
        syncPopupState();
      },80);
    },30);
  };
  document.addEventListener('pointerdown',event=>{
    const button=closeButton(event.target);if(!(button instanceof HTMLButtonElement))return;
    event.preventDefault();event.stopImmediatePropagation();justClosed=Date.now();
    button.click();finishWorldClose(button);
  },true);
  document.addEventListener('touchstart',event=>{
    const button=closeButton(event.target);if(!(button instanceof HTMLButtonElement))return;
    justClosed=Date.now();button.click();finishWorldClose(button);
  },{capture:true,passive:true});
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
  const observer=new MutationObserver(syncPopupState);observer.observe(document.body,{subtree:true,childList:true});syncPopupState();
})();
