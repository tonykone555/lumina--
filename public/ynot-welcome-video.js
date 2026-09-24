(function(){
  var VIDEO_URL='https://iycxkwoxbkanfyraohge.supabase.co/storage/v1/object/public/ad-creatives/watermark-removed%20(1).mp4';
  var PENDING_KEY='ynot:welcome-pending:v1';
  var modal=null,video=null,soundButton=null,previousFocus=null,opened=false,shownThisEntry=false,retryTimers=[],integrityTimers=[],entryTimer=0,entryChecks=0,currencyOpenTimer=0,appReadyTimer=0,appReadyChecks=0,explicitCloseReadyAt=0,pendingSound=false;
  var currencyBaselineSet=false,lastCurrencySignature='';
  var CURRENCY_OPEN_DELAY_MS=320,APP_READY_DELAY_MS=520,EXPLICIT_CLOSE_DELAY_MS=1100;

  function isIOSSafari(){
    var ua=navigator.userAgent||'';
    var ios=/iP(?:hone|ad|od)/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    var webkit=/WebKit/i.test(ua);
    var other=/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
    return !!(ios&&webkit&&!other);
  }

  function hasStoredRegion(){
    try{
      var raw=localStorage.getItem('ynot-region');
      if(raw&&raw!=='null'&&raw!=='undefined'&&raw!=='{}')return true;
    }catch(e){}
    var root=document.documentElement;
    return !!(root&&(root.dataset.ynotCountry||root.dataset.ynotCurrency));
  }

  function appReady(){
    if(document.readyState==='loading')return false;
    if(!document.getElementById('ynot-welcome-host'))return false;
    if(!document.querySelector('.ynot-app-shell'))return false;
    if(isIOSSafari())return true;
    return !!document.querySelector('.lv4-shell');
  }

  function welcomeHost(){return document.getElementById('ynot-welcome-host')||document.body}

  function savePending(preferSound){
    pendingSound=pendingSound||!!preferSound;
    try{sessionStorage.setItem(PENDING_KEY,pendingSound?'sound':'muted')}catch(e){}
  }

  function readPending(){
    try{return sessionStorage.getItem(PENDING_KEY)||''}catch(e){return''}
  }

  function clearPending(){
    try{sessionStorage.removeItem(PENDING_KEY)}catch(e){}
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

  function clearRetries(){retryTimers.forEach(function(id){clearTimeout(id)});retryTimers=[]}
  function clearIntegrity(){integrityTimers.forEach(function(id){clearTimeout(id)});integrityTimers=[]}

  function configureMutedAutoplay(){
    if(!video)return;
    video.autoplay=true;video.loop=true;video.playsInline=true;video.defaultMuted=true;video.muted=true;video.volume=1;video.controls=false;
    video.setAttribute('autoplay','');video.setAttribute('muted','');video.setAttribute('loop','');video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');
  }

  function tryMutedAutoplay(){
    if(!video||!opened)return;
    configureMutedAutoplay();updateSoundUI();
    try{var p=video.play();if(p&&typeof p.catch==='function')p.catch(function(){})}catch(e){}
  }

  function scheduleAutoplayRetries(){
    clearRetries();
    [0,80,180,350,650,1100,1800].forEach(function(delay){retryTimers.push(setTimeout(function(){if(opened&&video&&video.paused)tryMutedAutoplay()},delay))});
  }

  function startVideo(preferSound){
    if(!video)return;
    clearRetries();video.autoplay=true;video.loop=true;video.playsInline=true;video.volume=1;
    try{video.currentTime=0}catch(e){}
    if(!preferSound){tryMutedAutoplay();scheduleAutoplayRetries();return}
    video.defaultMuted=false;video.muted=false;video.removeAttribute('muted');updateSoundUI();
    try{
      var p=video.play();
      if(p&&typeof p.catch==='function')p.catch(function(){tryMutedAutoplay();scheduleAutoplayRetries()});
    }catch(e){tryMutedAutoplay();scheduleAutoplayRetries()}
  }

  function restartWithSound(){
    if(!video)return;
    clearRetries();video.loop=true;video.autoplay=true;video.volume=1;video.defaultMuted=false;video.muted=false;video.removeAttribute('muted');
    try{video.currentTime=0}catch(e){}
    updateSoundUI();
    try{var p=video.play();if(p&&typeof p.catch==='function')p.catch(function(){tryMutedAutoplay();scheduleAutoplayRetries()})}catch(e){tryMutedAutoplay();scheduleAutoplayRetries()}
  }

  function toggleSound(){
    if(!video)return;
    if(video.muted){restartWithSound();return}
    video.defaultMuted=true;video.muted=true;video.setAttribute('muted','');updateSoundUI();
  }

  function requestExplicitClose(event){
    if(event){event.preventDefault();event.stopPropagation()}
    if(!opened||Date.now()<explicitCloseReadyAt)return;
    close();
  }

  function swallowBackdrop(event){
    if(!opened)return;
    event.preventDefault();
    event.stopPropagation();
  }

  function build(){
    var host=welcomeHost();
    if(modal){if(host&&!modal.isConnected)host.appendChild(modal);return modal}
    if(!host)return null;
    modal=document.createElement('div');
    modal.id='ynot-welcome-video';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Welcome to YNOT');modal.setAttribute('aria-hidden','true');
    if(isIOSSafari())modal.classList.add('is-ios-safari');
    modal.innerHTML='\
      <div class="ynot-welcome__backdrop"></div>\
      <div class="ynot-welcome__panel">\
        <div class="ynot-welcome__media">\
          <video class="ynot-welcome__video" autoplay muted loop playsinline webkit-playsinline preload="auto"></video>\
          <button class="ynot-welcome__sound is-attention" type="button" aria-label="Restart video with sound" aria-pressed="false"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 8h3L11 4.5v11L6.5 12h-3z"/><path class="ynot-welcome__sound-wave" d="M13.5 7.2c1.1 1.5 1.1 4.1 0 5.6M15.8 5.5c2.1 2.5 2.1 6.5 0 9"/></svg><span>Tap for sound</span></button>\
          <button class="ynot-welcome__close" type="button" aria-label="Close welcome video" data-ynot-welcome-explicit-close><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2l12 12M14 2L2 14"/></svg></button>\
          <div class="ynot-welcome__footer"><div class="ynot-welcome__copy"><small>WELCOME TO YNOT</small><strong>Everything you want. One world.</strong></div><button class="ynot-welcome__enter" type="button" data-ynot-welcome-explicit-close>Enter YNOT</button></div>\
        </div>\
      </div>';
    host.appendChild(modal);
    video=modal.querySelector('.ynot-welcome__video');soundButton=modal.querySelector('.ynot-welcome__sound');
    configureMutedAutoplay();video.src=VIDEO_URL;video.load();
    modal.querySelectorAll('[data-ynot-welcome-explicit-close]').forEach(function(el){el.addEventListener('click',requestExplicitClose)});
    var backdrop=modal.querySelector('.ynot-welcome__backdrop');
    if(backdrop){['pointerdown','pointerup','touchstart','touchend','click'].forEach(function(name){backdrop.addEventListener(name,swallowBackdrop,{passive:false})})}
    soundButton.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();toggleSound()});
    video.addEventListener('click',function(e){e.stopPropagation();if(video.muted)restartWithSound()});video.addEventListener('volumechange',updateSoundUI);
    ['loadedmetadata','loadeddata','canplay'].forEach(function(name){video.addEventListener(name,function(){if(modal)modal.classList.remove('is-loading');if(opened&&video.paused)tryMutedAutoplay()})});
    updateSoundUI();return modal;
  }

  function ensureOpenIntegrity(){
    if(!opened||!modal)return;
    var host=welcomeHost();
    if(host&&!modal.isConnected)host.appendChild(modal);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
    if(document.body)document.body.classList.add('ynot-welcome-lock');
    if(video&&video.paused)tryMutedAutoplay();
  }

  function scheduleIntegrityChecks(){
    clearIntegrity();
    var checks=isIOSSafari()?[120,320,650,1100,1800,2800]:[180,480,900,1600];
    checks.forEach(function(delay){integrityTimers.push(setTimeout(ensureOpenIntegrity,delay))});
  }

  function show(preferSound){
    if(opened||shownThisEntry)return;
    if(!appReady()){queueShow(preferSound);return}
    if(!build()){setTimeout(function(){queueShow(preferSound)},80);return}
    opened=true;shownThisEntry=true;pendingSound=false;clearPending();explicitCloseReadyAt=Date.now()+EXPLICIT_CLOSE_DELAY_MS;previousFocus=document.activeElement;
    document.body.classList.add('ynot-welcome-lock');modal.classList.add('is-open','is-loading');modal.setAttribute('aria-hidden','false');
    scheduleIntegrityChecks();
    requestAnimationFrame(function(){startVideo(!!preferSound)});
  }

  function close(){
    if(!modal||!opened)return;
    opened=false;explicitCloseReadyAt=0;clearRetries();clearIntegrity();modal.classList.remove('is-open','is-loading');modal.setAttribute('aria-hidden','true');document.body.classList.remove('ynot-welcome-lock');
    if(video){video.pause();try{video.currentTime=0}catch(e){}}
    if(previousFocus&&typeof previousFocus.focus==='function'){try{previousFocus.focus({preventScroll:true})}catch(e){}}
  }

  function queueShow(preferSound){
    if(opened||shownThisEntry)return;
    savePending(preferSound);
    if(appReadyTimer)return;
    appReadyChecks=0;
    var check=function(){
      appReadyTimer=0;
      if(opened||shownThisEntry)return;
      if(appReady()){
        var delay=isIOSSafari()?180:APP_READY_DELAY_MS;
        appReadyTimer=setTimeout(function(){
          appReadyTimer=0;
          if(opened||shownThisEntry)return;
          if(!appReady()){queueShow(pendingSound);return}
          show(pendingSound);
        },delay);
        return;
      }
      if(appReadyChecks++<90)appReadyTimer=setTimeout(check,isIOSSafari()?60:80);
    };
    check();
  }

  function currencySignature(detail){detail=detail||{};var region=detail.region||{};return String(detail.currency||'')+'|'+String(region.country||region.countryCode||region.code||region.region||'')}

  function showAfterCurrency(preferSound){
    savePending(preferSound);
    if(entryTimer){clearTimeout(entryTimer);entryTimer=0}
    if(currencyOpenTimer)clearTimeout(currencyOpenTimer);
    currencyOpenTimer=setTimeout(function(){currencyOpenTimer=0;queueShow(!!preferSound)},isIOSSafari()?180:CURRENCY_OPEN_DELAY_MS);
  }

  function pollForEntry(){
    if(opened||shownThisEntry)return;
    var pending=readPending();
    if(pending){queueShow(pending==='sound');return}
    if(hasStoredRegion()){queueShow(false);return}
    if(entryChecks++<70)entryTimer=setTimeout(pollForEntry,isIOSSafari()?80:100);
  }

  function safariPageShow(){
    if(!isIOSSafari())return;
    setTimeout(function(){
      if(opened){ensureOpenIntegrity();if(video&&video.paused){tryMutedAutoplay();scheduleAutoplayRetries()}return}
      if(!shownThisEntry&&(hasStoredRegion()||readPending()))queueShow(readPending()==='sound');
    },220);
  }

  window.addEventListener('ynot:region-changed',function(){showAfterCurrency(true)});
  window.addEventListener('ynot:currency-change',function(event){
    var signature=currencySignature(event&&event.detail);
    if(!currencyBaselineSet){currencyBaselineSet=true;lastCurrencySignature=signature;if(hasStoredRegion())showAfterCurrency(false);return}
    if(signature&&signature!==lastCurrencySignature){lastCurrencySignature=signature;showAfterCurrency(true)}
  });
  window.addEventListener('storage',function(event){if(event&&event.key==='ynot-region'&&event.newValue)showAfterCurrency(false)});
  window.addEventListener('ynot:show-welcome-video',function(){queueShow(false)});
  window.addEventListener('pageshow',function(){safariPageShow();if(!shownThisEntry)pollForEntry();else if(opened){ensureOpenIntegrity();if(video&&video.paused){tryMutedAutoplay();scheduleAutoplayRetries()}}});
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&opened){ensureOpenIntegrity();if(video&&video.paused){tryMutedAutoplay();scheduleAutoplayRetries()}}});
  document.addEventListener('touchstart',function(){if(opened&&video&&video.paused)tryMutedAutoplay()},{passive:true});
  document.addEventListener('pointerdown',function(){if(opened&&video&&video.paused)tryMutedAutoplay()},{passive:true});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&opened&&Date.now()>=explicitCloseReadyAt)close()});

  function boot(){entryChecks=0;pollForEntry();if(isIOSSafari())setTimeout(function(){if(!shownThisEntry&&(hasStoredRegion()||readPending()))queueShow(readPending()==='sound')},700)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();