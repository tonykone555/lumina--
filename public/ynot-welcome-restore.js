(()=>{
  let fired=false,timer=0,checks=0;
  const MAX_WAIT_CHECKS=12;

  function hasRegion(){
    try{
      const raw=localStorage.getItem('ynot-region');
      if(raw&&raw!=='null'&&raw!=='undefined'&&raw!=='{}')return true;
    }catch{}
    const root=document.documentElement;
    return Boolean(root&&(root.dataset.ynotCountry||root.dataset.ynotCurrency));
  }

  function regionPickerOpen(){
    return Boolean(document.querySelector('.ynot-region-backdrop,.ynot-region-card,.country-picker,.region-picker,.country-popup,.region-popup'));
  }

  function appReady(){
    return document.readyState!=='loading'&&Boolean(document.getElementById('ynot-welcome-host'))&&Boolean(document.querySelector('.ynot-app-shell'));
  }

  function fire(){
    if(fired)return;
    fired=true;
    if(timer){clearTimeout(timer);timer=0}
    window.dispatchEvent(new Event('ynot:show-welcome-video'));
  }

  function schedule(delay=120){
    if(fired||timer)return;
    timer=setTimeout(()=>{timer=0;tick()},delay);
  }

  function tick(){
    if(fired)return;
    if(!appReady()){schedule(100);return}
    if(hasRegion()){scheduleFire(260);return}
    if(regionPickerOpen()){checks=0;schedule(160);return}
    if(checks++>=MAX_WAIT_CHECKS){fire();return}
    schedule(160);
  }

  function scheduleFire(delay){
    if(fired||timer)return;
    timer=setTimeout(()=>{timer=0;fire()},delay);
  }

  window.addEventListener('ynot:region-changed',()=>scheduleFire(260));
  window.addEventListener('ynot:currency-change',()=>{if(hasRegion())scheduleFire(320)});
  window.addEventListener('pageshow',()=>schedule(120));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(120),{once:true});
  else schedule(120);
})();
