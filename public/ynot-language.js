(()=>{
 const KEY='ynot-language';
 const LANGUAGES=[
  {code:'en',locale:'en-GB',label:'English'},
  {code:'fr',locale:'fr-FR',label:'Français'},
  {code:'de',locale:'de-DE',label:'Deutsch'},
  {code:'es',locale:'es-ES',label:'Español'},
  {code:'it',locale:'it-IT',label:'Italiano'}
 ];
 const COUNTRY_LOCALE={US:'en-US',CA:'en-CA',GB:'en-GB',UK:'en-GB',IE:'en-IE',AU:'en-AU',NZ:'en-NZ',SG:'en-SG',IN:'en-IN',ZA:'en-ZA',FR:'fr-FR',BE:'fr-BE',DE:'de-DE',AT:'de-AT',CH:'de-CH',ES:'es-ES',MX:'es-MX',AR:'es-AR',CL:'es-CL',CO:'es-CO',PE:'es-PE',IT:'it-IT'};
 let menu=null,anchor=null;
 const base=value=>String(value||'').trim().toLowerCase().split('-')[0];
 const supported=value=>{const item=LANGUAGES.find(language=>language.code===base(value));if(!item)return'';const raw=String(value||'').trim();return raw.includes('-')?raw:item.locale};
 const saved=()=>{try{return supported(localStorage.getItem(KEY))}catch{return''}};
 const country=()=>{try{const region=JSON.parse(localStorage.getItem('ynot-region')||'null');if(region?.country)return String(region.country).toUpperCase()}catch{}return String(document.documentElement.dataset.ynotCountry||'').toUpperCase()};
 const browserLocale=()=>{for(const value of [...(navigator.languages||[]),navigator.language]){const locale=supported(value);if(locale)return locale}return'en-GB'};
 const resolved=()=>saved()||supported(COUNTRY_LOCALE[country()])||supported(document.documentElement.lang)||browserLocale();
 const languageFor=value=>LANGUAGES.find(language=>language.code===base(value))||LANGUAGES[0];
 function ensureStyle(){if(document.getElementById('ynot-language-style'))return;const style=document.createElement('style');style.id='ynot-language-style';style.textContent=`
  .ynot-local-market-chip{cursor:pointer!important;user-select:none;-webkit-user-select:none;transition:background .18s ease,border-color .18s ease,transform .18s ease}
  .ynot-local-market-chip:hover{background:rgba(255,255,255,.11)!important;border-color:rgba(255,255,255,.25)!important}
  .ynot-local-market-chip:focus-visible{outline:1px solid rgba(255,255,255,.8);outline-offset:3px}
  .ynot-local-market-chip::after{content:'⌄';font-size:9px;line-height:1;opacity:.6;margin-left:1px;transform:translateY(-1px)}
  .ynot-language-menu{position:fixed;z-index:2147482600;width:172px;padding:7px;border:1px solid rgba(255,255,255,.16);border-radius:16px;background:rgba(15,16,16,.91);box-shadow:0 18px 56px rgba(0,0,0,.42);backdrop-filter:blur(22px) saturate(1.15);-webkit-backdrop-filter:blur(22px) saturate(1.15);font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fff}
  .ynot-language-menu small{display:block;padding:7px 9px 6px;color:rgba(255,255,255,.48);font-size:9px;font-weight:750;letter-spacing:.12em;text-transform:uppercase}
  .ynot-language-option{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;border:0;border-radius:11px;padding:9px 10px;background:transparent;color:rgba(255,255,255,.83);font:650 12px/1.15 system-ui,-apple-system,sans-serif;text-align:left;cursor:pointer}
  .ynot-language-option:hover,.ynot-language-option:focus-visible{background:rgba(255,255,255,.085);color:#fff;outline:none}
  .ynot-language-option[aria-checked='true']{background:rgba(255,255,255,.11);color:#fff}
  .ynot-language-check{opacity:.85;font-size:11px}
 `;document.head.appendChild(style)}
 function updateChip(){const chip=document.querySelector('.ynot-local-market-chip');if(!chip)return;const language=languageFor(resolved());chip.setAttribute('role','button');chip.setAttribute('tabindex','0');chip.setAttribute('aria-haspopup','menu');chip.setAttribute('aria-expanded',menu?'true':'false');chip.setAttribute('aria-label',`Shopping region. Voice language ${language.label}. Activate to change language.`);chip.dataset.ynotLanguageButton='true';document.documentElement.dataset.ynotLanguage=language.code}
 function positionMenu(){if(!menu||!anchor)return;const rect=anchor.getBoundingClientRect(),width=172,gap=7;let left=Math.min(Math.max(10,rect.right-width),window.innerWidth-width-10),top=rect.bottom+gap;if(top+menu.offsetHeight>window.innerHeight-10)top=Math.max(10,rect.top-menu.offsetHeight-gap);menu.style.left=`${left}px`;menu.style.top=`${top}px`}
 function closeMenu(){if(!menu)return;menu.remove();menu=null;if(anchor){anchor.setAttribute('aria-expanded','false');anchor=null}}
 function setLanguage(locale){const next=supported(locale);if(!next)return;try{localStorage.setItem(KEY,next)}catch{}document.documentElement.lang=next;document.documentElement.dataset.ynotLanguage=base(next);window.dispatchEvent(new CustomEvent('ynot:language-changed',{detail:{language:next,source:'manual'}}));closeMenu();updateChip()}
 function openMenu(chip){closeMenu();ensureStyle();anchor=chip;const current=resolved();menu=document.createElement('div');menu.className='ynot-language-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','YNOT language');menu.innerHTML=`<small>Language</small>${LANGUAGES.map(language=>`<button type="button" class="ynot-language-option" role="menuitemradio" aria-checked="${base(current)===language.code?'true':'false'}" data-ynot-language="${language.locale}"><span>${language.label}</span><span class="ynot-language-check">${base(current)===language.code?'✓':''}</span></button>`).join('')}`;document.body.appendChild(menu);chip.setAttribute('aria-expanded','true');positionMenu();menu.querySelector('[aria-checked="true"]')?.focus({preventScroll:true})}
 function toggle(chip){if(menu&&anchor===chip){closeMenu();return}openMenu(chip)}
 ensureStyle();
 document.addEventListener('click',event=>{const option=event.target?.closest?.('[data-ynot-language]');if(option){event.preventDefault();event.stopPropagation();setLanguage(option.getAttribute('data-ynot-language'));return}const chip=event.target?.closest?.('.ynot-local-market-chip');if(chip){event.preventDefault();event.stopPropagation();toggle(chip);return}if(menu&&!event.target?.closest?.('.ynot-language-menu'))closeMenu()},true);
 document.addEventListener('keydown',event=>{const chip=event.target?.closest?.('.ynot-local-market-chip');if(chip&&(event.key==='Enter'||event.key===' ')){event.preventDefault();toggle(chip);return}if(event.key==='Escape'&&menu){event.preventDefault();closeMenu();anchor?.focus?.({preventScroll:true})}});
 addEventListener('resize',positionMenu,{passive:true});
 addEventListener('scroll',positionMenu,{passive:true});
 addEventListener('storage',()=>setTimeout(updateChip,0));
 addEventListener('ynot:region-changed',()=>{setTimeout(updateChip,90);setTimeout(updateChip,350)});
 addEventListener('ynot:language-changed',()=>setTimeout(updateChip,0));
 const init=()=>{updateChip();setTimeout(updateChip,100);setTimeout(updateChip,500)};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
