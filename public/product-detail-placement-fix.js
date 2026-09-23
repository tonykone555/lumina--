(()=>{
  const badgeSvg='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 1.9l2.02 1.45 2.45-.42.92 2.31 2.31.92-.42 2.45L20.73 12l-1.45 2.02.42 2.45-2.31.92-.92 2.31-2.45-.42L12 20.73l-2.02-1.45-2.45.42-.92-2.31-2.31-.92.42-2.45L3.27 12l1.45-2.02-.42-2.45 2.31-.92.92-2.31 2.45.42L12 1.9z" fill="currentColor"/><path d="M8.25 12.05l2.35 2.3 5.2-5.2" fill="none" stroke="var(--ynot-badge-check,#171512)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const isVideo=url=>/\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(String(url||''))||/[?&](?:format|fm)=(?:mp4|webm)/i.test(String(url||''));

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

  function lockFlexUnderPrice(copy,flex,price){
    if(price.nextElementSibling!==flex)price.insertAdjacentElement('afterend',flex);
    flex.style.setProperty('display','flex','important');
    flex.style.setProperty('position','static','important');
    flex.style.setProperty('order','0','important');
    flex.style.setProperty('float','none','important');
    flex.style.setProperty('clear','both','important');
    flex.style.setProperty('width','max-content','important');
    flex.style.setProperty('max-width','100%','important');
    flex.style.setProperty('margin','5px 0 9px','important');
    flex.style.setProperty('padding','0','important');
    flex.style.setProperty('background','transparent','important');
    flex.style.setProperty('border','0','important');
    flex.style.setProperty('box-shadow','none','important');
    flex.style.setProperty('transform','none','important');
    flex.style.setProperty('opacity','1','important');
    flex.style.setProperty('visibility','visible','important');
    flex.style.setProperty('align-items','center','important');
    flex.style.setProperty('flex-direction','row','important');
    flex.style.setProperty('gap','6px','important');
  }

  function setDesktopMain(detail,url,index,gallery){
    if(!url)return;
    const main=detail.querySelector(':scope > img');
    if(!main)return;
    const existingVideo=detail.querySelector(':scope > .ynot-main-product-video');
    if(isVideo(url)){
      let video=existingVideo;
      if(!video){video=document.createElement('video');video.className='ynot-main-product-video';video.controls=true;video.playsInline=true;main.insertAdjacentElement('afterend',video)}
      if(video.src!==url)video.src=url;
      video.style.display='block';main.style.visibility='hidden';
      video.play().catch(()=>{});
    }else{
      if(existingVideo){existingVideo.pause();existingVideo.style.display='none'}
      main.style.visibility='visible';main.src=url;
    }
    gallery.dataset.activeMediaIndex=String(index);
    gallery.querySelectorAll('.ynot-complete-thumb').forEach(node=>node.classList.toggle('active',Number(node.dataset.mediaIndex)===index));
  }

  function makeThumb(detail,gallery,url,index){
    const button=document.createElement('button');
    button.type='button';button.className='ynot-complete-thumb';button.dataset.mediaIndex=String(index);button.setAttribute('aria-label',`Show product media ${index+1}`);
    if(isVideo(url)){
      const video=document.createElement('video');video.src=url;video.muted=true;video.playsInline=true;video.preload='metadata';button.appendChild(video);
    }else{
      const img=document.createElement('img');img.src=url;img.alt='';img.draggable=false;button.appendChild(img);
    }
    button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();setDesktopMain(detail,url,index,gallery)});
    return button;
  }

  function fixDesktopThumbnailRail(detail){
    if(window.innerWidth<900||!(detail instanceof HTMLElement))return;
    const gallery=detail.querySelector('.ynot-loaded-gallery');
    if(!gallery)return;
    const media=[...new Set(String(gallery.dataset.mediaSignature||'').split('|').map(x=>x.trim()).filter(Boolean))];
    if(!media.length)return;
    const signature=media.join('|');
    if(gallery.dataset.ynotDesktopRail===signature)return;
    gallery.dataset.ynotDesktopRail=signature;
    gallery.replaceChildren();
    media.forEach((url,index)=>gallery.appendChild(makeThumb(detail,gallery,url,index)));
    const main=detail.querySelector(':scope > img');
    const current=main&&(main.currentSrc||main.src);const active=Math.max(0,media.findIndex(url=>url===current));
    gallery.dataset.activeMediaIndex=String(active);
    gallery.querySelectorAll('.ynot-complete-thumb').forEach(node=>node.classList.toggle('active',Number(node.dataset.mediaIndex)===active));
  }

  function fixDrawer(selected){
    if(!(selected instanceof HTMLElement))return;
    const copy=selected.querySelector('.ynot-selected-copy');
    if(!copy)return;
    const price=copy.querySelector(':scope > strong');
    if(price){
      let flex=existingFlexible(selected);
      if(!flex){
        flex=document.createElement('div');
        flex.className='ynot-flexpay';
        flex.setAttribute('aria-label','Flexible payment available');
        flex.innerHTML='<span class="ynot-flexpay-check" aria-hidden="true"></span><b>Flexible payment</b>';
      }else if(!flex.classList.contains('ynot-flexpay'))flex.classList.add('ynot-flexpay');
      prepareBadge(flex);
      lockFlexUnderPrice(copy,flex,price);
    }

    const origin=selected.querySelector(':scope > .ynot-origin-dot, .ynot-origin-dot-footer');
    if(origin){
      origin.classList.add('ynot-origin-dot-footer');
      origin.textContent='•';
      origin.setAttribute('title','Merchant product page');
      origin.style.setProperty('position','static','important');
      origin.style.setProperty('display','flex','important');
      origin.style.setProperty('width','18px','important');
      origin.style.setProperty('height','18px','important');
      origin.style.setProperty('margin','10px auto 8px','important');
      origin.style.setProperty('padding','0','important');
      origin.style.setProperty('border','0','important');
      origin.style.setProperty('background','transparent','important');
      origin.style.setProperty('color','#fff','important');
      origin.style.setProperty('opacity','1','important');
      origin.style.setProperty('font-size','19px','important');
      origin.style.setProperty('line-height','1','important');
      origin.style.setProperty('align-items','center','important');
      origin.style.setProperty('justify-content','center','important');
      origin.style.setProperty('transform','none','important');
      if(selected.lastElementChild!==origin)selected.appendChild(origin);
    }
  }

  function fixWorld(detail){
    if(!(detail instanceof HTMLElement))return;
    const copy=detail.querySelector('.lv4-detailcopy');if(!copy)return;
    const price=copy.querySelector(':scope > strong'),flex=copy.querySelector('.ynot-flexpay');
    if(price&&flex){prepareBadge(flex);lockFlexUnderPrice(copy,flex,price)}
    const dot=detail.querySelector('.lv4-merchant-dot-bottom');
    if(dot){
      const description=[...copy.querySelectorAll('button')].find(btn=>/^description\+?$/i.test((btn.textContent||'').trim()));
      if(description){if(description.nextElementSibling!==dot)description.insertAdjacentElement('afterend',dot)}else if(detail.lastElementChild!==dot)detail.appendChild(dot)
    }
    fixDesktopThumbnailRail(detail);
  }

  function sync(){document.querySelectorAll('.ynot-selected').forEach(fixDrawer);document.querySelectorAll('.lv4-detail').forEach(fixWorld)}
  let frame=0;const queue=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;sync()})};
  const start=()=>{sync();new MutationObserver(queue).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','data-media-signature']});window.addEventListener('resize',queue,{passive:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
