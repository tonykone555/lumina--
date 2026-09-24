(function(){
  var VIDEO_URL='https://iycxkwoxbkanfyraohge.supabase.co/storage/v1/object/public/ad-creatives/watermark-removed%20(1).mp4';
  var modal=null,video=null,previousFocus=null,opened=false,shownThisEntry=false;
  var currencyBaselineSet=false,lastCurrencySignature='';

  function hasCachedRegion(){
    try{
      var region=JSON.parse(localStorage.getItem('ynot-region')||'null');
      return !!(region&&region.country);
    }catch(e){return false;}
  }

  function loadVideoUrl(){
    return Promise.resolve(VIDEO_URL);
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
          <button class="ynot-welcome__close" type="button" aria-label="Close welcome video" data-ynot-welcome-close><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2l12 12M14 2L2 14"/></svg></button>\
          <div class="ynot-welcome__footer">\
            <div class="ynot-welcome__copy"><small>WELCOME TO YNOT</small><strong>Everything you want. One world.</strong></div>\
            <button class="ynot-welcome__enter" type="button" data-ynot-welcome-close>Enter YNOT</button>\
          </div>\
        </div>\
      </div>';
    document.body.appendChild(modal);
    video=modal.querySelector('.ynot-welcome__video');
    video.src=VIDEO_URL;
    video.load();
    modal.querySelectorAll('[data-ynot-welcome-close]').forEach(function(el){el.addEventListener('click',close)});
    video.addEventListener('ended',function(){modal.classList.add('is-ended')});
    return modal;
  }

  function playLoadedVideo(url){
    if(!opened||!video)return;
    if(video.src!==url)video.src=url;
    video.muted=true;
    try{video.currentTime=0}catch(e){}
    var p=video.play();
    if(p&&typeof p.catch==='function')p.catch(function(){});
  }

  function show(){
    if(opened||shownThisEntry)return;
    build();
    opened=true;
    shownThisEntry=true;
    previousFocus=document.activeElement;
    document.body.classList.add('ynot-welcome-lock');
    modal.classList.add('is-open','is-loading');
    modal.setAttribute('aria-hidden','false');
    loadVideoUrl().then(function(url){
      if(!modal)return;
      modal.classList.remove('is-loading');
      playLoadedVideo(url);
    }).catch(function(){
      if(modal)modal.classList.remove('is-loading');
    });
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
    if(hasCachedRegion())setTimeout(show,350);
  }

  window.addEventListener('ynot:region-changed',function(){setTimeout(show,120)});
  window.addEventListener('ynot:currency-change',function(event){
    var signature=currencySignature(event&&event.detail);
    if(!currencyBaselineSet){
      currencyBaselineSet=true;
      lastCurrencySignature=signature;
      if(hasCachedRegion())setTimeout(show,120);
      return;
    }
    if(signature&&signature!==lastCurrencySignature){lastCurrencySignature=signature;setTimeout(show,120);}
  });
  window.addEventListener('ynot:show-welcome-video',show);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&opened)close()});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',showForCachedEntry,{once:true});
  else showForCachedEntry();

  loadVideoUrl().catch(function(){});
})();