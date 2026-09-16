(()=>{
  const norm=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  let start=null,queued=false;
  function cards(){return [...document.querySelectorAll('.ynot-drawer.open .ynot-orb')]}
  function titleOf(node){return norm(node.querySelector('.ynot-orb-copy b')?.textContent||'')}
  function selected(){return document.querySelector('.ynot-drawer.open .ynot-selected')}
  function selectedTitle(){return norm(selected()?.querySelector('.ynot-selected-copy h3,.ynot-selected h3')?.textContent||'')}
  function move(direction){const list=cards();if(list.length<2)return;const current=selectedTitle();let index=list.findIndex(card=>titleOf(card)===current);if(index<0)index=0;const next=(index+direction+list.length)%list.length,target=list[next];if(target instanceof HTMLElement)target.click()}
  function syncControls(){queued=false;document.querySelectorAll('.ynot-deal-desktop-prev,.ynot-deal-desktop-next').forEach(node=>node.remove());const shell=selected();if(!shell||window.innerWidth<900||cards().length<2)return;const prev=document.createElement('button'),next=document.createElement('button');prev.type=next.type='button';prev.className='ynot-deal-desktop-prev';next.className='ynot-deal-desktop-next';prev.setAttribute('aria-label','Previous product');next.setAttribute('aria-label','Next product');prev.innerHTML='<span></span>';next.innerHTML='<span></span>';prev.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();move(-1)});next.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();move(1)});shell.append(prev,next)}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(syncControls)}
  document.addEventListener('pointerdown',event=>{const shell=event.target instanceof Element?event.target.closest('.ynot-drawer.open .ynot-selected'):null;if(!shell)return;if(event.target instanceof Element&&event.target.closest('button,input,a,video,.ynot-deal-thumb-gallery,.ynot-final-media-viewer'))return;start={x:event.clientX,y:event.clientY,id:event.pointerId}},true);
  document.addEventListener('pointerup',event=>{if(!start||event.pointerId!==start.id)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;start=null;if(Math.abs(dx)<58||Math.abs(dx)<Math.abs(dy)*1.15)return;event.preventDefault();event.stopPropagation();move(dx<0?1:-1)},true);
  document.addEventListener('pointercancel',()=>{start=null},true);
  const observer=new MutationObserver(queue);function init(){observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});window.addEventListener('resize',queue);queue()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();