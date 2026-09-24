(function(){
  var VIDEO_URL='https://iycxkwoxbkanfyraohge.supabase.co/storage/v1/object/public/ad-creatives/_users_7b03795e-f119-48bf-b017-4126fcff6c6d_generated_4ca87740-f44c-4319-bdae-9756c57bb8b0_generated_video.mp4';
  var root=null,video=null,observer=null,visible=false,started=false,ready=false,retryTimers=[],sourceFailures=0,sourceRetryTimer=0;

  function addStyles(){
    if(document.getElementById('ynot-desktop-home-video-style'))return;
    var style=document.createElement('style');
    style.id='ynot-desktop-home-video-style';
    style.textContent='\
      #ynot-desktop-home-video{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none;opacity:0;visibility:hidden;background:#050606;transition:opacity .38s ease,visibility .38s ease}\
      #ynot-desktop-home-video.is-visible{opacity:1;visibility:visible}\
      #ynot-desktop-home-video video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center center;display:block;filter:brightness(.78) saturate(.96);background:#050606;pointer-events:none}\
      #ynot-desktop-home-video:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.14),rgba(0,0,0,.02) 45%,rgba(0,0,0,.18));pointer-events:none}\
      body.ynot-desktop-home-video-active{background:#050606!important}\
      body.ynot-desktop-home-video-active .ynot-app-shell{background:transparent!important}\
      body.ynot-desktop-home-video-active .lv4-shell{position:relative!important;isolation:isolate!important;background:transparent!important}\
      body.ynot-desktop-home-video-active .lv4-world,\
      body.ynot-desktop-home-video-active .lv4-stage{background:transparent!important}\
      body.ynot-desktop-home-video-active .lv4-scene{display:none!important;opacity:0!important;visibility:hidden!important}\
      body.ynot-desktop-home-video-active #ynot-desktop-home-video{z-index:-1!important}\
      @media(max-width:899px){\
        #ynot-desktop-home-video{width:100vw;height:100dvh;min-height:100vh}\
        #ynot-desktop-home-video video{width:100vw;height:100dvh;min-height:100vh;object-position:center center}\
        body.ynot-desktop-home-video-active .lv4-shell{min-height:100dvh!important}\
      }\
      @media(prefers-reduced-motion:reduce){#ynot-desktop-home-video{transition:none}}';
    document.head.appendChild(style);
  }

  function homeShell(){return document.querySelector('.lv4-shell.depth-worlds')}

  function mountIntoShell(){
    if(!root)return false;
    var shell=homeShell();
    if(shell){
      if(root.parentNode!==shell)shell.insertBefore(root,shell.firstChild);
      return true;
    }
    if(!root.isConnected&&document.body)document.body.insertBefore(root,document.body.firstChild);
    return false;
  }

  function clearRetries(){retryTimers.forEach(function(id){clearTimeout(id)});retryTimers=[]}
  function clearSourceRetry(){if(sourceRetryTimer){clearTimeout(sourceRetryTimer);sourceRetryTimer=0}}

  function configureVideo(){
    if(!video)return;
    video.muted=true;
    video.defaultMuted=true;
    video.loop=true;
    video.autoplay=true;
    video.playsInline=true;
    video.preload='auto';
    video.controls=false;
    video.setAttribute('muted','');
    video.setAttribute('loop','');
    video.setAttribute('autoplay','');
    video.setAttribute('playsinline','');
    video.setAttribute('webkit-playsinline','');
    video.setAttribute('disablepictureinpicture','');
  }

  function build(){
    if(root){mountIntoShell();return root}
    if(!document.body)return null;
    addStyles();
    root=document.createElement('div');
    root.id='ynot-desktop-home-video';
    root.setAttribute('aria-hidden','true');
    video=document.createElement('video');
    configureVideo();
    video.poster='/ynot-microphone.jpg';
    root.appendChild(video);
    document.body.insertBefore(root,document.body.firstChild);
    mountIntoShell();
    ['loadedmetadata','loadeddata','canplay','playing'].forEach(function(name){
      video.addEventListener(name,function(){sourceFailures=0;ready=true;if(visible){root.classList.add('is-visible');if(video.paused)play()}});
    });
    video.addEventListener('error',function(){
      ready=false;
      if(root)root.classList.add('is-visible');
      if(!visible||sourceFailures>=2)return;
      sourceFailures+=1;
      clearSourceRetry();
      sourceRetryTimer=setTimeout(function(){sourceRetryTimer=0;reloadSource()},250*sourceFailures);
    });
    return root;
  }

  function ensureSource(){
    if(!video||video.getAttribute('src'))return;
    video.src=VIDEO_URL;
    try{video.load()}catch(e){}
  }

  function reloadSource(){
    if(!video||!visible)return;
    try{video.pause()}catch(e){}
    try{video.removeAttribute('src');video.load()}catch(e){}
    setTimeout(function(){if(!visible||!video)return;ensureSource();play()},60);
  }

  function play(){
    if(!video||!visible)return;
    ensureSource();
    configureVideo();
    try{var p=video.play();if(p&&typeof p.catch==='function')p.catch(function(){})}catch(e){}
  }

  function schedulePlayRetries(){
    clearRetries();
    [0,100,240,500,900,1500,2400].forEach(function(delay){
      retryTimers.push(setTimeout(function(){if(visible&&video&&video.paused)play()},delay));
    });
  }

  function homepageMounted(){return Boolean(document.querySelector('.ynot-app-shell')&&homeShell())}

  function setVisible(next){
    visible=Boolean(next)&&location.pathname==='/'&&homepageMounted();
    if(!build())return;
    mountIntoShell();
    document.body.classList.toggle('ynot-desktop-home-video-active',visible);
    root.classList.toggle('is-visible',visible&&(ready||Boolean(video&&video.poster)));
    if(visible){started=true;root.classList.add('is-visible');play();schedulePlayRetries()}
    else{clearRetries();clearSourceRetry();if(video){try{video.pause()}catch(e){}}}
  }

  function hide(){setVisible(false)}
  function restore(){started=false;setVisible(homepageMounted())}

  function syncHomepage(){
    if(location.pathname!=='/'||!homepageMounted()){hide();return}
    mountIntoShell();
    if(!started)setVisible(true);
  }

  function onDocumentPointer(event){
    var target=event.target instanceof Element?event.target:null;
    if(!target)return;
    if(target.closest('.lv4-category-bubble,.lv4-search button,.ynot-bottom-search button,.ynot-top-mode button,.ynot-world-controls button,.ynot-reference-right button,.ynot-peek'))hide();
  }

  function resumeFromGesture(){
    if(!visible||!video||!video.paused)return;
    play();
    schedulePlayRetries();
  }

  function boot(){
    build();
    syncHomepage();
    observer=new MutationObserver(function(){syncHomepage()});
    observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
    document.addEventListener('pointerdown',onDocumentPointer,true);
    document.addEventListener('submit',hide,true);
    document.addEventListener('touchstart',resumeFromGesture,{passive:true});
    document.addEventListener('touchend',resumeFromGesture,{passive:true});
    document.addEventListener('pointerup',resumeFromGesture,{passive:true});
    window.addEventListener('ynot:world-active',hide);
    window.addEventListener('shop:tag-search',hide);
    window.addEventListener('discover:search',hide);
    window.addEventListener('ynot:open-deals',hide);
    window.addEventListener('ynot:open-saves',hide);
    window.addEventListener('ynot:open-circle',hide);
    window.addEventListener('ynot:open-auth',hide);
    window.addEventListener('ynot:open-partner',hide);
    window.addEventListener('ynot:world-reset',function(){setTimeout(restore,80)});
    document.addEventListener('visibilitychange',function(){if(!document.hidden&&visible){play();schedulePlayRetries()}});
    window.addEventListener('pageshow',function(){if(location.pathname==='/')setTimeout(restore,80)});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
