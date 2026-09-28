(()=>{
  const ROOT='.lv4-detailcopy';
  const star=`<span class="ynot-options-star" aria-hidden="true">✣</span>`;
  const enhance=(root)=>{
    if(!(root instanceof HTMLElement)) return;
    const variants=root.querySelector('.ynot-loaded-variants,.lv4-variants:not(.ynot-native-hidden)');
    let box=root.querySelector('.ynot-options-box');
    if(!variants||!variants.querySelector('button')){ box?.remove(); return; }
    if(box&&box.dataset.source===variants.dataset.variantSignature) return;
    box?.remove();
    box=document.createElement('section'); box.className='ynot-options-box';
    box.dataset.source=variants.dataset.variantSignature||String(variants.querySelectorAll('button').length);
    const toggle=document.createElement('button');
    toggle.type='button'; toggle.className='ynot-options-toggle'; toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML=`${star}<span>Options</span>`;
    const panel=document.createElement('div'); panel.className='ynot-options-panel'; panel.hidden=true;
    const choices=document.createElement('div'); choices.className='ynot-options-choices';
    [...variants.querySelectorAll('button')].forEach(source=>{
      const choice=source.cloneNode(true); choice.classList.add('ynot-option-choice');
      choice.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();source.click();
        choices.querySelectorAll('button').forEach(n=>n.classList.toggle('active',n===choice));
        const title=root.querySelector('h2')?.textContent?.trim()||'';
        root.closest('.lv4-detail')?.setAttribute('data-ynot-selected-option',choice.textContent?.trim()||'');
        window.dispatchEvent(new CustomEvent('ynot:variant-selected',{detail:{title,label:choice.textContent?.trim()||''}}));
      }); choices.appendChild(choice);
    });
    panel.append(choices);box.append(toggle,panel);variants.classList.add('ynot-options-source-hidden');
    const similar=[...root.querySelectorAll('button')].find(n=>(n.textContent||'').trim().toLowerCase().includes('similar picks'));
    if(similar?.parentElement) similar.parentElement.insertBefore(box,similar); else {const actions=root.querySelector('.lv4-actions');if(actions)root.insertBefore(box,actions);else root.appendChild(box)}
    toggle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const open=panel.hidden;panel.hidden=!open;box.classList.toggle('open',open);toggle.setAttribute('aria-expanded',String(open))});
  };
  let raf=0;const scan=()=>{raf=0;document.querySelectorAll(ROOT).forEach(enhance)};const schedule=()=>{if(!raf)raf=requestAnimationFrame(scan)};
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-ynot-description-title']});document.addEventListener('click',schedule,true);schedule();
})();