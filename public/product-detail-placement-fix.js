(()=>{
  const badgeSvg='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 1.9l2.02 1.45 2.45-.42.92 2.31 2.31.92-.42 2.45L20.73 12l-1.45 2.02.42 2.45-2.31.92-.92 2.31-2.45-.42L12 20.73l-2.02-1.45-2.45.42-.92-2.31-2.31-.92.42-2.45L3.27 12l1.45-2.02-.42-2.45 2.31-.92.92-2.31 2.45.42L12 1.9z" fill="currentColor"/><path d="M8.25 12.05l2.35 2.3 5.2-5.2" fill="none" stroke="var(--ynot-badge-check,#171512)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function prepareBadge(flex){
    let tick=flex.querySelector('.ynot-flexpay-check');
    if(!tick){tick=document.createElement('span');tick.className='ynot-flexpay-check';flex.prepend(tick)}
    if(tick.dataset.badgeReady!=='1'){tick.innerHTML=badgeSvg;tick.dataset.badgeReady='1'}
  }

  function existingFlexible(root){
    const direct=root.querySelector('.ynot-flexpay');
    if(direct)return direct;
    return [...root.querySelectorAll('div,span,p')].find(node=>(node.textContent||'').trim().toLowerCase()==='flexible payment')||null;
  }

  function fixDrawer(selected){
    if(!(selected instanceof HTMLElement))return;
    const copy=selected.querySelector('.ynot-selected-copy');
    if(!copy)return;
    const price=copy.querySelector(':scope > strong');
    if(price){
      let flex=existingFlexible(selected);
      if(!flex){
        flex=document.createElement('div');flex.className='ynot-flexpay';flex.setAttribute('aria-label','Flexible payment available');flex.innerHTML='<span class="ynot-flexpay-check" aria-hidden="true"></span><b>Flexible payment</b>';
      }else if(!flex.classList.contains('ynot-flexpay'))flex.classList.add('ynot-flexpay');
      prepareBadge(flex);
      if(price.nextElementSibling!==flex)price.insertAdjacentElement('afterend',flex);
    }

    const origin=selected.querySelector(':scope > .ynot-origin-dot');
    const description=selected.querySelector('.ynot-description-toggle');
    if(origin){
      origin.classList.add('ynot-origin-dot-footer');
      origin.textContent='•';
      origin.setAttribute('title','Merchant product page');
      if(description){
        if(description.nextElementSibling!==origin)description.insertAdjacentElement('afterend',origin);
      }else if(copy.lastElementChild!==origin){
        copy.appendChild(origin);
      }
    }
  }

  function fixWorld(detail){
    if(!(detail instanceof HTMLElement))return;
    const copy=detail.querySelector('.lv4-detailcopy');if(!copy)return;
    const price=copy.querySelector(':scope > strong'),flex=copy.querySelector('.ynot-flexpay');
    if(price&&flex){if(price.nextElementSibling!==flex)price.insertAdjacentElement('afterend',flex);prepareBadge(flex)}
    const dot=detail.querySelector('.lv4-merchant-dot-bottom');
    if(dot){const description=[...copy.querySelectorAll('button')].find(btn=>/^description\+?$/i.test((btn.textContent||'').trim()));if(description){if(description.nextElementSibling!==dot)description.insertAdjacentElement('afterend',dot)}else if(copy.lastElementChild!==dot)copy.appendChild(dot)}
  }

  function sync(){document.querySelectorAll('.ynot-drawer.open .ynot-selected').forEach(fixDrawer);document.querySelectorAll('.lv4-detail').forEach(fixWorld)}
  let frame=0;const queue=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;sync()})};
  const start=()=>{sync();new MutationObserver(queue).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
