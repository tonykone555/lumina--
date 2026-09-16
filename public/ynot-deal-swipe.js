(()=>{
  const norm=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  let start=null;

  function cards(){return [...document.querySelectorAll('.ynot-drawer.open .ynot-orb')];}
  function titleOf(node){return norm(node.querySelector('.ynot-orb-copy b')?.textContent||'');}
  function selectedTitle(){return norm(document.querySelector('.ynot-drawer.open .ynot-selected .ynot-selected-copy h3,.ynot-drawer.open .ynot-selected h3')?.textContent||'');}
  function move(direction){
    const list=cards();if(list.length<2)return;
    const current=selectedTitle();
    let index=list.findIndex(card=>titleOf(card)===current);
    if(index<0)index=0;
    const next=(index+direction+list.length)%list.length;
    const target=list[next];
    if(target instanceof HTMLElement)target.click();
  }

  document.addEventListener('pointerdown',event=>{
    const selected=event.target instanceof Element?event.target.closest('.ynot-drawer.open .ynot-selected'):null;
    if(!selected)return;
    if(event.target instanceof Element&&event.target.closest('button,input,a,video,.ynot-deal-thumb-gallery'))return;
    start={x:event.clientX,y:event.clientY,id:event.pointerId};
  },true);

  document.addEventListener('pointerup',event=>{
    if(!start||event.pointerId!==start.id)return;
    const dx=event.clientX-start.x,dy=event.clientY-start.y;start=null;
    if(Math.abs(dx)<58||Math.abs(dx)<Math.abs(dy)*1.15)return;
    event.preventDefault();event.stopPropagation();
    move(dx<0?1:-1);
  },true);

  document.addEventListener('pointercancel',()=>{start=null},true);
})();
