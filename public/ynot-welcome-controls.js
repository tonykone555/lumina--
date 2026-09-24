(()=>{
  let lastActionAt=0;
  const modal=()=>document.getElementById('ynot-welcome-video');
  const video=()=>modal()?.querySelector('.ynot-welcome__video');
  const closeWelcome=()=>{
    const root=modal();
    if(!root)return;
    const media=video();
    try{media?.pause()}catch{}
    root.classList.remove('is-open','is-loading');
    root.setAttribute('aria-hidden','true');
    document.body.classList.remove('ynot-welcome-lock');
  };
  const toggleSound=()=>{
    const media=video();
    const root=modal();
    if(!media||!root)return;
    const button=root.querySelector('.ynot-welcome__sound');
    const turnOn=media.muted;
    media.muted=!turnOn;
    media.defaultMuted=!turnOn;
    media.volume=1;
    if(turnOn)media.removeAttribute('muted'); else media.setAttribute('muted','');
    if(turnOn){try{media.currentTime=0}catch{}}
    try{const play=media.play();play?.catch?.(()=>{})}catch{}
    if(button){
      button.classList.toggle('is-on',turnOn);
      button.classList.toggle('is-attention',!turnOn);
      button.setAttribute('aria-pressed',turnOn?'true':'false');
      button.setAttribute('aria-label',turnOn?'Mute welcome video':'Restart video with sound');
      const label=button.querySelector('span');
      if(label)label.textContent=turnOn?'Sound on':'Tap for sound';
    }
  };
  function actionFor(target){
    if(!(target instanceof Element))return '';
    if(target.closest('.ynot-welcome__close,[data-ynot-welcome-explicit-close]'))return 'close';
    if(target.closest('.ynot-welcome__sound'))return 'sound';
    return '';
  }
  function handle(event){
    const root=modal();
    if(!root||!root.classList.contains('is-open'))return;
    const action=actionFor(event.target);
    if(!action)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const now=Date.now();
    if(now-lastActionAt<280)return;
    lastActionAt=now;
    if(action==='close')closeWelcome();
    else toggleSound();
  }
  // Capture before legacy/global handlers. Pointerup covers modern mobile Safari;
  // click is the keyboard/desktop fallback.
  document.addEventListener('pointerup',handle,true);
  document.addEventListener('click',handle,true);
})();
