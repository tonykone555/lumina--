(function(){
  var SEEN_KEY='ynot:welcome-video-seen:v2';
  var PARTS=['/ynot-welcome-v1/part01.b64','/ynot-welcome-v1/part02.b64','/ynot-welcome-v1/part03.b64','/ynot-welcome-v1/part04.b64','/ynot-welcome-v1/part05.b64'];
  var modal=null,video=null,previousFocus=null,opened=false,videoUrlPromise=null;
  var currencyBaselineSet=false,lastCurrencySignature='';

  function hasSeen(){try{return sessionStorage.getItem(SEEN_KEY)==='1'}catch(e){return false}}
  function markSeen(){try{sessionStorage.setItem(SEEN_KEY,'1')}catch(e){}}

  function loadVideoUrl(){
    if(videoUrlPromise)return videoUrlPromise;
    videoUrlPromise=Promise.all(PARTS.map(function(path){
      return fetch(path+'?v=2',{cache:'force-cache'}).then(function(response){
        if(!response.ok)throw new Error('YNOT welcome asset failed: '+path);
        return response.text();
      });
    })).then(function(chunks){
      var raw=atob(chunks.join('').replace(/\s+/g,''));
      var bytes=new Uint8Array(raw.length);
      for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
      return URL.createObjectURL(new Blob([bytes],{type:'video/mp4'}));
    });
    return videoUrlPromise;
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
    if(opened||hasSeen())return;
    build();
    opened=true;
    markSeen();
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

  window.addEventListener('ynot:region-changed',function(){setTimeout(show,120)});
  window.addEventListener('ynot:currency-change',function(event){
    var signature=currencySignature(event&&event.detail);
    if(!currencyBaselineSet){currencyBaselineSet=true;lastCurrencySignature=signature;return;}
    if(signature&&signature!==lastCurrencySignature){lastCurrencySignature=signature;setTimeout(show,120);}
  });
  window.addEventListener('ynot:show-welcome-video',show);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&opened)close()});

  loadVideoUrl().catch(function(){});
})();