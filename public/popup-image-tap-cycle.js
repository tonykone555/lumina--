(()=>{
  function nextButton(buttons,current){
    if(!buttons.length)return null;
    let index=buttons.findIndex(button=>button.classList.contains('active'));
    if(index<0)index=0;
    return buttons[(index+1)%buttons.length]||buttons[0];
  }

  function cycleWorld(main,event){
    const card=main.closest('.lv4-detail');
    if(!card)return;
    const gallery=card.querySelector('.ynot-loaded-gallery,.ynot-rich-gallery,.lv4-gallery');
    if(!gallery)return;
    const buttons=[...gallery.querySelectorAll(':scope > button')].filter(button=>!button.classList.contains('ynot-gallery-more')&&!button.classList.contains('ynot-reference-more-thumb'));
    const next=nextButton(buttons,null);
    if(!next)return;
    event.preventDefault();event.stopPropagation();
    next.click();
  }

  function cycleDeal(main,event){
    const selected=main.closest('.ynot-selected');
    if(!selected)return;
    const gallery=selected.querySelector('.ynot-deal-thumb-gallery');
    if(!gallery)return;
    const buttons=[...gallery.querySelectorAll(':scope > button')].filter(button=>!button.classList.contains('ynot-deal-thumb-more'));
    const next=nextButton(buttons,null);
    if(!next)return;
    event.preventDefault();event.stopPropagation();
    next.click();
  }

  document.addEventListener('click',event=>{
    const target=event.target;
    if(!(target instanceof HTMLImageElement))return;
    if(target.matches('.lv4-detail > img,.lv4-detail .ynot-main-product-image')){cycleWorld(target,event);return}
    if(target.matches('.ynot-drawer.open .ynot-selected > img'))cycleDeal(target,event);
  },true);
})();
