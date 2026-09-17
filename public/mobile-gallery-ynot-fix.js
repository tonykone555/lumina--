(()=>{
  const isMobile=()=>window.matchMedia('(max-width:899px)').matches;
  const hideCounters=()=>{
    if(!isMobile())return;
    document.querySelectorAll('.lv4-detail').forEach(shell=>{
      shell.querySelectorAll('*').forEach(node=>{
        if(!(node instanceof HTMLElement))return;
        const text=(node.textContent||'').trim();
        const cls=String(node.className||'').toLowerCase();
        const aria=(node.getAttribute('aria-label')||'').toLowerCase();
        if(/^\d+\s*\/\s*\d+$/.test(text)||/(gallery|image|media|slide).*(count|counter|pagination)|\b(count|counter)\b/.test(cls)||/(image|photo|slide|media).*(of|count)/.test(aria)){
          node.style.setProperty('display','none','important');
          node.style.setProperty('visibility','hidden','important');
          node.style.setProperty('pointer-events','none','important');
        }
      });
      shell.querySelectorAll('button').forEach(button=>{
        const label=(button.getAttribute('aria-label')||'').toLowerCase();
        const cls=String(button.className||'').toLowerCase();
        if(/\b(previous|next)\b/.test(label)&&/(image|photo|slide|media|product)/.test(label)||/(gallery|slider|carousel).*(prev|next)|(prev|next).*(gallery|slider|carousel)/.test(cls)){
          button.style.setProperty('display','none','important');
          button.style.setProperty('visibility','hidden','important');
          button.style.setProperty('pointer-events','none','important');
        }
      });
    });
  };

  let opening=false;
  const openDeals=()=>{
    if(opening)return;
    const drawer=document.querySelector('.ynot-drawer');
    if(drawer?.classList.contains('open'))return;
    const peek=document.querySelector('.ynot-peek');
    if(!(peek instanceof HTMLButtonElement))return;
    opening=true;
    peek.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
    setTimeout(()=>{opening=false},180);
  };

  const onClick=(event)=>{
    const target=event.target instanceof Element?event.target:null;
    if(!target)return;
    const button=target.closest('.ynot-world-row button');
    if(button&&(button.textContent||'').trim().toUpperCase()==='YNOT'){
      event.preventDefault();
      event.stopPropagation();
      openDeals();
    }
  };

  document.addEventListener('click',onClick,true);
  window.addEventListener('ynot:open-deals',openDeals);
  let raf=0;const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;hideCounters()})};
  const start=()=>{hideCounters();const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-label']});window.addEventListener('resize',schedule,{passive:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();