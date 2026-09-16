(()=>{
  let sourceStage=null,savedTransform='',sourceStarted=0,sawEmpty=false,unlockTimer=0;
  let dragStart=null,dragDirection='',directionUntil=0;
  let knownProducts=new WeakSet();

  const stage=()=>document.querySelector('.lv4-stage');
  const productNodes=()=>[...document.querySelectorAll('.lv4-product')].filter(node=>node instanceof HTMLElement);
  function lockSourceCamera(){
    const current=stage();if(!(current instanceof HTMLElement))return;
    sourceStage=current;savedTransform=current.style.transform||getComputedStyle(current).transform||'';sourceStarted=performance.now();sawEmpty=false;
    document.body.classList.add('ynot-source-switching');
    if(savedTransform&&savedTransform!=='none')current.style.setProperty('transform',savedTransform,'important');
    if(unlockTimer)clearTimeout(unlockTimer);
    unlockTimer=setTimeout(unlockSourceCamera,5200);
  }
  function unlockSourceCamera(){
    if(unlockTimer)clearTimeout(unlockTimer);unlockTimer=0;
    if(sourceStage instanceof HTMLElement&&savedTransform)sourceStage.style.setProperty('transform',savedTransform);
    document.body.classList.remove('ynot-source-switching');
    sourceStage=null;savedTransform='';sourceStarted=0;sawEmpty=false;
  }
  function maybeUnlockSource(){
    if(!sourceStarted)return;
    const count=productNodes().length;
    if(!count)sawEmpty=true;
    if(sawEmpty&&count>0&&performance.now()-sourceStarted>180)requestAnimationFrame(()=>requestAnimationFrame(unlockSourceCamera));
  }

  document.addEventListener('pointerdown',event=>{
    const target=event.target instanceof Element?event.target:null;
    if(target?.closest('.lv4-source-menu button,.lv4-source-anchor'))lockSourceCamera();
    const world=target?.closest('.lv4-world');
    if(!world)return;
    dragStart={x:event.clientX,y:event.clientY,id:event.pointerId};
    dragDirection='';directionUntil=0;knownProducts=new WeakSet(productNodes());
  },true);
  document.addEventListener('pointermove',event=>{
    if(!dragStart||dragStart.id!==event.pointerId)return;
    const dy=event.clientY-dragStart.y,dx=event.clientX-dragStart.x;
    if(Math.abs(dy)<90||Math.abs(dy)<Math.abs(dx)*1.05)return;
    /* Finger up reveals the lower world; finger down reveals the upper world. */
    dragDirection=dy<0?'bottom':'top';directionUntil=performance.now()+5000;
  },true);
  document.addEventListener('pointerup',event=>{if(dragStart?.id===event.pointerId){if(dragDirection)directionUntil=performance.now()+5000;dragStart=null}},true);
  document.addEventListener('pointercancel',()=>{dragStart=null},true);

  function markFresh(nodes){
    if(!dragDirection||performance.now()>directionUntil)return;
    for(const node of nodes){
      if(!(node instanceof HTMLElement)||knownProducts.has(node))continue;
      knownProducts.add(node);
      node.classList.remove('ynot-drag-fresh-top','ynot-drag-fresh-bottom');
      node.classList.add(dragDirection==='top'?'ynot-drag-fresh-top':'ynot-drag-fresh-bottom');
    }
  }
  const observer=new MutationObserver(records=>{
    maybeUnlockSource();
    if(!dragDirection||performance.now()>directionUntil)return;
    const added=[];
    for(const record of records)for(const node of record.addedNodes){
      if(!(node instanceof Element))continue;
      if(node.matches('.lv4-product'))added.push(node);
      added.push(...node.querySelectorAll?.('.lv4-product')||[]);
    }
    if(added.length)markFresh(added);
  });
  function init(){observer.observe(document.body,{subtree:true,childList:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
