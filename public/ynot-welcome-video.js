(function(){
  var VIDEO_URL='https://iycxkwoxbkanfyraohge.supabase.co/storage/v1/object/public/ad-creatives/watermark-removed%20(1).mp4';
  var modal=null,video=null,soundButton=null,previousFocus=null,opened=false,shownThisEntry=false;
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
    soundButton.setAttribute('aria-pressed',soundOn?'true':'false');
    soundButton.setAttribute('aria-label',soundOn?'Mute welcome video':'Turn sound on');
    var label=soundButton.querySelector('span');
    if(label)label.textContent=soundOn?'Sound on':'Sound';
  }

  function setSound(on){
    if(!video)return Promise.resolve(false);
    video.muted=!on;
    video.volume=1;
    updateSoundUI();
    var playPromise=video.play();
    if(playPromise&&typeof playPromise.then==='function'){
      return playPromise.then(function(){updateSoundUI();return true;}).catch(function(){
        if(on){
          video.muted=true;
          updateSoundUI();
          var mutedPlay=video.play();
          if(mutedPlay&&typeof mutedPlay.catch==='function')mutedPlay.catch(function(){});
        }
        return false;
      });
    }
    return Promise.resolve(true);
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
          <video class="ynot-welcome__video" muted playsinline webkit-playsinline preload="auto"></video>\
          <button class="ynot-welcome__sound" type="button" aria-label="Turn sound on" aria-pressed="false">\
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 8h3L11 4.5v11L6.5 12h-3z"/><path class="ynot-welcome__sound-wave" d="M13.5 7.2c1.1 1.5 1.1 4.1 0 5.6M15.8 5.5c2.1 2.5 2.1 6.5 0 9"/></svg><span>Sound</span>\
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
    video.src=VIDEO_URL;
    video.load();
    modal.querySelectorAll('[data-ynot-welcome-close]').forEach(function(el){el.addEventListener('click',close)});
    soundButton.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();setSound(video.muted)});
    video.addEventListener('click',function(){if(video.muted)setSound(true)});
    video.addEventListener('volumechange',updateSoundUI);
    video.addEventListener('canplay',function(){if(modal)modal.classList.remove('is-loading')});
    video.addEventListener('ended',function(){modal.classList.add('is-ended')});
    updateSoundUI();
    return modal;
  }

  function playVideo(preferSound){
    if(!opened||!video)return;
    try{video.currentTime=0}catch(e){}
    setSound(!!preferSound);
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
    playVideo(!!preferSound);
    var closeButton=modal.querySelector('.ynot-welcome__close');
    if(closeButton)setTimeout(function(){try{closeButton.focus({preventScroll:true})}catch(e){closeButton.focus()}},40);
  }

  function close(){
    if(!modal||!opened)return;
    opened=false;
    modal.classList.remove('is-open','is-ended','is-loading');
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
    if(hasCachedRegion())setTimeout(function(){show(false)},350);
  }

  window.addEventListener('ynot:region-changed',function(){show(true)});
  window.addEventListener('ynot:currency-change',function(event){
    var signature=currencySignature(event&&event.detail);
    if(!currencyBaselineSet){
      currencyBaselineSet=true;
      lastCurrencySignature=signature;
      return;
    }
    if(signature&&signature!==lastCurrencySignature){lastCurrencySignature=signature;show(true)}
  });
  window.addEventListener('ynot:show-welcome-video',function(){show(false)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&opened)close()});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',showForCachedEntry,{once:true});
  else showForCachedEntry();
})();