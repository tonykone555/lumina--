(()=>{
  if(window.__ynotAboutThreeImagesV2)return;
  window.__ynotAboutThreeImagesV2=true;

  function enforce(section){
    const grid=section.querySelector('.ynot-about-image-grid,.ynot-about-images');
    if(!grid)return;
    const items=[...grid.children];
    const seen=new Set();
    for(const node of items){
      const img=node.querySelector?.('img');
      const src=img?.currentSrc||img?.src||'';
      let key=src;
      try{const u=new URL(src);key=u.origin+u.pathname}catch{}
      if(!src||seen.has(key))node.remove();else seen.add(key);
    }
    [...grid.children].slice(3).forEach(node=>node.remove());
    if(grid.children.length<3){
      grid.style.setProperty('display','none','important');
      section.dataset.realVariantMedia='0';
      return;
    }
    grid.style.setProperty('display','grid','important');
    grid.style.setProperty('grid-template-columns','repeat(3,minmax(0,1fr))','important');
    section.dataset.realVariantMedia='1';
  }
  function sync(){
    document.querySelectorAll("[data-ynot-force-about='true'],.ynot-about-native,.ynot-about-product").forEach(enforce);
  }

  let frame=0;
  const queue=()=>{
    if(frame)return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      sync();
    });
  };

  const start=()=>{
    sync();
    new MutationObserver(queue).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-real-variant-media']});
    setInterval(sync,600);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
