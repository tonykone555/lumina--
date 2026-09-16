(()=>{
  const CLOSE='.ynot-drawer.open .ynot-selected-close,.ynot-drawer.open .ynot-close,.ynot-story-close';
  const closeButton=target=>target instanceof Element?target.closest(CLOSE):null;
  let justClosed=0;
  document.addEventListener('pointerdown',event=>{
    const button=closeButton(event.target);if(!(button instanceof HTMLButtonElement))return;
    event.preventDefault();event.stopImmediatePropagation();justClosed=Date.now();button.click();
  },true);
  document.addEventListener('pointerup',event=>{
    if(Date.now()-justClosed>450||!closeButton(event.target))return;
    event.preventDefault();event.stopImmediatePropagation();
  },true);
  document.addEventListener('click',event=>{
    if(Date.now()-justClosed>450)return;
    const target=event.target instanceof Element?event.target:null;
    if(target&&target.closest('.ynot-drawer,.ynot-story'))return;
    event.preventDefault();event.stopImmediatePropagation();
  },true);
})();
