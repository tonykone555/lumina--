(()=>{
  const CLOTHING=/\b(dress|shirt|t[- ]?shirt|tee|top|blouse|hoodie|sweater|cardigan|jacket|coat|blazer|jeans|denim|trouser|pants|shorts|skirt|legging|activewear|sports bra|swimwear|bikini|swimsuit|lingerie|bodysuit|jumpsuit|romper|gown|suit|vest|clothing|apparel|fashion)\b/i;
  let queued=false;
  function safeUrl(src){return `url("${String(src||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"')}")`}
  function decorateSelected(selected){
    const img=selected.querySelector(':scope > img');
    if(img&&img.src)selected.style.setProperty('--ynot-deal-popup-image',safeUrl(img.src));
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
  function sync(){
    queued=false;
    const open=Boolean(document.querySelector('.ynot-drawer.open'));
    document.documentElement.classList.toggle('ynot-deal-open',open);
    const selected=document.querySelector('.ynot-drawer.open .ynot-selected');
    document.documentElement.classList.toggle('ynot-deal-product-open',Boolean(selected));
    if(selected)decorateSelected(selected);
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(sync)}
  const observer=new MutationObserver(queue);
  const start=()=>{observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','src']});sync()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
