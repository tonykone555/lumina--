(()=>{
  const PRICE_SELECTOR=['.orb-price','.lv4-price','.price-pill','[class*="price-pill"]','.lv4-detailcopy strong','.ynot-orb-copy strong','.ynot-selected-copy strong','.ynot-story-copy strong','.ynot-etsy-copy strong','.ynot-etsy-detail .lv4-detailcopy strong','.ynot-unified-bag-copy strong','.ynot-bag-total strong'].join(',');
  const CURRENCIES=new Set(['EUR','GBP','USD','CAD','AUD','CHF','JPY','INR','SGD','NZD','CNY','HKD','KRW','TWD','SEK','NOK','DKK','PLN','CZK','HUF','RON','RSD','UAH','TRY','PKR','BDT','LKR','THB','IDR','MYR','PHP','VND','AED','SAR','QAR','KWD','BHD','OMR','ILS','JOD','EGP','MAD','ZAR','NGN','KES','GHS','TZS','UGX','BRL','MXN','ARS','CLP','COP','PEN','UYU','PYG','BOB','CRC','DOP','JMD','ISK','RUB']);

  function detectCurrency(text){
    const t=String(text||'').trim();
    if(!t)return null;
    if(/US\$/i.test(t))return'USD';
    if(/CA\$/i.test(t))return'CAD';
    if(/AU\$/i.test(t))return'AUD';
    if(/NZ\$/i.test(t))return'NZD';
    if(/HK\$/i.test(t))return'HKD';
    if(/(?:^|\s)S\$(?=\s?\d)/i.test(t))return'SGD';
    if(/€/.test(t))return'EUR';
    if(/£/.test(t))return'GBP';
    if(/₹/.test(t))return'INR';
    const codes=(t.toUpperCase().match(/\b[A-Z]{3}\b/g)||[]);
    const code=codes.find(value=>CURRENCIES.has(value));
    if(code)return code;
    if(/¥/.test(t))return/\bCNY\b/i.test(t)?'CNY':'JPY';
    if(/(^|[^A-Z])\$(?=\s?\d)/i.test(t))return'USD';
    return null;
  }

  function moneyNumber(raw){
    const original=String(raw||'').trim();
    if(!original)return null;
    const negative=original.startsWith('-');
    let value=original.replace(/[-\s\u00a0\u202f'’]/g,'');
    const commaCount=(value.match(/,/g)||[]).length,dotCount=(value.match(/\./g)||[]).length;

    if(commaCount&&dotCount){
      const decimal=value.lastIndexOf(',')>value.lastIndexOf('.')?',':'.';
      const group=decimal===','?'.':',';
      value=value.split(group).join('');
      if(decimal===',')value=value.replace(',','.');
    }else if(commaCount||dotCount){
      const separator=commaCount?',':'.',parts=value.split(separator);
      if(parts.length>2){
        if(parts.slice(1).every(part=>part.length===3))value=parts.join('');
        else{
          const fraction=parts.pop()||'';
          value=parts.join('')+(fraction?'.'+fraction:'');
        }
      }else{
        const left=parts[0]||'0',right=parts[1]||'';
        value=right.length===3&&left.length>=1&&left.length<=3?left+right:left+(right?'.'+right:'');
      }
    }

    const number=Number((negative?'-':'')+value);
    return Number.isFinite(number)?number:null;
  }

  function parse(text){
    const t=String(text||'').trim();
    if(!t||t.length>48)return null;
    const currency=detectCurrency(t);
    if(!currency)return null;
    const match=t.replace(/[\s\u00a0\u202f]/g,'').match(/-?[\d.,'’]+/);
    if(!match)return null;
    const value=moneyNumber(match[0]);
    return value!=null&&value>0?{value,currency}:null;
  }

  function stamp(node){
    if(!(node instanceof HTMLElement))return;
    if(node.dataset.ynotPriceParser==='v2')return;
    const parsed=parse(node.textContent);
    if(!parsed)return;
    node.dataset.ynotSourcePrice=String(parsed.value);
    node.dataset.ynotSourceCurrency=parsed.currency;
    node.dataset.ynotPriceParser='v2';
  }

  function scan(root=document){
    if(root instanceof Element&&root.matches(PRICE_SELECTOR))stamp(root);
    if(root.querySelectorAll)root.querySelectorAll(PRICE_SELECTOR).forEach(stamp);
  }

  scan(document);
  const observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      for(const added of mutation.addedNodes){
        if(added instanceof Element)scan(added);
      }
    }
  });
  observer.observe(document.documentElement,{subtree:true,childList:true});
})();
