(()=>{
  if(window.__ynotForceAboutSectionV3)return;
  window.__ynotForceAboutSectionV3=true;

  const clean=value=>{
    if(value==null)return"";
    if(typeof value==="object"){
      if(Array.isArray(value))return value.map(clean).filter(Boolean).join(" ");
      return clean(value.description??value.text??value.plain??value.value??value.html??"");
    }
    const s=String(value).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
    return /^\[object Object\]$/i.test(s)||/^object object$/i.test(s)?"":s;
  };
  const isAddToBag=el=>/^add to bag$/i.test(clean(el.textContent));
  const uniq=xs=>[...new Set(xs.flat(Infinity).filter(x=>typeof x==="string"&&/^https?:\/\//i.test(x)))];
  const isVideoUrl=url=>/\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(url||"");
  const isYouTube=url=>/youtu\.be\//i.test(url||"")||/youtube\.com\/(watch|shorts|embed)/i.test(url||"");
  const isVimeo=url=>/vimeo\.com\//i.test(url||"");
  const isPlaceholder=url=>/placeholder|mock|dummy|sample|fallback|no[-_ ]?image|default[-_ ]?product|logo|avatar/i.test(url||"");
  const cleanImages=xs=>uniq(xs).filter(src=>!isPlaceholder(src)&&!isVideoUrl(src)&&!isYouTube(src)&&!isVimeo(src));
  const externalEmbed=url=>{
    try{
      const u=new URL(url);
      if(/youtu\.be$/i.test(u.hostname))return `https://www.youtube.com/embed/${u.pathname.replace(/^\//,"")}`;
      if(/youtube\.com$/i.test(u.hostname)||/www\.youtube\.com$/i.test(u.hostname)){
        const id=u.searchParams.get("v")||u.pathname.match(/\/(?:shorts|embed)\/([^/?#]+)/)?.[1];
        return id?`https://www.youtube.com/embed/${id}`:"";
      }
      if(/vimeo\.com$/i.test(u.hostname)||/www\.vimeo\.com$/i.test(u.hostname)){
        const id=u.pathname.match(/\/(\d+)/)?.[1];
        return id?`https://player.vimeo.com/video/${id}`:"";
      }
    }catch{}
    return"";
  };

  function findHost(button){
    return button.closest(".detail,.lv4-detail,.ynot-selected,[role='dialog'],aside") || button.parentElement?.parentElement || button.parentElement;
  }

  function parseJson(value){try{return value?JSON.parse(value):null}catch{return null}}
  function productFromHost(host){
    const own=host.dataset?.ynotProduct||host.getAttribute?.("data-product")||host.getAttribute?.("data-product-json");
    if(own){const p=parseJson(own);if(p)return p}
    const nested=host.querySelector?.("[data-ynot-product],[data-product-json]");
    if(nested){const p=parseJson(nested.getAttribute("data-ynot-product")||nested.getAttribute("data-product-json"));if(p)return p}
    return null;
  }

  function productId(host,product){
    if(product?.id)return String(product.id);
    const direct=host.getAttribute?.("data-product-id")||host.dataset?.productId||host.dataset?.id;
    if(direct)return direct;
    const p=new URLSearchParams(location.search).get("product");
    if(p)return p;
    const link=host.querySelector?.('a[href*="/p/"]');
    const match=link?.getAttribute("href")?.match(/\/p\/([^?#/]+)/);
    return match?decodeURIComponent(match[1]):"";
  }

  function domMedia(host){
    const videos=[];
    host.querySelectorAll("video").forEach(video=>{
      if(video.currentSrc)videos.push(video.currentSrc);
      if(video.src)videos.push(video.src);
      video.querySelectorAll("source").forEach(source=>{if(source.src)videos.push(source.src)});
    });
    host.querySelectorAll("iframe").forEach(frame=>{if(frame.src&&(isYouTube(frame.src)||isVimeo(frame.src)))videos.push(frame.src)});
    const images=[...host.querySelectorAll("img")].map(img=>img.currentSrc||img.src||"").filter(Boolean);
    return{videos:uniq(videos),images:cleanImages(images)};
  }

  function objectMedia(product){
    if(!product)return{videos:[],images:[],variantImages:[],productImages:[]};
    const variants=Array.isArray(product.variants)?product.variants:[];
    const variantImages=cleanImages(variants.map(v=>[v?.images,v?.image]));
    const productImages=cleanImages([product.images,product.image]);
    return{
      videos:uniq([product.videos,product.video_urls,product.media_urls,variants.map(v=>[v?.videos,v?.video_urls])]),
      variantImages,
      productImages,
      images:cleanImages([variantImages,productImages])
    };
  }

  function mediaNode(url,title,index,forceVideo=false){
    if(forceVideo){
      const wrap=document.createElement("figure");
      wrap.className="ynot-about-video";
      wrap.style.cssText="display:block!important;margin:0!important;min-width:min(78vw,420px)!important;max-width:min(78vw,420px)!important;";
      const embed=externalEmbed(url);
      if(embed){
        const iframe=document.createElement("iframe");
        iframe.src=embed;
        iframe.title=`${title} video ${index+1}`;
        iframe.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen=true;
        iframe.style.cssText="display:block!important;width:100%!important;aspect-ratio:4/5!important;border:0!important;border-radius:14px!important;background:#111!important;";
        wrap.append(iframe);
      }else{
        const video=document.createElement("video");
        video.src=url;
        video.controls=true;
        video.muted=true;
        video.loop=true;
        video.playsInline=true;
        video.preload="metadata";
        video.setAttribute("playsinline","");
        video.setAttribute("webkit-playsinline","");
        video.style.cssText="display:block!important;width:100%!important;aspect-ratio:4/5!important;object-fit:cover!important;border-radius:14px!important;background:#111!important;";
        wrap.append(video);
      }
      const caption=document.createElement("figcaption");
      caption.textContent=`${title} video ${index+1}`;
      caption.style.cssText="display:block!important;margin-top:7px!important;font-size:9px!important;line-height:1.25!important;color:rgba(255,255,255,.58)!important;";
      wrap.append(caption);
      return wrap;
    }
    const figure=document.createElement("figure");
    figure.style.cssText="display:block!important;margin:0!important;min-width:0!important;";
    const img=document.createElement("img");
    img.src=url;
    img.alt=`${title} variant ${index+1}`;
    img.loading="lazy";
    img.style.cssText="display:block!important;width:100%!important;aspect-ratio:1/1!important;object-fit:cover!important;border-radius:12px!important;background:#111!important;";
    const caption=document.createElement("figcaption");
    caption.textContent=`${title} variant`;
    caption.style.cssText="display:block!important;margin-top:6px!important;font-size:9px!important;line-height:1.25!important;color:rgba(255,255,255,.58)!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;";
    figure.append(img,caption);
    return figure;
  }

  function renderMedia(section,title,videos,images){
    let videoRow=section.querySelector(".ynot-about-video-row");
    let imageGrid=section.querySelector(".ynot-about-image-grid");
    if(!videoRow){videoRow=document.createElement("div");videoRow.className="ynot-about-video-row";videoRow.style.cssText="display:none;gap:9px;width:100%;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none;margin:0 0 18px;padding:0 0 4px;";section.prepend(videoRow)}
    if(!imageGrid){imageGrid=document.createElement("div");imageGrid.className="ynot-about-image-grid";imageGrid.style.cssText="display:none;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;width:100%;margin:0 0 20px;";videoRow.insertAdjacentElement("afterend",imageGrid)}
    const v=uniq(videos).slice(0,6),im=cleanImages(images).slice(0,9);
    videoRow.replaceChildren(...v.map((src,i)=>mediaNode(src,title,i,true)));
    videoRow.style.display=v.length?"flex":"none";
    imageGrid.replaceChildren(...im.map((src,i)=>mediaNode(src,title,i,false)));
    imageGrid.style.display=im.length?"grid":"none";
  }

  function makeSection(host){
    const section=document.createElement("section");
    section.className="ynot-force-about-section";
    section.setAttribute("data-ynot-force-about","true");
    section.style.cssText="display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;width:100%!important;height:auto!important;min-height:120px!important;margin:26px 0 28px!important;padding:22px 0 6px!important;border-top:1px solid rgba(255,255,255,.14)!important;color:#fff!important;overflow:visible!important;clear:both!important;transform:none!important;clip:auto!important;clip-path:none!important;";

    const title=clean(host.querySelector("h1,h2")?.textContent)||"Product";
    const description=clean(host.querySelector(".description,.lv4-product-description,.ynot-selected-description,.info p,[data-description]")?.textContent)||clean(productFromHost(host)?.description)||"";
    const product=productFromHost(host);
    const direct=domMedia(host),stored=objectMedia(product);
    const initialImages=stored.variantImages.length?stored.variantImages:(stored.productImages.length?stored.productImages:direct.images);

    const small=document.createElement("small");
    small.textContent="DETAILS";
    small.style.cssText="display:block!important;font-size:9px!important;letter-spacing:.16em!important;color:rgba(255,255,255,.5)!important;";
    const heading=document.createElement("h2");
    heading.textContent="About this product";
    heading.style.cssText="display:block!important;margin:5px 0 10px!important;font-size:21px!important;line-height:1.1!important;color:#fff!important;-webkit-text-fill-color:#fff!important;";
    const copy=document.createElement("p");
    copy.textContent=description;copy.style.display=description?"block":"none";
    copy.style.cssText="display:block!important;margin:0!important;font-size:13px!important;line-height:1.5!important;color:rgba(255,255,255,.76)!important;-webkit-text-fill-color:rgba(255,255,255,.76)!important;";
    section.append(small,heading,copy);
    renderMedia(section,title,[stored.videos,direct.videos],initialImages);
    section.__ynotMedia={title,host,product,videos:uniq([stored.videos,direct.videos]),images:initialImages};
    return section;
  }

  async function enrichFromCatalogue(section){
    if(section.dataset.catalogueMediaLoaded==="1")return;
    section.dataset.catalogueMediaLoaded="1";
    const state=section.__ynotMedia;
    if(!state)return;
    const id=productId(state.host,state.product);
    if(!id){void researchExact(section);return;}
    try{
      const r=await fetch(`/api/commerce/product/${encodeURIComponent(id)}`,{cache:"force-cache"});
      const data=await r.json();
      if(!r.ok||!data?.product||!section.isConnected)return;
      const more=objectMedia(data.product);
      const videos=uniq([state.videos,more.videos]);
      const preferredImages=more.variantImages.length?more.variantImages:(more.productImages.length?more.productImages:state.images);
      state.videos=videos;state.images=preferredImages;
      renderMedia(section,state.title,videos,preferredImages);
    }catch{}
  }

  async function researchExact(section){
    if(section.dataset.geminiResearchLoading==="1"||section.dataset.geminiResearchDone==="1")return;
    const state=section.__ynotMedia;if(!state)return;
    section.dataset.geminiResearchLoading="1";
    try{
      const p=state.product||{};
      const r=await fetch("/api/commerce/research-product",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title:state.title,brand:clean(p.brand),url:clean(p.url||p.merchantUrl),description:clean(p.description)}),cache:"no-store"});
      const data=await r.json().catch(()=>null);
      if(!section.isConnected)return;
      const description=clean(data?.description);
      if(r.ok&&data?.found&&description){
        const copy=section.querySelector(".ynot-about-copy")||section.querySelector("p");
        if(copy){copy.textContent=description;copy.style.display="block";}
        section.dataset.geminiResearchDone="1";
      }
    }catch{}finally{delete section.dataset.geminiResearchLoading}
  }

  function mount(button){
    const host=findHost(button);
    if(!host)return;
    let section=host.querySelector("[data-ynot-force-about='true']");
    const actionRow=button.closest(".actions,.lv4-actions,[class*='actions']") || button.parentElement;
    if(!actionRow||!actionRow.parentElement)return;
    if(!section){
      host.querySelectorAll(".masonry-about-product,.ynot-about-native").forEach(n=>{if(!n.hasAttribute("data-ynot-force-about"))n.remove()});
      section=makeSection(host);
      actionRow.insertAdjacentElement("afterend",section);
    }
    void enrichFromCatalogue(section);
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
