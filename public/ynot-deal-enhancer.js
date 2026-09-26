(()=>{
  let etsyOnly=false;
  const productCache=new Map();
  const nativeInputValue=(input,value)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;setter?.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))};
  const norm=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const isMobile=()=>((window.visualViewport?.width||window.innerWidth)<=760);

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

  async function productDetails(title){
    const cacheKey=`${etsyOnly?'etsy':'all'}:${norm(title)}`;
    if(productCache.has(cacheKey))return productCache.get(cacheKey);
    const promise=(async()=>{
      try{
        const params=new URLSearchParams({q:title,market:'lumina',source:'all',page:'0'});
        const response=await fetch(`/api/catalog?${params.toString()}`,{cache:'no-store'}),data=await response.json();
        const products=Array.isArray(data?.products)?data.products:[];
        let exact=products.find(p=>norm(p?.title)===norm(title))||products.find(p=>norm(p?.title).includes(norm(title))||norm(title).includes(norm(p?.title)))||products[0]||null;
        if(exact&&String(exact.source||'').toLowerCase().includes('shopify')){
          try{const r=await fetch('/api/commerce/product-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(exact),cache:'no-store'}),d=await r.json();if(r.ok&&d?.product)exact={...exact,...d.product,url:d.url||d.product.url||exact.url}}catch{}
        }
        return exact;
      }catch{return null}
    })();
    productCache.set(cacheKey,promise);return promise;
  }

  function mediaFor(product,current){
    const list=[current,product?.image,...(Array.isArray(product?.images)?product.images:[]),...(Array.isArray(product?.variants)?product.variants.map(v=>v?.image):[])].filter(Boolean).map(String);
    return [...new Set(list)];
  }

  function applyImage(selected,gallery,src){
    const main=selected.querySelector(':scope > img');if(!main||!src)return;
    main.src=src;selected.dataset.ynotFullMediaUrl=src;
    gallery?.querySelectorAll('button').forEach(node=>node.classList.toggle('active',node.dataset.mediaUrl===src));
  }
  function nextImage(selected,images,gallery){
    const main=selected.querySelector(':scope > img');if(!main||images.length<2)return;
    const current=selected.dataset.ynotFullMediaUrl||main.src;
    let index=images.findIndex(src=>src===current);if(index<0)index=0;
    applyImage(selected,gallery,images[(index+1)%images.length]);
  }

  async function decorateDescription(copy,title){
    const h3=copy.querySelector('h3');if(!h3)return;
    const key=norm(title),existing=copy.querySelector('.ynot-description-toggle');
    if(existing?.dataset.productKey===key)return;
    copy.querySelectorAll('.ynot-description-toggle,.ynot-description-panel').forEach(n=>n.remove());
    const product=await productDetails(title);if(!document.body.contains(copy)||norm(copy.querySelector('h3')?.textContent)!==key)return;
    const fallback=copy.querySelector('p')?.textContent||'Product details from the marketplace listing.';
    const description=String(product?.description||fallback||'').trim();
    const button=document.createElement('button');button.type='button';button.className='ynot-description-toggle';button.textContent='Description';button.dataset.productKey=key;
    const panel=document.createElement('div');panel.className='ynot-description-panel';panel.textContent=description;panel.setAttribute('aria-hidden','true');
    button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const open=panel.classList.toggle('open');button.classList.toggle('active',open);button.setAttribute('aria-expanded',String(open));panel.setAttribute('aria-hidden',String(!open))});
    button.setAttribute('aria-expanded','false');
    copy.insertBefore(button,h3);copy.insertBefore(panel,h3);
  }

  function openViewer(images,start=0){
    if(isMobile())return;
    document.querySelector('.ynot-deal-gallery-viewer')?.remove();if(!images.length)return;
    let index=Math.max(0,Math.min(start,images.length-1));
    const viewer=document.createElement('section');viewer.className='ynot-deal-gallery-viewer';
    const image=document.createElement('img');image.alt='Product view';
    const close=document.createElement('button');close.type='button';close.className='ynot-deal-gallery-close';close.textContent='×';close.setAttribute('aria-label','Close gallery');
    const prev=document.createElement('button');prev.type='button';prev.className='ynot-deal-gallery-prev';prev.textContent='‹';prev.setAttribute('aria-label','Previous image');
    const next=document.createElement('button');next.type='button';next.className='ynot-deal-gallery-next';next.textContent='›';next.setAttribute('aria-label','Next image');
    const count=document.createElement('span');count.className='ynot-deal-gallery-count';
    const render=()=>{image.src=images[index];count.textContent=`${index+1} / ${images.length}`};
    const move=delta=>{index=(index+delta+images.length)%images.length;render()};
    close.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();viewer.remove()});prev.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();move(-1)});next.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();move(1)});viewer.addEventListener('click',e=>e.stopPropagation());viewer.append(image,close,prev,next,count);document.body.appendChild(viewer);render();
  }

  async function decorateGallery(selected,title){
    const main=selected.querySelector(':scope > img');if(!main||!main.src)return;
    const signature=`${etsyOnly?'etsy':'all'}:${norm(title)}`,old=selected.querySelector('.ynot-deal-thumb-gallery');if(old?.dataset.signature===signature)return;old?.remove();
    const product=await productDetails(title),images=mediaFor(product,main.src);
    if(!document.body.contains(selected)||images.length<2)return;
    const currentTitle=selected.querySelector('.ynot-selected-copy h3')?.textContent||'';if(norm(currentTitle)!==norm(title))return;
    selected.dataset.ynotFinalMedia=JSON.stringify(images);
    const gallery=document.createElement('div');gallery.className='ynot-deal-thumb-gallery';gallery.dataset.signature=signature;
    const visible=Math.min(images.length,4);
    images.slice(0,visible).forEach((src,index)=>{
      const button=document.createElement('button');button.type='button';button.dataset.mediaUrl=src;const img=document.createElement('img');img.src=src;img.alt=`${title} view ${index+1}`;button.appendChild(img);
      const more=images.length>4&&index===visible-1;
      if(more){
        button.classList.add('ynot-deal-thumb-more');button.dataset.more=`+${images.length-3}`;button.setAttribute('aria-label',isMobile()?'Next product image':`Open all ${images.length} product images`);
        button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(isMobile())nextImage(selected,images,gallery);else openViewer(images,index)});
      } else button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();applyImage(selected,gallery,src)});
      if(src===main.src)button.classList.add('active');gallery.appendChild(button);
    });
    main.insertAdjacentElement('afterend',gallery);

    if(!main.dataset.ynotMobileTapCycle){
      main.dataset.ynotMobileTapCycle='1';
      main.addEventListener('click',e=>{if(!isMobile())return;e.preventDefault();e.stopImmediatePropagation();nextImage(selected,images,gallery)},true);
    }
  }

  function installDockSwipe(){
    const dock=document.querySelector('.ynot-drawer.open .ynot-dock');
    if(!dock||dock.dataset.ynotSwipeRail==='1')return;
    dock.dataset.ynotSwipeRail='1';
    let sx=0,sy=0,startScroll=0,moved=false;
    dock.addEventListener('touchstart',e=>{
      if(!isMobile()||!e.touches?.length)return;
      const t=e.touches[0];sx=t.clientX;sy=t.clientY;startScroll=dock.scrollLeft;moved=false;
      e.stopPropagation();
    },{capture:true,passive:true});
    dock.addEventListener('touchmove',e=>{
      if(!isMobile()||!e.touches?.length)return;
      const t=e.touches[0],dx=t.clientX-sx,dy=t.clientY-sy;
      if(Math.abs(dx)<=Math.abs(dy)||Math.abs(dx)<3)return;
      moved=true;
      e.preventDefault();
      e.stopImmediatePropagation();
      dock.scrollLeft=startScroll-dx;
    },{capture:true,passive:false});
    dock.addEventListener('touchend',e=>{
      if(moved){e.preventDefault();e.stopImmediatePropagation();}
      moved=false;
    },{capture:true,passive:false});
    dock.addEventListener('touchcancel',()=>{moved=false},{capture:true,passive:true});
    dock.addEventListener('click',e=>{if(!moved)return;e.preventDefault();e.stopImmediatePropagation()},true);
  }

  function decorateProduct(){
    const selected=document.querySelector('.ynot-drawer.open .ynot-selected'),copy=selected?.querySelector('.ynot-selected-copy');if(!selected||!copy)return;
    const h3=copy.querySelector('h3');if(!h3)return;const title=(h3.textContent||'').trim();void decorateDescription(copy,title);void decorateGallery(selected,title);
  }

  function sync(){decorateHeader();installDockSwipe();decorateProduct()}let frame=0;const queue=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;sync()})};const observer=new MutationObserver(queue);const start=()=>{observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','src']});sync()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();