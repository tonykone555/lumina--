(()=>{
  const ROOT='.lv4-detail';
  const unique=value=>[...new Set(String(value||'').split('|').map(x=>x.trim()).filter(Boolean))];
  const isThumb=el=>!!el.closest('.ynot-loaded-gallery,.lv4-gallery')||el.classList?.contains('ynot-complete-thumb');

  function selectMedia(root,gallery,media,index){
    const main=root.querySelector(':scope > img,.lv4-detail-media img,.lv4-detail-media');
    if(!main||!media[index])return;
    if(main.tagName==='IMG')main.src=media[index];
    else if(main.querySelector?.('img'))main.querySelector('img').src=media[index];
    gallery.dataset.activeMediaIndex=String(index);
    gallery.querySelectorAll('.ynot-complete-thumb').forEach((node,i)=>node.classList.toggle('active',i===index));
  }

  function renderGallery(root){
    const loaded=root.querySelector('.ynot-loaded-gallery');
    const native=root.querySelector('.lv4-gallery');
    let media=loaded?unique(loaded.dataset.mediaSignature):[];
    if(native){
      const nativeMedia=[...native.querySelectorAll('img')].map(img=>img.currentSrc||img.src).filter(Boolean);
      media=[...new Set([...media,...nativeMedia])];
    }
    const main=root.querySelector(':scope > img,.lv4-detail-media img');
    const mainSrc=main?.currentSrc||main?.src||'';
    if(mainSrc)media=[...new Set([mainSrc,...media])];
    if(media.length<2){if(loaded)loaded.style.display='none';return;}
    let gallery=loaded;
    if(!gallery){gallery=document.createElement('div');gallery.className='ynot-loaded-gallery';const anchor=root.querySelector('.lv4-detailcopy');anchor?root.insertBefore(gallery,anchor):root.appendChild(gallery)}
    const signature=media.join('|');
    if(gallery.dataset.ynotMobileSignature===signature)return;
    gallery.dataset.ynotMobileSignature=signature;gallery.dataset.mediaSignature=signature;gallery.replaceChildren();
    media.slice(0,4).forEach((src,index)=>{
      const button=document.createElement('button');button.type='button';button.className='ynot-complete-thumb'+(index===0?' active':'');button.setAttribute('aria-label',`Show product image ${index+1}`);
      const image=document.createElement('img');image.src=src;image.alt='';image.draggable=false;button.appendChild(image);
      button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();selectMedia(root,gallery,media,index)});gallery.appendChild(button);
    });
    gallery.style.setProperty('display','flex','important');gallery.style.setProperty('visibility','visible','important');gallery.style.setProperty('opacity','1','important');
    if(native){native.style.setProperty('display','none','important');native.classList.add('ynot-native-hidden')}
  }

  function fixHeart(root){
    const heart=root.querySelector('.lv4-save-action');const actions=root.querySelector('.lv4-actions');if(!heart||!actions)return;
    if(heart.parentElement!==actions)actions.appendChild(heart);
    heart.style.setProperty('position','relative','important');heart.style.setProperty('top','auto','important');heart.style.setProperty('right','auto','important');heart.style.setProperty('left','auto','important');heart.style.setProperty('bottom','auto','important');heart.style.setProperty('transform','none','important');heart.style.setProperty('z-index','auto','important');
  }

  function fixSimilarControl(root){
    const similar=root.querySelector('.lv4-similar-pill');
    root.querySelectorAll('.ynot-options-toggle').forEach(button=>{
      button.classList.add('ynot-similar-replacement');button.innerHTML='<span>Similar picks</span><b aria-hidden="true">›</b>';
      if(button.dataset.ynotSimilarBound==='1')return;button.dataset.ynotSimilarBound='1';
      button.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();similar?.click();root.querySelector('.lv4-similar-block')?.scrollIntoView({behavior:'smooth',block:'nearest'})},true);
    });
  }

  function clean(root){
    if(!(root instanceof Element))return;
    renderGallery(root);fixHeart(root);fixSimilarControl(root);
    root.querySelectorAll('button,[role="button"]').forEach(el=>{
      if(isThumb(el)||el.classList.contains('lv4-close')||el.classList.contains('lv4-save-action'))return;
      const label=(el.getAttribute('aria-label')||'').toLowerCase(),cls=String(el.className||'').toLowerCase(),text=(el.textContent||'').trim();
      const navLabel=/\b(previous|next|prev)\b/.test(label)&&/(image|photo|media|slide|gallery|product)/.test(label);
      const navClass=/(gallery|slider|carousel|swiper|media|image).*(prev|next)|(prev|next).*(gallery|slider|carousel|swiper|media|image)/.test(cls);
      if(navLabel||navClass||/^[‹›«»←→]$/.test(text))el.remove();
    });
    root.querySelectorAll('*').forEach(el=>{if(isThumb(el))return;const cls=String(el.className||'').toLowerCase(),text=(el.textContent||'').trim();const counter=/(gallery|slider|carousel|media|image|slide).*(count|counter|pagination|indicator)|(count|counter|pagination|indicator).*(gallery|slider|carousel|media|image|slide)/.test(cls);if((counter||/^\d+\s*\/\s*\d+$/.test(text))&&(el.children.length===0||/^\d+\s*\/\s*\d+$/.test(text)))el.remove()});
  }
  function scan(){document.querySelectorAll(ROOT).forEach(clean)}
  let queued=false;const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan()})};
  const start=()=>{scan();new MutationObserver(queue).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-label','data-media-signature']})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();