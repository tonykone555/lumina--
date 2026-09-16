(()=>{
  let etsyOnly=false;
  const nativeInputValue=(input,value)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;setter?.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))};

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

  function decorateProduct(){
    const copy=document.querySelector('.ynot-drawer.open .ynot-selected-copy');
    if(!copy)return;
    const h3=copy.querySelector('h3');
    if(!h3||copy.querySelector('.ynot-description-toggle'))return;
    const source=copy.querySelector('p');
    const button=document.createElement('button');button.type='button';button.className='ynot-description-toggle';button.textContent='Description';
    const panel=document.createElement('div');panel.className='ynot-description-panel';panel.textContent=(source?.textContent||'Product details from the marketplace listing.').trim();
    button.addEventListener('click',()=>{const open=panel.classList.toggle('open');button.classList.toggle('active',open);button.setAttribute('aria-expanded',String(open))});
    button.setAttribute('aria-expanded','false');
    copy.insertBefore(button,h3);copy.insertBefore(panel,h3);
  }

  function sync(){decorateHeader();decorateProduct()}
  const observer=new MutationObserver(()=>requestAnimationFrame(sync));
  const start=()=>{observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});sync()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
