(()=>{
  const norm=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  let start=null,queued=false,prev=null,next=null;
  function cards(){return [...document.querySelectorAll('.ynot-drawer.open .ynot-orb')].filter(card=>card instanceof HTMLElement)}
  function titleOf(node){return norm(node.querySelector('.ynot-orb-copy b')?.textContent||'')}
  function selected(){return document.querySelector('.ynot-drawer.open .ynot-selected')}
  function selectedTitle(){return norm(selected()?.querySelector('.ynot-selected-copy h3,.ynot-selected h3')?.textContent||'')}
  function openCard(target){
    if(!(target instanceof HTMLElement))return;
    target.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,cancelable:true}));
  }
  function move(direction){
    const list=cards();if(list.length<2)return;
    const current=selectedTitle();
    let index=list.findIndex(card=>titleOf(card)===current);
    if(index<0){const active=list.findIndex(card=>card.classList.contains('active'));index=active>=0?active:0}
    const target=list[(index+direction+list.length)%list.length];if(!target)return;
    /* Replace the selected product in place. Never close the card first: that was exposing the dashboard between products on mobile. */
    openCard(target);
  }
  function ensureControls(){
    if(!prev){prev=document.createElement('button');prev.type='button';prev.className='ynot-deal-desktop-prev';prev.setAttribute('aria-label','Previous product');prev.innerHTML='<span></span>';prev.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();move(-1)});document.body.appendChild(prev)}
    if(!next){next=document.createElement('button');next.type='button';next.className='ynot-deal-desktop-next';next.setAttribute('aria-label','Next product');next.innerHTML='<span></span>';next.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();move(1)});document.body.appendChild(next)}
  }
  function syncControls(){queued=false;ensureControls();const drawer=Boolean(document.querySelector('.ynot-drawer.open'));const show=Boolean(drawer&&selected()&&window.innerWidth>=900&&cards().length>1);prev?.classList.toggle('visible',show);next?.classList.toggle('visible',show);if(prev)prev.disabled=!show;if(next)next.disabled=!show}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(syncControls)}
  document.addEventListener('pointerdown',event=>{const shell=event.target instanceof Element?event.target.closest('.ynot-drawer.open .ynot-selected'):null;if(!shell)return;if(event.target instanceof Element&&event.target.closest('button,input,a,video,.ynot-deal-thumb-gallery,.ynot-full-slider'))return;start={x:event.clientX,y:event.clientY,id:event.pointerId}},true);
  document.addEventListener('pointerup',event=>{if(!start||event.pointerId!==start.id)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;start=null;if(Math.abs(dx)<58||Math.abs(dx)<Math.abs(dy)*1.15)return;event.preventDefault();event.stopPropagation();move(dx<0?1:-1)},true);
  document.addEventListener('pointercancel',()=>{start=null},true);
  const observer=new MutationObserver(queue);function init(){ensureControls();observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});window.addEventListener('resize',queue);queue()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();