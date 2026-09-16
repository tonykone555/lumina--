(()=>{
  let start=null;
  let synthetic=false;
  const selector='.lv4-product,.ynot-product-card';
  const interactive='button,a,input,select,textarea,label';
  function cardFrom(target){return target instanceof Element?target.closest(selector):null}
  function popupOpen(){return Boolean(document.querySelector('.lv4-detail,.ynot-selected,.ynot-story,.ynot-saved-product-backdrop'))}
  document.addEventListener('pointerdown',event=>{
    if(synthetic||event.pointerType==='mouse')return;
    const card=cardFrom(event.target);
    if(!card||event.target instanceof Element&&event.target.closest(interactive))return;
    start={card,x:event.clientX,y:event.clientY,id:event.pointerId,time:performance.now()};
  },true);
  document.addEventListener('pointerup',event=>{
    if(synthetic||!start||start.id!==event.pointerId)return;
    const current=start;start=null;
    const card=cardFrom(event.target);
    if(!card||card!==current.card)return;
    if(Math.hypot(event.clientX-current.x,event.clientY-current.y)>12)return;
    if(performance.now()-current.time>700)return;
    setTimeout(()=>{
      if(popupOpen()||!document.contains(current.card))return;
      synthetic=true;
      try{current.card.click()}finally{queueMicrotask(()=>{synthetic=false})}
    },55);
  },true);
  document.addEventListener('pointercancel',()=>{start=null},true);
})();
