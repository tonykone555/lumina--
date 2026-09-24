(function(){
  var SEEN_KEY='ynot:welcome-video-seen:v1';
  var modal=null,video=null,previousFocus=null,opened=false;

  function hasSeen(){try{return sessionStorage.getItem(SEEN_KEY)==='1'}catch(e){return false}}
  function markSeen(){try{sessionStorage.setItem(SEEN_KEY,'1')}catch(e){}}

  function build(){
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='ynot-welcome-video';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-label','Welcome to YNOT');
    modal.innerHTML='\
      <div class="ynot-welcome__backdrop" data-ynot-welcome-close></div>\
      <div class="ynot-welcome__panel">\
        <div class="ynot-welcome__media">\
          <video class="ynot-welcome__video" src="/ynot-welcome.mp4" muted playsinline webkit-playsinline preload="auto"></video>\
          <button class="ynot-welcome__sound" type="button" aria-label="Turn sound on">Sound on</button>\
          <button class="ynot-welcome__close" type="button" aria-label="Close welcome video" data-ynot-welcome-close><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2l12 12M14 2L2 14"/></svg></button>\
          <div class="ynot-welcome__footer">\
            <div class="ynot-welcome__copy"><small>WELCOME TO YNOT</small><strong>Everything you want. One world.</strong></div>\
            <button class="ynot-welcome__enter" type="button" data-ynot-welcome-close>Enter YNOT</button>\
          </div>\
        </div>\
      </div>';
    document.body.appendChild(modal);
    video=modal.querySelector('.ynot-welcome__video');
    var sound=modal.querySelector('.ynot-welcome__sound');
    modal.querySelectorAll('[data-ynot-welcome-close]').forEach(function(el){el.addEventListener('click',close)});
    sound.addEventListener('click',function(){
      if(!video)return;
      video.muted=!video.muted;
      sound.textContent=video.muted?'Sound on':'Sound off';
      sound.setAttribute('aria-label',video.muted?'Turn sound on':'Turn sound off');
      if(video.paused)video.play().catch(function(){});
    });
    video.addEventListener('ended',function(){modal.classList.add('is-ended')});
    return modal;
  }

  function show(){
    if(opened||hasSeen())return;
    build();
    opened=true;
    markSeen();
    previousFocus=document.activeElement;
    document.body.classList.add('ynot-welcome-lock');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
    if(video){
      video.muted=true;
      video.currentTime=0;
      video.play().catch(function(){});
    }
    var closeButton=modal.querySelector('.ynot-welcome__close');
    if(closeButton)setTimeout(function(){try{closeButton.focus({preventScroll:true})}catch(e){closeButton.focus()}},40);
  }

  function close(){
    if(!modal||!opened)return;
    opened=false;
    modal.classList.remove('is-open','is-ended');
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('ynot-welcome-lock');
    if(video){video.pause();video.currentTime=0;video.muted=true}
    if(previousFocus&&typeof previousFocus.focus==='function'){try{previousFocus.focus({preventScroll:true})}catch(e){}}
  }

  window.addEventListener('ynot:region-changed',function(){setTimeout(show,120)});
  window.addEventListener('ynot:show-welcome-video',show);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&opened)close()});
})();