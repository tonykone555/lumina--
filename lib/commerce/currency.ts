const COUNTRY_CURRENCY:Record<string,string>={
 US:"USD",CA:"CAD",GB:"GBP",UK:"GBP",CH:"CHF",AU:"AUD",NZ:"NZD",JP:"JPY",CN:"CNY",HK:"HKD",SG:"SGD",KR:"KRW",IN:"INR",BR:"BRL",MX:"MXN",ZA:"ZAR",SE:"SEK",NO:"NOK",DK:"DKK",PL:"PLN",CZ:"CZK",HU:"HUF",RO:"RON",BG:"BGN",TR:"TRY",AE:"AED",SA:"SAR",IL:"ILS",TH:"THB",ID:"IDR",MY:"MYR",PH:"PHP"
};

const EURO_COUNTRIES=new Set(["AT","BE","HR","CY","EE","FI","FR","DE","GR","IE","IT","LV","LT","LU","MT","NL","PT","SK","SI","ES"]);

export function countryCurrency(country?:string){
 const code=String(country||"").trim().toUpperCase();
 if(EURO_COUNTRIES.has(code))return"EUR";
 return COUNTRY_CURRENCY[code]||"EUR";
}

export async function fxRate(from:string,to:string){
 const source=String(from||"EUR").toUpperCase(),target=String(to||"EUR").toUpperCase();
 if(source===target)return 1;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);
 try{
  const response=await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(source)}&to=${encodeURIComponent(target)}`,{signal:controller.signal,next:{revalidate:1800}});
  if(!response.ok)throw new Error("FX_RATE_UNAVAILABLE");
  const data=await response.json() as {rates?:Record<string,number>};
  const rate=Number(data.rates?.[target]);
  if(!Number.isFinite(rate)||rate<=0)throw new Error("FX_RATE_UNAVAILABLE");
  return rate;
 }finally{clearTimeout(timer)}
}

export async function convertMoney(amount:number,from:string,to:string){
 const rate=await fxRate(from,to);
 return Math.round(Number(amount||0)*rate*100)/100;
}
