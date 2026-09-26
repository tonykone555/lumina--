(()=>{
  const CLOTHING=/\b(dress|shirt|t[- ]?shirt|tee|top|blouse|hoodie|sweater|cardigan|jacket|coat|blazer|jeans|denim|trouser|pants|shorts|skirt|legging|activewear|sports bra|swimwear|bikini|swimsuit|lingerie|bodysuit|jumpsuit|romper|gown|suit|vest|clothing|apparel|fashion)\b/i;
  let queued=false;
  function safeUrl(src){return `url("${String(src||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"')}")`}
  function fitImage(img){
    const apply=()=>{
      const nw=img.naturalWidth||0,nh=img.naturalHeight||0;
      if(!nw||!nh)return;
      const vv=window.visualViewport;
      const vw=vv?.width||window.innerWidth;
      const vh=vv?.height||window.innerHeight;
      const mobile=vw<=760;
      const maxW=mobile?vw:Math.min(vw*.94,900);
      const maxH=vh*(mobile?.66:.72);
      const scale=Math.min(maxW/nw,maxH/nh);
      img.style.setProperty('--ynot-deal-fit-w',`${Math.max(1,nw*scale)}px`);
      img.style.setProperty('--ynot-deal-fit-h',`${Math.max(1,nh*scale)}px`);
      const ratio=nw/nh;
      img.classList.toggle('ynot-deal-square-image',ratio>=.9&&ratio<=1.1);
    };
    if(img.complete&&img.naturalWidth)apply();
    else img.addEventListener('load',()=>{apply();queue()},{once:true});
  }
  function decorateSelected(selected){
    const img=selected.querySelector(':scope > img');
    if(img&&img.src){
      selected.style.setProperty('--ynot-deal-popup-image',safeUrl(img.src));
      fitImage(img);
    }
    const title=(selected.querySelector('.ynot-selected-copy h3')?.textContent||'').trim();
    const isClothing=CLOTHING.test(title);
    let tryButton=selected.querySelector('.ynot-deal-try-button');
    if(isClothing&&!tryButton){
      tryButton=document.createElement('button');
      tryButton.type='button';
      tryButton.className='ynot-deal-try-button';
      tryButton.setAttribute('aria-label','Try this item on');
      tryButton.innerHTML='<span aria-hidden="true">✦</span><b>Try on</b>';
      tryButton.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent('ynot:open-try-pricing',{detail:{compact:true,source:'ynot-deal',title}}));
      });
      selected.appendChild(tryButton);
    }else if(!isClothing&&tryButton){
      tryButton.remove();
    }
  }
  function restoreHiddenZoomControls(){
    document.querySelectorAll('[data-ynot-hidden-for-product="1"]').forEach(node=>{
      if(!(node instanceof HTMLElement))return;
      node.style.removeProperty('display');
      node.style.removeProperty('visibility');
      node.style.removeProperty('opacity');
      node.removeAttribute('data-ynot-hidden-for-product');
    });
  }
  function syncWorldZoomControls(selected){
    restoreHiddenZoomControls();
    if(!selected)return;
    const vw=window.visualViewport?.width||window.innerWidth;
    document.querySelectorAll('button').forEach(button=>{
      if(!(button instanceof HTMLElement)||selected.contains(button))return;
      const text=(button.textContent||'').trim();
      const aria=(button.getAttribute('aria-label')||'').trim().toLowerCase();
      const title=(button.getAttribute('title')||'').trim().toLowerCase();
      const cls=String(button.className||'').toLowerCase();
      const exactGlyph=text==='+'||text==='−'||text==='–'||text==='—'||text==='-';
      const namedZoom=/zoom|magnif|scale/.test(`${aria} ${title} ${cls}`);
      if(!exactGlyph&&!namedZoom)return;
      const rect=button.getBoundingClientRect();
      const rightSide=rect.left>=vw*.62;
      const verticalControl=rect.width<=90&&rect.height<=90;
      if(!namedZoom&&!(rightSide&&verticalControl))return;
      button.dataset.ynotHiddenForProduct='1';
      button.style.setProperty('display','none','important');
      button.style.setProperty('visibility','hidden','important');
      button.style.setProperty('opacity','0','important');
    });
  }
  function sync(){
    queued=false;
    const open=Boolean(document.querySelector('.ynot-drawer.open'));
    document.documentElement.classList.toggle('ynot-deal-open',open);
    const selected=document.querySelector('.ynot-drawer.open .ynot-selected');
    document.documentElement.classList.toggle('ynot-deal-product-open',Boolean(selected));
    syncWorldZoomControls(selected);
    if(selected)decorateSelected(selected);
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(sync)}
  const observer=new MutationObserver(queue);
  const start=()=>{
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','src']});
    window.addEventListener('resize',queue,{passive:true});
    window.visualViewport?.addEventListener('resize',queue,{passive:true});
    sync();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
