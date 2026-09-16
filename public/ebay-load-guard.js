(()=>{
 const nativeValueSetter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
 let armed=false;
 function setInput(input,value){if(nativeValueSetter)nativeValueSetter.call(input,value);else input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}))}
 function loadEbayIfEmpty(){
  if(document.querySelector('.lv4-product'))return;
  const input=document.querySelector('.lv4-search input');
  const submit=document.querySelector('.lv4-search button');
  if(!(input instanceof HTMLInputElement)||!(submit instanceof HTMLButtonElement))return;
  if(!input.value.trim())setInput(input,'trending products');
  setTimeout(()=>submit.click(),70);
 }
 document.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target:null;
  const ebay=target?.closest('.lv4-market-toggle .ebay');
  if(!(ebay instanceof HTMLElement))return;
  window.dispatchEvent(new CustomEvent('ynot:catalog-source',{detail:{source:'ebay'}}));
  if(armed)return;armed=true;
  setTimeout(()=>{armed=false;loadEbayIfEmpty()},180);
 },true);
})();
