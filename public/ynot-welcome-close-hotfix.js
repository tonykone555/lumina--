(()=>{
  let closing=false;

  function modal(){return document.getElementById('ynot-welcome-video')}
  function isOpen(){const root=modal();return Boolean(root&&root.classList.contains('is-open'))}
  function video(root){const el=root?.querySelector('.ynot-welcome__video,video');return el instanceof HTMLVideoElement?el:null}
  function sound(root){return root?.querySelector('.ynot-welcome__sound')||null}

  function pointFromEvent(event){
    const touch=event.changedTouches&&event.changedTouches[0]||event.touches&&event.touches[0];
    if(touch)return{x:touch.clientX,y:touch.clientY};
    if(Number.isFinite(event.clientX)&&Number.isFinite(event.clientY))return{x:event.clientX,y:event.clientY};
    return null;
  }

  function containsPoint(element,point){
    if(!element||!point)return false;
    const r=element.getBoundingClientRect();
    return point.x>=r.left&&point.x<=r.right&&point.y>=r.top&&point.y<=r.bottom;
  }

  function closeTargets(root){
    if(!root)return[];
    return [...root.querySelectorAll('[data-ynot-welcome-explicit-close],.ynot-welcome__close,.ynot-welcome__enter')];
  }

  function syncSoundUI(root,v){
    const button=sound(root);if(!button||!v)return;
    const on=!v.muted&&v.volume>0;
    button.classList.toggle('is-on',on);
    button.classList.toggle('is-attention',!on);
    button.setAttribute('aria-pressed',on?'true':'false');
    button.setAttribute('aria-label',on?'Mute welcome video':'Play welcome video with sound');
    const label=button.querySelector('span');if(label)label.textContent=on?'Sound on':'Tap for sound';
  }

  function toggleSound(event){
    const root=modal();if(!root||!isOpen())return false;
    const target=event.target instanceof Element?event.target:null;
    const point=pointFromEvent(event),button=sound(root);
    if(!button||(!(target&&target.closest('.ynot-welcome__sound'))&&!containsPoint(button,point)))return false;
    event.preventDefault?.();event.stopPropagation?.();event.stopImmediatePropagation?.();
    const v=video(root);if(!v)return true;
    const turnOn=v.muted||v.volume===0;
    v.volume=1;v.muted=!turnOn;v.defaultMuted=!turnOn;
    if(turnOn){v.removeAttribute('muted');try{v.currentTime=0}catch{}}
    else v.setAttribute('muted','');
    const play=v.play();if(play&&typeof play.catch==='function')play.catch(()=>{v.muted=true;v.defaultMuted=true;v.setAttribute('muted','');syncSoundUI(root,v)});
    syncSoundUI(root,v);
    return true;
  }

  function hardHide(){
    const root=modal();
    if(!root)return;
    root.classList.remove('is-open','is-loading');
    root.setAttribute('aria-hidden','true');
    document.body.classList.remove('ynot-welcome-lock');
    const v=video(root);
    if(v){try{v.pause()}catch{}try{v.currentTime=0}catch{}}
  }

  function forceClose(event){
    if(closing||!isOpen())return;
    closing=true;
    try{
      if(event){event.preventDefault?.();event.stopPropagation?.();event.stopImmediatePropagation?.()}
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));
      hardHide();requestAnimationFrame(hardHide);setTimeout(hardHide,80);setTimeout(hardHide,240);
    }finally{setTimeout(()=>{closing=false},280)}
  }

  function shouldClose(event){
    const root=modal();if(!root||!root.classList.contains('is-open'))return false;
    const target=event.target instanceof Element?event.target:null;
    if(target?.closest?.('[data-ynot-welcome-explicit-close],.ynot-welcome__close,.ynot-welcome__enter'))return true;
    const point=pointFromEvent(event);return closeTargets(root).some(element=>containsPoint(element,point));
  }

  function capture(event){if(toggleSound(event))return;if(shouldClose(event))forceClose(event)}
  document.addEventListener('pointerup',capture,{capture:true,passive:false});
  document.addEventListener('touchend',capture,{capture:true,passive:false});
  document.addEventListener('click',capture,{capture:true,passive:false});
})();
