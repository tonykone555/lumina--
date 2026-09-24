(function(){
  var VIDEO_URL='https://iycxkwoxbkanfyraohge.supabase.co/storage/v1/object/public/ad-creatives/watermark-removed%20(1).mp4';
  var modal=null,video=null,soundButton=null,previousFocus=null,opened=false,shownThisEntry=false,retryTimers=[];
  var currencyBaselineSet=false,lastCurrencySignature='';

  function hasCachedRegion(){
    try{
      var region=JSON.parse(localStorage.getItem('ynot-region')||'null');
      return !!(region&&region.country);
    }catch(e){return false;}
  }

  function updateSoundUI(){
    if(!soundButton||!video)return;
    var soundOn=!video.muted;
    soundButton.classList.toggle('is-on',soundOn);
    soundButton.classList.toggle('is-attention',!soundOn);
    soundButton.setAttribute('aria-pressed',soundOn?'true':'false');
    soundButton.setAttribute('aria-label',soundOn?'Mute welcome video':'Restart video with sound');
    var label=soundButton.querySelector('span');
    if(label)label.textContent=soundOn?'Sound on':'Tap for sound';
  }

  function clearRetries(){
    retryTimers.forEach(function(id){clearTimeout(id)});
    retryTimers=[];
  }

  function configureForInlineAutoplay(){
    if(!video)return;
    video.autoplay=true;
    video.loop=true;
    video.playsInline=true;
    video.defaultMuted=true;
    video.muted=true;
    video.volume=1;
    video.controls=false;
    video.setAttribute('autoplay','');
    video.setAttribute('muted','');
    video.setAttribute('loop','');
    video.setAttribute('playsinline','');
    video.setAttribute('webkit-playsinline','');
  }

  function tryMutedAutoplay(){
    if(!video||!opened)return;
    configureForInlineAutoplay();
    updateSoundUI();
    var p;
    try{p=video.play()}catch(e){return;}
    if(p&&typeof p.catch==='function')p.catch(function(){});
  }

  function scheduleAutoplayRetries(){
    clearRetries();
    [0,80,180,350,650,1100,1800].forEach(function(delay){
      retryTimers.push(setTimeout(function(){
        if(opened&&video&&video.paused)tryMutedAutoplay();
      },delay));
    });
  }

  function startVideo(preferSound){
    if(!video)return;
    clearRetries();
    video.autoplay=true;
    video.loop=true;
    video.playsInline=true;
    video.volume=1;
    try{video.currentTime=0}catch(e){}

    if(!preferSound){
      tryMutedAutoplay();
      scheduleAutoplayRetries();
      return;
    }

    video.defaultMuted=false;
    video.muted=false;
    video.removeAttribute('muted');
    updateSoundUI();
    var playPromise;
    try{playPromise=video.play()}catch(e){playPromise=null}
    if(playPromise&&typeof playPromise.catch==='function'){
      playPromise.catch(function(){
        tryMutedAutoplay();
        scheduleAutoplayRetries();
      });
    }
  }

  function restartWithSound(){
    if(!video)return;
    clearRetries();
    video.loop=true;
    video.autoplay=true;
    video.volume=1;
    video.defaultMuted=false;
    video.muted=false;
    video.removeAttribute('muted');
    try{video.currentTime=0}catch(e){}
    updateSoundUI();
    var playPromise;
    try{playPromise=video.play()}catch(e){playPromise=null}
    if(playPromise&&typeof playPromise.catch==='function'){
      playPromise.catch(function(){
        tryMutedAutoplay();
        scheduleAutoplayRetries();
      });
    }
  }

  function toggleSound(){
    if(!video)return;
    if(video.muted){restartWithSound();return;}
    video.defaultMuted=true;
    video.muted=true;
    video.setAttribute('muted','');
    updateSoundUI();
  }

  function build(){
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='ynot-welcome-video';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-label','Welcome to YNOT');
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML='\
      <div class="ynot-welcome__backdrop" data-ynot-welcome-close></div>\
      <div class="ynot-welcome__panel">\
        <div class="ynot-welcome__media">\
          <video class="ynot-welcome__video" autoplay muted loop playsinline webkit-playsinline preload="auto"></video>\
          <button class="ynot-welcome__sound is-attention" type="button" aria-label="Restart video with sound" aria-pressed="false">\
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 8h3L11 4.5v11L6.5 12h-3z"/><path class="ynot-welcome__sound-wave" d="M13.5 7.2c1.1 1.5 1.1 4.1 0 5.6M15.8 5.5c2.1 2.5 2.1 6.5 0 9"/></svg><span>Tap for sound</span>\
          </button>\
          <button class="ynot-welcome__close" type="button" aria-label="Close welcome video" data-ynot-welcome-close><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2l12 12M14 2L2 14"/></svg></button>\
          <div class="ynot-welcome__footer">\
            <div class="ynot-welcome__copy"><small>WELCOME TO YNOT</small><strong>Everything you want. One world.</strong></div>\
            <button class="ynot-welcome__enter" type="button" data-ynot-welcome-close>Enter YNOT</button>\
          </div>\
        </div>\
      </div>';
    document.body.appendChild(modal);
    video=modal.querySelector('.ynot-welcome__video');
    soundButton=modal.querySelector('.ynot-welcome__sound');
    configureForInlineAutoplay();
    video.src=VIDEO_URL;
    video.load();

    modal.querySelectorAll('[data-ynot-welcome-close]').forEach(function(el){el.addEventListener('click',close)});
    soundButton.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();toggleSound()});
    video.addEventListener('click',function(){if(video.muted)restartWithSound()});
    video.addEventListener('volumechange',updateSoundUI);
    ['loadedmetadata','loadeddata','canplay'].forEach(function(name){
      video.addEventListener(name,function(){
        if(modal)modal.classList.remove('is-loading');
        if(opened&&video.paused)tryMutedAutoplay();
      });
    });
    updateSoundUI();
    return modal;
  }

  function show(preferSound){
    if(opened||shownThisEntry)return;
    build();
    opened=true;
    shownThisEntry=true;
    previousFocus=document.activeElement;
    document.body.classList.add('ynot-welcome-lock');
    modal.classList.add('is-open','is-loading');
    modal.setAttribute('aria-hidden','false');
    requestAnimationFrame(function(){startVideo(!!preferSound)});
    var closeButton=modal.querySelector('.ynot-welcome__close');
    if(closeButton)setTimeout(function(){try{closeButton.focus({preventScroll:true})}catch(e){closeButton.focus()}},40);
  }

  function close(){
    if(!modal||!opened)return;
    opened=false;
    clearRetries();
    modal.classList.remove('is-open','is-loading');
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('ynot-welcome-lock');
    if(video){video.pause();try{video.currentTime=0}catch(e){}}
    if(previousFocus&&typeof previousFocus.focus==='function'){try{previousFocus.focus({preventScroll:true})}catch(e){}}
  }

  function currencySignature(detail){
    detail=detail||{};
    var region=detail.region||{};
    return String(detail.currency||'')+'|'+String(region.country||region.countryCode||region.code||region.region||'');
  }

  function showForCachedEntry(){
    if(hasCachedRegion())setTimeout(function(){show(false)},250);
  }

  window.addEventListener('ynot:region-changed',function(){show(true)});
  window.addEventListener('ynot:currency-change',function(event){
    var signature=currencySignature(event&&event.detail);
    if(!currencyBaselineSet){currencyBaselineSet=true;lastCurrencySignature=signature;return;}
    if(signature&&signature!==lastCurrencySignature){lastCurrencySignature=signature;show(true)}
  });
  window.addEventListener('ynot:show-welcome-video',function(){show(false)});
  window.addEventListener('pageshow',function(){if(opened&&video&&video.paused){tryMutedAutoplay();scheduleAutoplayRetries()}});
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&opened&&video&&video.paused){tryMutedAutoplay();scheduleAutoplayRetries()}});
  document.addEventListener('touchstart',function(){if(opened&&video&&video.paused)tryMutedAutoplay()},{passive:true});
  document.addEventListener('pointerdown',function(){if(opened&&video&&video.paused)tryMutedAutoplay()},{passive:true});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&opened)close()});

  build();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',showForCachedEntry,{once:true});
  else showForCachedEntry();
})();