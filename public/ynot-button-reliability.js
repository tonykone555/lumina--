(()=>{
 let lastTouch=0;
 function asElement(target){return target instanceof Element?target:null}
 function activateWorld(button){
  if(!button||button.disabled)return;
  const label=(button.textContent||'').trim().toUpperCase();
  if(label!=='WORLD')return;
  const home=document.querySelector('.lv4-logo');
  if(home instanceof HTMLButtonElement){requestAnimationFrame(()=>home.click())}
 }
 function onClick(event){
  const target=asElement(event.target);
  if(!target)return;
  const world=target.closest('.ynot-world-row button');
  if(world instanceof HTMLButtonElement)activateWorld(world);
 }
 function onTouchEnd(event){
  lastTouch=Date.now();
  const target=asElement(event.target);
  if(!target)return;
  const button=target.closest('button,[role="button"]');
  if(!(button instanceof HTMLElement)||button.getAttribute('aria-disabled')==='true'||('disabled' in button&&button.disabled))return;
  button.style.touchAction='manipulation';
 }
 document.addEventListener('click',onClick,false);
 document.addEventListener('touchend',onTouchEnd,{passive:true});
 document.addEventListener('pointerup',event=>{
  if(Date.now()-lastTouch<450)return;
  const target=asElement(event.target);
  const button=target?.closest?.('button,[role="button"]');
  if(button instanceof HTMLElement)button.style.touchAction='manipulation';
 },{passive:true});
})();