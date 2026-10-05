(()=>{
  if(window.__ynotForceAboutSection)return;
  window.__ynotForceAboutSection=true;

  const clean=s=>(s||"").replace(/\s+/g," ").trim();
  const isAddToBag=el=>/^add to bag$/i.test(clean(el.textContent));
  const uniqueImages=host=>[...host.querySelectorAll("img")]
    .map(img=>img.currentSrc||img.src||"")
    .filter(Boolean)
    .filter((src,i,a)=>a.indexOf(src)===i)
    .slice(1,4);

  function findHost(button){
    return button.closest(".detail,.lv4-detail,.ynot-selected,[role='dialog'],aside") || button.parentElement?.parentElement || button.parentElement;
  }

  function makeSection(host){
    const section=document.createElement("section");
    section.className="ynot-force-about-section";
    section.setAttribute("data-ynot-force-about","true");
    section.style.cssText="display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;width:100%!important;height:auto!important;min-height:120px!important;margin:26px 0 28px!important;padding:22px 0 6px!important;border-top:1px solid rgba(255,255,255,.14)!important;color:#fff!important;overflow:visible!important;clear:both!important;transform:none!important;clip:auto!important;clip-path:none!important;";

    const title=clean(host.querySelector("h1,h2")?.textContent)||"Product";
    const description=clean(host.querySelector(".description,.lv4-product-description,.ynot-selected-description,.info p,[data-description]")?.textContent)||`More details about ${title}.`;
    const urls=uniqueImages(host);

    if(urls.length){
      const images=document.createElement("div");
      images.style.cssText="display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important;width:100%!important;margin:0 0 20px!important;";
      urls.forEach((src,index)=>{
        const figure=document.createElement("figure");
        figure.style.cssText="display:block!important;margin:0!important;min-width:0!important;";
        const img=document.createElement("img");
        img.src=src;
        img.alt=`${title} detail ${index+1}`;
        img.style.cssText="display:block!important;width:100%!important;aspect-ratio:1/1!important;object-fit:cover!important;border-radius:12px!important;";
        const caption=document.createElement("figcaption");
        caption.textContent=`${title} detail`;
        caption.style.cssText="display:block!important;margin-top:6px!important;font-size:9px!important;line-height:1.25!important;color:rgba(255,255,255,.58)!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;";
        figure.append(img,caption);
        images.append(figure);
      });
      section.append(images);
    }

    const small=document.createElement("small");
    small.textContent="DETAILS";
    small.style.cssText="display:block!important;font-size:9px!important;letter-spacing:.16em!important;color:rgba(255,255,255,.5)!important;";
    const heading=document.createElement("h2");
    heading.textContent="About this product";
    heading.style.cssText="display:block!important;margin:5px 0 10px!important;font-size:21px!important;line-height:1.1!important;color:#fff!important;-webkit-text-fill-color:#fff!important;";
    const copy=document.createElement("p");
    copy.textContent=description;
    copy.style.cssText="display:block!important;margin:0!important;font-size:13px!important;line-height:1.5!important;color:rgba(255,255,255,.76)!important;-webkit-text-fill-color:rgba(255,255,255,.76)!important;";
    section.append(small,heading,copy);
    return section;
  }

  function mount(button){
    const host=findHost(button);
    if(!host||host.querySelector("[data-ynot-force-about='true']"))return;
    const actionRow=button.closest(".actions,.lv4-actions,[class*='actions']") || button.parentElement;
    if(!actionRow||!actionRow.parentElement)return;
    actionRow.insertAdjacentElement("afterend",makeSection(host));
  }

  function sync(){
    document.querySelectorAll("button").forEach(button=>{if(isAddToBag(button))mount(button)});
  }

  let frame=0;
  const queue=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;sync()})};
  const start=()=>{
    sync();
    new MutationObserver(queue).observe(document.body,{subtree:true,childList:true,characterData:true});
    window.setInterval(sync,750);
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
