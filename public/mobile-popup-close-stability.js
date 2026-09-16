(()=>{
  const CLOSE='.ynot-drawer.open .ynot-selected-close,.ynot-drawer.open .ynot-close';
  const isClose=target=>target instanceof Element&&Boolean(target.closest(CLOSE));
  document.addEventListener('pointerdown',event=>{
    if(!isClose(event.target))return;
    event.stopPropagation();
  },true);
  document.addEventListener('pointerup',event=>{
    if(!isClose(event.target))return;
    event.stopPropagation();
  },true);
  document.addEventListener('touchstart',event=>{
    if(!isClose(event.target))return;
    event.stopPropagation();
  },{capture:true,passive:true});
  document.addEventListener('touchend',event=>{
    if(!isClose(event.target))return;
    event.stopPropagation();
  },{capture:true,passive:true});
})();
