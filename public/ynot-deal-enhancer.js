(()=>{
  let etsyOnly=false;
  const galleryCache=new Map();
  const nativeInputValue=(input,value)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;setter?.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))};
  const norm=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

  function setMarketplace(next){
    etsyOnly=next==='etsy';
    document.documentElement.classList.toggle('ynot-deal-etsy-only',etsyOnly);
    window.dispatchEvent(new CustomEvent('ynot:catalog-source',{detail:{source:etsyOnly?'etsy':'shopify'}}));
    const input=document.querySelector('.ynot-drawer .ynot-search input');
    if(!input)return;
    if(etsyOnly){
      const current=input.value.trim();
      nativeInputValue(input,current||'handmade gifts jewelry clothing home decor');
    }else if(input.value==='handmade gifts jewelry clothing home decor'){
      nativeInputValue(input,'');
    }
  }

  function decorateHeader(){
    const head=document.querySelector('.ynot-drawer .ynot-head');
    if(!head||head.querySelector('.ynot-marketplace-control'))return;
    const wrap=document.createElement('div');wrap.className='ynot-marketplace-control';
    const trigger=document.createElement('button');trigger.type='button';trigger.className='ynot-marketplace-trigger';trigger.textContent='Marketplace';
    const menu=document.createElement('div');menu.className='ynot-marketplace-menu';
    const all=document.createElement('button');all.type='button';all.textContent='All';all.className='active';
    const etsy=document.createElement('button');etsy.type='button';etsy.textContent='Etsy';
    trigger.addEventListener('click',e=>{e.stopPropagation();wrap.classList.toggle('open')});
    all.addEventListener('click',()=>{all.classList.add('active');etsy.classList.remove('active');setMarketplace('all');wrap.classList.remove('open')});
    etsy.addEventListener('click',()=>{etsy.classList.add('active');all.classList.remove('active');setMarketplace('etsy');wrap.classList.remove('open')});
    menu.append(all,etsy);wrap.append(trigger,menu);head.appendChild(wrap);
  }

  function decorateDescription(copy){
    const h3=copy.querySelector('h3');
    if(!h3||copy.querySelector('.ynot-description-toggle'))return;
    const source=copy.querySelector('p');
    const button=document.createElement('button');button.type='button';button.className='ynot-description-toggle';button.textContent='Description';
    const panel=document.createElement('div');panel.className='ynot-description-panel';panel.textContent=(source?.textContent||'Product details from the marketplace listing.').trim();
    button.addEventListener('click',()=>{const open=panel.classList.toggle('open');button.classList.toggle('active',open);button.setAttribute('aria-expanded',String(open))});
    button.setAttribute('aria-expanded','false');
    copy.insertBefore(button,h3);copy.insertBefore(panel,h3);
  }

  async function productImages(title,current){
    const cacheKey=`${etsyOnly?'etsy':'all'}:${norm(title)}`;
    if(galleryCache.has(cacheKey))return galleryCache.get(cacheKey);
    const promise=(async()=>{
      try{
        const params=new URLSearchParams({q:title,market:'lumina',source:'all',page:'0'});
        const response=await fetch(`/api/catalog?${params.toString()}`,{cache:'no-store'});
        const data=await response.json();
        const products=Array.isArray(data?.products)?data.products:[];
        const exact=products.find(p=>norm(p?.title)===norm(title))||products.find(p=>norm(p?.title).includes(norm(title))||norm(title).includes(norm(p?.title)))||products[0];
        const list=[current,exact?.image,...(exact?.images||[]),...(exact?.variants||[]).map(v=>v?.image)].filter(Boolean);
        return [...new Set(list)];
      }catch{return current?[current]:[]}
    })();
    galleryCache.set(cacheKey,promise);
    return promise;
  }

  function openViewer(images,start=0){
    document.querySelector('.ynot-deal-gallery-viewer')?.remove();
    if(!images.length)return;
    let index=Math.max(0,Math.min(start,images.length-1));
    const viewer=document.createElement('section');viewer.className='ynot-deal-gallery-viewer';
    const image=document.createElement('img');image.alt='Product view';
    const close=document.createElement('button');close.type='button';close.className='ynot-deal-gallery-close';close.textContent='×';close.setAttribute('aria-label','Close gallery');
    const prev=document.createElement('button');prev.type='button';prev.className='ynot-deal-gallery-prev';prev.textContent='‹';prev.setAttribute('aria-label','Previous image');
    const next=document.createElement('button');next.type='button';next.className='ynot-deal-gallery-next';next.textContent='›';next.setAttribute('aria-label','Next image');
    const count=document.createElement('span');count.className='ynot-deal-gallery-count';
    const render=()=>{image.src=images[index];count.textContent=`${index+1} / ${images.length}`};
    const move=delta=>{index=(index+delta+images.length)%images.length;render()};
    close.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();viewer.remove()});
    prev.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();move(-1)});
    next.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();move(1)});
    viewer.addEventListener('click',e=>e.stopPropagation());
    viewer.append(image,close,prev,next,count);document.body.appendChild(viewer);render();
  }

  async function decorateGallery(selected,title){
    const main=selected.querySelector(':scope > img');
    if(!main||!main.src)return;
    const signature=`${etsyOnly?'etsy':'all'}:${norm(title)}`;
    const old=selected.querySelector('.ynot-deal-thumb-gallery');
    if(old?.dataset.signature===signature)return;
    old?.remove();
    const images=await productImages(title,main.src);
    if(!document.body.contains(selected)||!images||images.length<2)return;
    const currentTitle=selected.querySelector('.ynot-selected-copy h3')?.textContent||'';
    if(norm(currentTitle)!==norm(title))return;
    const gallery=document.createElement('div');gallery.className='ynot-deal-thumb-gallery';gallery.dataset.signature=signature;
    const visible=Math.min(images.length,4);
    images.slice(0,visible).forEach((src,index)=>{
      const button=document.createElement('button');button.type='button';
      const img=document.createElement('img');img.src=src;img.alt=`${title} view ${index+1}`;button.appendChild(img);
      const more=images.length>4&&index===visible-1;
      if(more){
        button.classList.add('ynot-deal-thumb-more');button.dataset.more=`+${images.length-visible+1}`;
        button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openViewer(images,index)});
      }else{
        button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();main.src=src;gallery.querySelectorAll('button').forEach(node=>node.classList.toggle('active',node===button))});
      }
      if(src===main.src)button.classList.add('active');
      gallery.appendChild(button);
    });
    main.insertAdjacentElement('afterend',gallery);
  }

  function decorateProduct(){
    const selected=document.querySelector('.ynot-drawer.open .ynot-selected');
    const copy=selected?.querySelector('.ynot-selected-copy');
    if(!selected||!copy)return;
    const h3=copy.querySelector('h3');
    if(!h3)return;
    decorateDescription(copy);
    void decorateGallery(selected,(h3.textContent||'').trim());
  }

  function sync(){decorateHeader();decorateProduct()}
  let frame=0;
  const queue=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;sync()})};
  const observer=new MutationObserver(queue);
  const start=()=>{observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','src']});sync()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
