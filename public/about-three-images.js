(()=>{
  if(window.__ynotAboutThreeImagesV2)return;
  window.__ynotAboutThreeImagesV2=true;

  function enforce(section){
    const grid=section.querySelector('.ynot-about-image-grid,.ynot-about-images');
    if(!grid)return;
    if(section.dataset.realVariantMedia!=="1"){
      grid.style.setProperty('display','none','important');
      return;
    }
    const children=[...grid.children];
    children.slice(3).forEach(node=>node.remove());
    const kept=[...grid.children];
    if(!kept.length){
      grid.style.setProperty('display','none','important');
      return;
    }
    while(grid.children.length<3){
      grid.appendChild(grid.lastElementChild.cloneNode(true));
    }
    grid.style.setProperty('display','grid','important');
    grid.style.setProperty('grid-template-columns','repeat(3,minmax(0,1fr))','important');
  }

  function sync(){
    document.querySelectorAll("[data-ynot-force-about='true'],[data-native-about='true']").forEach(enforce);
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
