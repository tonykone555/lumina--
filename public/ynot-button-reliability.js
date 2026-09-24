(()=>{
 let lastTouch=0,lastWelcomeAction=0;
 function asElement(target){return target instanceof Element?target:null}
 function activateWorld(button){
  if(!button||button.disabled)return;
  const label=(button.textContent||'').trim().toUpperCase();
  if(label!=='WORLD')return;
  const home=document.querySelector('.lv4-logo');
  if(home instanceof HTMLButtonElement){requestAnimationFrame(()=>home.click())}
 }
 function welcomeAction(target){
  const el=asElement(target);if(!el)return false;
  const root=el.closest('#ynot-welcome-video.is-open');if(!root)return false;
  const close=el.closest('.ynot-welcome__close,[data-ynot-welcome-explicit-close]');
  const sound=el.closest('.ynot-welcome__sound');
  if(!close&&!sound)return false;
  const now=Date.now();if(now-lastWelcomeAction<260)return true;lastWelcomeAction=now;
  if(close){
   const media=root.querySelector('.ynot-welcome__video');try{media?.pause()}catch{}
   root.classList.remove('is-open','is-loading');root.setAttribute('aria-hidden','true');document.body.classList.remove('ynot-welcome-lock');
   return true;
  }
  const media=root.querySelector('.ynot-welcome__video');if(!(media instanceof HTMLVideoElement))return true;
  const on=media.muted;media.muted=!on;media.defaultMuted=!on;media.volume=1;
  if(on){media.removeAttribute('muted');try{media.currentTime=0}catch{}}else media.setAttribute('muted','');
  try{media.play()?.catch?.(()=>{})}catch{}
  sound.classList.toggle('is-on',on);sound.classList.toggle('is-attention',!on);sound.setAttribute('aria-pressed',on?'true':'false');
  const label=sound.querySelector('span');if(label)label.textContent=on?'Sound on':'Tap for sound';
  return true;
 }
 function captureWelcome(event){if(!welcomeAction(event.target))return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation()}
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
 document.addEventListener('pointerup',captureWelcome,true);
 document.addEventListener('click',captureWelcome,true);
 document.addEventListener('click',onClick,false);
 document.addEventListener('touchend',onTouchEnd,{passive:true});
 document.addEventListener('pointerup',event=>{
  if(Date.now()-lastTouch<450)return;
  const target=asElement(event.target);
  const button=target?.closest?.('button,[role="button"]');
  if(button instanceof HTMLElement)button.style.touchAction='manipulation';
 },{passive:true});
})();