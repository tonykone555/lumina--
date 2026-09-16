(()=>{
  const last=new WeakMap(),observed=new WeakSet();
  function warmCard(card){
    card.querySelectorAll('img').forEach((img,index)=>{
      img.decoding='async';
      if(index===0)img.loading='eager';
      const src=img.currentSrc||img.src;if(!src)return;
      const preload=new Image();preload.decoding='async';preload.src=src;preload.decode?.().catch(()=>{});
    });
  }
  function heart(card){
    card.querySelector('.ynot-double-heart')?.remove();
    const mark=document.createElement('span');mark.className='ynot-double-heart';mark.setAttribute('aria-hidden','true');mark.innerHTML='♥';
    Object.assign(mark.style,{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%) scale(.45)',zIndex:'30',pointerEvents:'none',fontSize:'clamp(54px,13vw,94px)',lineHeight:'1',color:'#fff',textShadow:'0 10px 34px rgba(0,0,0,.45)',opacity:'0'});
    const host=card.querySelector('.ynot-orb-img')||card;if(getComputedStyle(host).position==='static')host.style.position='relative';host.appendChild(mark);
    mark.animate([{opacity:0,transform:'translate(-50%,-50%) scale(.45)'},{opacity:1,transform:'translate(-50%,-50%) scale(1.12)',offset:.35},{opacity:1,transform:'translate(-50%,-50%) scale(.96)',offset:.62},{opacity:0,transform:'translate(-50%,-50%) scale(1.04)'}],{duration:650,easing:'cubic-bezier(.2,.8,.2,1)'}).finished.finally(()=>mark.remove()).catch(()=>mark.remove());
  }
  function onTap(event){
    if(event.pointerType==='mouse')return;
    const target=event.target;if(!(target instanceof Element))return;
    const card=target.closest('.ynot-orb');if(!card||target.closest('button,a,input,select,textarea,label'))return;
    const now=performance.now(),prev=last.get(card)||0;last.set(card,now);
    if(now-prev<340){heart(card);last.set(card,0)}
  }
  document.addEventListener('pointerup',onTap,true);
  document.addEventListener('dblclick',event=>{const target=event.target;if(!(target instanceof Element))return;const card=target.closest('.ynot-orb');if(card&&!target.closest('button,a,input,select,textarea,label'))heart(card)},true);
  const io='IntersectionObserver'in window?new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){warmCard(entry.target);io.unobserve(entry.target)}}),{rootMargin:'500px 0px'}):null;
  function scan(){document.querySelectorAll('.ynot-orb').forEach(card=>{if(observed.has(card))return;observed.add(card);if(io)io.observe(card);else warmCard(card)});document.querySelectorAll('.ynot-selected>img,.ynot-story-media img,.lv4-detail>img').forEach(img=>{img.decoding='async';img.loading='eager'})}
  const mo=new MutationObserver(()=>requestAnimationFrame(scan));
  const start=()=>{mo.observe(document.body,{subtree:true,childList:true});scan()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
