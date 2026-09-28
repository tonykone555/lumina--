(()=>{
  // Media tap cycling is intentionally retired; use this already-loaded, cache-safe hook
  // to attach the lightweight product-options enhancement without adding another layout script.
  if(document.querySelector('script[data-ynot-product-options]'))return;
  const style=document.createElement('link');
  style.rel='stylesheet';style.href='/product-options-glass.css?v=1';style.dataset.ynotProductOptions='1';
  document.head.appendChild(style);
  const script=document.createElement('script');
  script.src='/product-options-glass.js?v=1';script.defer=true;script.dataset.ynotProductOptions='1';
  document.head.appendChild(script);
})();
