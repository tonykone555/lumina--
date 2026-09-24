(function(){
  var VIDEO_URL='https://iycxkwoxbkanfyraohge.supabase.co/storage/v1/object/public/ad-creatives/ScreenRecording_09-24-2026%2014.mov.mp4';
  var root=null,video=null,observer=null,visible=false,started=false;
  var desktop=window.matchMedia('(min-width:900px)');

  function addStyles(){
    if(document.getElementById('ynot-desktop-home-video-style'))return;
    var style=document.createElement('style');
    style.id='ynot-desktop-home-video-style';
    style.textContent='\
      #ynot-desktop-home-video{position:fixed;inset:0;z-index:2;overflow:hidden;pointer-events:none;opacity:0;visibility:hidden;background:#000;transition:opacity .38s ease,visibility .38s ease}\
      #ynot-desktop-home-video.is-visible{opacity:1;visibility:visible}\
      #ynot-desktop-home-video video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center center;display:block;filter:brightness(.72) saturate(.92)}\
      #ynot-desktop-home-video:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.20),rgba(0,0,0,.08) 42%,rgba(0,0,0,.24));pointer-events:none}\
      @media(max-width:899px){#ynot-desktop-home-video{display:none!important}}\
      @media(prefers-reduced-motion:reduce){#ynot-desktop-home-video{display:none!important}}';
    document.head.appendChild(style);
  }

  function build(){
    if(root)return root;
    if(!document.body)return null;
    addStyles();
    root=document.createElement('div');
    root.id='ynot-desktop-home-video';
    root.setAttribute('aria-hidden','true');
    video=document.createElement('video');
    video.muted=true;
    video.defaultMuted=true;
    video.loop=true;
    video.autoplay=true;
    video.playsInline=true;
    video.preload='metadata';
    video.setAttribute('muted','');
    video.setAttribute('loop','');
    video.setAttribute('autoplay','');
    video.setAttribute('playsinline','');
    video.setAttribute('webkit-playsinline','');
    root.appendChild(video);
    document.body.insertBefore(root,document.body.firstChild);
    return root;
  }

  function ensureSource(){
    if(!video||video.getAttribute('src'))return;
    video.src=VIDEO_URL;
    video.load();
  }

  function play(){
    if(!video)return;
    ensureSource();
    video.muted=true;
    try{
      var p=video.play();
      if(p&&typeof p.catch==='function')p.catch(function(){});
    }catch(e){}
  }

  function setVisible(next){
    visible=Boolean(next)&&desktop.matches&&location.pathname==='/';
    if(!build())return;
    root.classList.toggle('is-visible',visible);
    if(visible){started=true;play()}
    else if(video){try{video.pause()}catch(e){}}
  }

  function homeShellActive(){
    return Boolean(document.querySelector('.lv4-shell.depth-worlds'));
  }

  function hide(){setVisible(false)}
  function restore(){started=false;setVisible(homeShellActive())}

  function syncFromShell(){
    if(!desktop.matches||location.pathname!=='/'){hide();return}
    if(!homeShellActive()){hide();return}
    if(!started)setVisible(true);
  }

  function onDocumentPointer(event){
    var target=event.target instanceof Element?event.target:null;
    if(!target)return;
    if(target.closest('.lv4-category-bubble,.lv4-search button,.ynot-bottom-search button,.ynot-top-mode button,.ynot-world-controls button,.ynot-reference-right button,.ynot-peek'))hide();
  }

  function boot(){
    build();
    syncFromShell();
    observer=new MutationObserver(function(){syncFromShell()});
    observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
    document.addEventListener('pointerdown',onDocumentPointer,true);
    document.addEventListener('submit',hide,true);
    window.addEventListener('ynot:world-active',hide);
    window.addEventListener('shop:tag-search',hide);
    window.addEventListener('discover:search',hide);
    window.addEventListener('ynot:open-deals',hide);
    window.addEventListener('ynot:open-saves',hide);
    window.addEventListener('ynot:open-circle',hide);
    window.addEventListener('ynot:open-auth',hide);
    window.addEventListener('ynot:open-partner',hide);
    window.addEventListener('ynot:world-reset',restore);
    desktop.addEventListener('change',function(){if(desktop.matches&&!started)syncFromShell();else if(!desktop.matches)hide()});
    document.addEventListener('visibilitychange',function(){if(!document.hidden&&visible)play()});
    window.addEventListener('pageshow',function(){if(visible)play();else syncFromShell()});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
