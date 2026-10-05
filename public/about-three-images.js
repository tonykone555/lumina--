(()=>{
  if(window.__ynotAboutThreeImages)return;
  window.__ynotAboutThreeImages=true;

  function trim(section){
    const grid=section.querySelector('.ynot-about-image-grid');
    if(!grid)return;
    [...grid.children].slice(3).forEach(node=>node.remove());
  }

  function sync(){
    document.querySelectorAll("[data-ynot-force-about='true']").forEach(trim);
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
    new MutationObserver(queue).observe(document.body,{subtree:true,childList:true});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
