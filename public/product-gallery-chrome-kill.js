(()=>{
  const ROOT='.lv4-detail';
  const isThumb=(el)=>!!el.closest('.ynot-loaded-gallery,.lv4-gallery')||el.classList?.contains('ynot-complete-thumb');
  function clean(root){
    if(!(root instanceof Element))return;
    root.querySelectorAll('button,[role="button"]').forEach(el=>{
      if(isThumb(el)||el.classList.contains('lv4-close'))return;
      const label=(el.getAttribute('aria-label')||'').toLowerCase();
      const cls=String(el.className||'').toLowerCase();
      const text=(el.textContent||'').trim();
      const navLabel=/\b(previous|next|prev)\b/.test(label)&&/(image|photo|media|slide|gallery|product)/.test(label);
      const navClass=/(gallery|slider|carousel|swiper|media|image).*(prev|next)|(prev|next).*(gallery|slider|carousel|swiper|media|image)/.test(cls);
      const arrowOnly=/^[‹›«»←→]$/.test(text);
      if(navLabel||navClass||arrowOnly){el.remove();}
    });
    root.querySelectorAll('*').forEach(el=>{
      if(isThumb(el))return;
      const cls=String(el.className||'').toLowerCase();
      const text=(el.textContent||'').trim();
      const counterClass=/(gallery|slider|carousel|media|image|slide).*(count|counter|pagination|indicator)|(count|counter|pagination|indicator).*(gallery|slider|carousel|media|image|slide)/.test(cls);
      const countOnly=/^\d+\s*\/\s*\d+$/.test(text);
      if(counterClass||countOnly){
        if(el.children.length===0||countOnly)el.remove();
      }
    });
  }
  function scan(){document.querySelectorAll(ROOT).forEach(clean)}
  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan()})};
  const start=()=>{scan();new MutationObserver(queue).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-label']})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
