(()=>{
  const badgeSvg='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.25l2.05 1.36 2.44-.35.96 2.28 2.26.98-.34 2.43L20.75 11l-1.38 2.05.34 2.43-2.26.98-.96 2.28-2.44-.35L12 19.75l-2.05-1.36-2.44.35-.96-2.28-2.26-.98.34-2.43L3.25 11l1.38-2.05-.34-2.43 2.26-.98.96-2.28 2.44.35L12 2.25z" fill="currentColor"/><path d="M8.35 11.85l2.15 2.15 5.15-5.15" fill="none" stroke="var(--ynot-badge-check,#171512)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function fix(detail){
    if(!(detail instanceof HTMLElement))return;
    const copy=detail.querySelector('.lv4-detailcopy');
    if(!copy)return;

    const price=copy.querySelector(':scope > strong');
    const flex=copy.querySelector('.ynot-flexpay');
    if(price&&flex){
      if(price.nextElementSibling!==flex)price.insertAdjacentElement('afterend',flex);
      const tick=flex.querySelector('.ynot-flexpay-check');
      if(tick&&tick.dataset.badgeReady!=='1'){
        tick.innerHTML=badgeSvg;
        tick.dataset.badgeReady='1';
      }
    }

    const dot=detail.querySelector('.lv4-merchant-dot-bottom');
    if(dot){
      const description=[...copy.querySelectorAll('button')].find(btn=>/^description\+?$/i.test((btn.textContent||'').trim()));
      if(description){
        if(description.nextElementSibling!==dot)description.insertAdjacentElement('afterend',dot);
      }else if(copy.lastElementChild!==dot){
        copy.appendChild(dot);
      }
    }
  }

  function sync(){document.querySelectorAll('.lv4-detail').forEach(fix)}
  let frame=0;
  const queue=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;sync()})};
  const start=()=>{sync();new MutationObserver(queue).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
