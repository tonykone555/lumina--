(()=>{
  let hideTimer=0,startX=null,startY=null;
  function reveal(){document.documentElement.classList.add('ynot-saves-edge-visible');clearTimeout(hideTimer);hideTimer=window.setTimeout(()=>document.documentElement.classList.remove('ynot-saves-edge-visible'),2200)}
  function open(){window.dispatchEvent(new Event('ynot:open-saves'));document.documentElement.classList.remove('ynot-saves-edge-visible')}
  function mount(){
    if(document.querySelector('.ynot-saves-edge-handle'))return;
    const zone=document.createElement('div');zone.className='ynot-saves-edge-zone';zone.setAttribute('aria-hidden','true');
    const button=document.createElement('button');button.type='button';button.className='ynot-saves-edge-handle';button.setAttribute('aria-label','Open saved products');button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4.5A2.5 2.5 0 0 1 4.5 2H10a2 2 0 0 1 2 2v16a2 2 0 0 0-2-2H4.5A2.5 2.5 0 0 0 2 20.5z"/><path d="M22 4.5A2.5 2.5 0 0 0 19.5 2H14a2 2 0 0 0-2 2v16a2 2 0 0 1 2-2h5.5a2.5 2.5 0 0 1 2.5 2.5z"/></svg>';
    button.addEventListener('click',open);
    button.addEventListener('pointerenter',reveal);
    zone.addEventListener('pointerenter',reveal);
    document.body.append(zone,button);
  }
  document.addEventListener('pointerdown',event=>{if(event.clientX>24)return;startX=event.clientX;startY=event.clientY},{passive:true});
  document.addEventListener('pointermove',event=>{if(startX==null)return;const dx=event.clientX-startX,dy=Math.abs(event.clientY-startY);if(dx>26&&dx>dy){reveal();startX=null;startY=null}},{passive:true});
  document.addEventListener('pointerup',()=>{startX=null;startY=null},{passive:true});
  document.addEventListener('pointercancel',()=>{startX=null;startY=null},{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
