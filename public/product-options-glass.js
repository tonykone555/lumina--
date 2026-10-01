(()=>{
  // Legacy Options pill is intentionally disabled. Variant data remains native
  // to the product detail so image/variant enrichment can use it without
  // rendering the old Options control in the bubble product card.
  const clean=()=>document.querySelectorAll('.ynot-options-box').forEach(n=>n.remove());
  let raf=0;
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;clean()})};
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
  schedule();
})();