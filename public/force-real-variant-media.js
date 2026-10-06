(()=>{
  if(window.__ynotRealVariantMediaV2)return;
  window.__ynotRealVariantMediaV2=true;

  const uniq=xs=>[...new Set(xs.flat(Infinity).filter(x=>typeof x==="string"&&/^https?:\/\//i.test(x)))];
  const bad=url=>/placeholder|mock|dummy|sample|fallback|no[-_ ]?image|default[-_ ]?product|logo|avatar|blank/i.test(url||"");
  const clean=xs=>uniq(xs).filter(x=>!bad(x)&&!/^data:/i.test(x)&&!\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(x));
  const parse=value=>{try{return value?JSON.parse(value):null}catch{return null}};
  const mediaKey=url=>{try{const u=new URL(url);return (u.origin+u.pathname).replace(/_\d+x\d*(?=\.[a-z]+$)/i,"")}catch{return String(url||"").split("?")[0]}};
  const withoutFront=(urls,fronts)=>{const blocked=new Set(clean(fronts).map(mediaKey));return clean(urls).filter(url=>!blocked.has(mediaKey(url)))};


  function hostFor(section){
    return section.closest(".detail,.lv4-detail,.ynot-selected,[role='dialog'],aside")||section.parentElement;
  }

  function productFrom(host){
    if(!host)return null;
    const own=host.dataset?.ynotProduct||host.getAttribute?.("data-product")||host.getAttribute?.("data-product-json");
    if(own){const p=parse(own);if(p)return p}
    const nested=host.querySelector?.("[data-ynot-product],[data-product-json]");
    if(nested){const p=parse(nested.getAttribute("data-ynot-product")||nested.getAttribute("data-product-json"));if(p)return p}
    const title=(host.querySelector("h1,h2")?.textContent||"").trim();
    const id=host.getAttribute?.("data-product-id")||host.dataset?.productId||new URLSearchParams(location.search).get("product")||"";
    return title||id?{id,title}:null;
  }

  function variantImages(product){
    const variants=Array.isArray(product?.variants)?product.variants:[];
    return clean(variants.flatMap(v=>[v?.images,v?.image]));
  }

  function productImages(product){
    return clean([product?.images,product?.image]);
  }

  function exactlyThree(primary,fallback,fronts=[]){
    const ordered=withoutFront([primary,fallback],fronts);
    const distinct=[];const seen=new Set();
    for(const url of ordered){const k=mediaKey(url);if(seen.has(k))continue;seen.add(k);distinct.push(url)}
    if(!distinct.length)return[];
    const out=distinct.slice(0,3);
    while(out.length<3)out.push(out[out.length-1]);
    return out;
  }

  function render(section,urls,title){
    const images=exactlyThree(urls,[],[]);
    if(!images.length)return;
    let grid=section.querySelector(".ynot-about-image-grid");
    if(!grid){
      grid=document.createElement("div");
      grid.className="ynot-about-image-grid";
      grid.style.cssText="display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important;width:100%!important;margin:0 0 20px!important;";
      const videoRow=section.querySelector(".ynot-about-video-row");
      if(videoRow)videoRow.insertAdjacentElement("afterend",grid);else section.prepend(grid);
    }
    grid.replaceChildren(...images.map((src,index)=>{
      const figure=document.createElement("figure");
      figure.style.cssText="display:block!important;margin:0!important;min-width:0!important;";
      const img=document.createElement("img");
      img.src=src;
      img.alt=`${title||"Product"} variant ${index+1}`;
      img.loading="lazy";
      img.style.cssText="display:block!important;width:100%!important;aspect-ratio:1/1!important;object-fit:cover!important;border-radius:12px!important;background:#111!important;";
      const caption=document.createElement("figcaption");
      caption.textContent=`${title||"Product"} variant`;
      caption.style.cssText="display:block!important;margin-top:6px!important;font-size:9px!important;line-height:1.25!important;color:rgba(255,255,255,.58)!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;";
      figure.append(img,caption);
      return figure;
    }));
    grid.style.display="grid";
    section.dataset.realVariantMedia="1";
  }

  async function hydrate(section){
    if(section.dataset.realVariantMediaLoading==="1")return;
    const host=hostFor(section),base=productFrom(host);
    if(!base)return;
    const hostMain=[base?.image,...[...host.querySelectorAll("img")].slice(0,1).map(img=>img.currentSrc||img.src||"")];
    const immediateVariants=withoutFront(variantImages(base),hostMain);
    const immediateGallery=withoutFront(productImages(base),hostMain);
    const immediateDom=withoutFront([...host.querySelectorAll("img")].slice(1).map(img=>img.currentSrc||img.src||""),hostMain);
    const immediate=exactlyThree(immediateVariants,[immediateGallery,immediateDom],hostMain);
    if(immediate.length)render(section,immediate,base.title||"Product");
    if(section.dataset.realVariantMedia==="1"&&immediateVariants.length>=3)return;
    section.dataset.realVariantMediaLoading="1";
    try{
      const r=await fetch("/api/commerce/product-link",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify(base),
        cache:"no-store"
      });
      const data=await r.json().catch(()=>null);
      if(!r.ok||!data?.product||!section.isConnected)return;
      const p=data.product;
      const hydratedFront=[base?.image,p?.image,...[...host.querySelectorAll("img")].slice(0,1).map(img=>img.currentSrc||img.src||"")];
      const realVariants=withoutFront(variantImages(p),hydratedFront);
      const realGallery=withoutFront(productImages(p),hydratedFront);
      const domAlternates=withoutFront([...host.querySelectorAll("img")].slice(1).map(img=>img.currentSrc||img.src||""),hydratedFront);
      const chosen=exactlyThree(realVariants,[realGallery,domAlternates],hydratedFront);
      if(chosen.length)render(section,chosen,p.title||base.title||"Product");
    }catch{}finally{
      delete section.dataset.realVariantMediaLoading;
    }
  }

  function sync(){
    document.querySelectorAll("[data-ynot-force-about='true']").forEach(section=>{void hydrate(section)});
  }

  let frame=0;
  const queue=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;sync()})};
  const start=()=>{
    sync();
    new MutationObserver(queue).observe(document.body,{subtree:true,childList:true});
    setInterval(sync,1000);
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
