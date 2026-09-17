const COUNTRY_CURRENCY:Record<string,string>={
 US:"USD",CA:"CAD",GB:"GBP",UK:"GBP",CH:"CHF",IS:"ISK",NO:"NOK",SE:"SEK",DK:"DKK",PL:"PLN",CZ:"CZK",HU:"HUF",RO:"RON",RS:"RSD",UA:"UAH",TR:"TRY",
 AU:"AUD",NZ:"NZD",JP:"JPY",CN:"CNY",HK:"HKD",SG:"SGD",KR:"KRW",TW:"TWD",IN:"INR",PK:"PKR",BD:"BDT",LK:"LKR",TH:"THB",ID:"IDR",MY:"MYR",PH:"PHP",VN:"VND",
 AE:"AED",SA:"SAR",QA:"QAR",KW:"KWD",BH:"BHD",OM:"OMR",IL:"ILS",JO:"JOD",EG:"EGP",MA:"MAD",
 ZA:"ZAR",NG:"NGN",KE:"KES",GH:"GHS",TZ:"TZS",UG:"UGX",
 BR:"BRL",MX:"MXN",AR:"ARS",CL:"CLP",CO:"COP",PE:"PEN",UY:"UYU",PY:"PYG",BO:"BOB",CR:"CRC",DO:"DOP",JM:"JMD",
 RU:"RUB"
};

// Bulgaria adopted the euro on 1 January 2026.
const EURO_COUNTRIES=new Set(["AT","BE","BG","HR","CY","EE","FI","FR","DE","GR","IE","IT","LV","LT","LU","MT","NL","PT","SK","SI","ES"]);

export function countryCurrency(country?:string){
 const code=String(country||"").trim().toUpperCase();
 if(EURO_COUNTRIES.has(code))return"EUR";
 return COUNTRY_CURRENCY[code]||"EUR";
}

export async function fxRate(from:string,to:string){
 const source=String(from||"EUR").toUpperCase(),target=String(to||"EUR").toUpperCase();
 if(source===target)return 1;
 if(!/^[A-Z]{3}$/.test(source)||!/^[A-Z]{3}$/.test(target))throw new Error("FX_RATE_UNAVAILABLE");
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
 try{
  try{
   const response=await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(source)}&to=${encodeURIComponent(target)}`,{signal:controller.signal,next:{revalidate:1800}});
   if(response.ok){const data=await response.json() as {rates?:Record<string,number>};const rate=Number(data.rates?.[target]);if(Number.isFinite(rate)&&rate>0)return rate}
  }catch(error){if((error as Error)?.name==="AbortError")throw error}
  const fallback=await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(source)}`,{signal:controller.signal,next:{revalidate:21600}});
  if(!fallback.ok)throw new Error("FX_RATE_UNAVAILABLE");
  const data=await fallback.json() as {result?:string;rates?:Record<string,number>};
  const rate=Number(data.rates?.[target]);
  if(data.result!=="success"||!Number.isFinite(rate)||rate<=0)throw new Error("FX_RATE_UNAVAILABLE");
  return rate;
 }finally{clearTimeout(timer)}
}

export async function convertMoney(amount:number,from:string,to:string){
 const rate=await fxRate(from,to);
 return Math.round(Number(amount||0)*rate*100)/100;
}
