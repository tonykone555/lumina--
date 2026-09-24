(()=>{
  let closing=false;

  function modal(){return document.getElementById('ynot-welcome-video')}
  function isOpen(){const root=modal();return Boolean(root&&root.classList.contains('is-open'))}

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

  function hardHide(){
    const root=modal();
    if(!root)return;
    root.classList.remove('is-open','is-loading');
    root.setAttribute('aria-hidden','true');
    document.body.classList.remove('ynot-welcome-lock');
    const video=root.querySelector('video');
    if(video instanceof HTMLVideoElement){
      try{video.pause()}catch{}
      try{video.currentTime=0}catch{}
    }
  }

  function forceClose(event){
    if(closing||!isOpen())return;
    closing=true;
    try{
      if(event){event.preventDefault?.();event.stopPropagation?.()}
      // Use the popup's own close path first. This clears its internal
      // autoplay/integrity timers instead of only hiding the DOM.
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));
      hardHide();
      requestAnimationFrame(hardHide);
      setTimeout(hardHide,80);
      setTimeout(hardHide,240);
    }finally{
      setTimeout(()=>{closing=false},280);
    }
  }

  function shouldClose(event){
    const root=modal();
    if(!root||!root.classList.contains('is-open'))return false;
    const target=event.target instanceof Element?event.target:null;
    if(target?.closest?.('[data-ynot-welcome-explicit-close],.ynot-welcome__close,.ynot-welcome__enter'))return true;
    const point=pointFromEvent(event);
    return closeTargets(root).some(element=>containsPoint(element,point));
  }

  function capture(event){if(shouldClose(event))forceClose(event)}

  // Pointer events cover desktop + modern mobile. touchend/click are kept as
  // fallbacks for iOS WebKit and embedded browsers that retarget video taps.
  document.addEventListener('pointerdown',capture,{capture:true,passive:false});
  document.addEventListener('pointerup',capture,{capture:true,passive:false});
  document.addEventListener('touchend',capture,{capture:true,passive:false});
  document.addEventListener('click',capture,{capture:true,passive:false});
})();
