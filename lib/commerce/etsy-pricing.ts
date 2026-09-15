export type EtsyPriceBreakdown={supplierPrice:number;markupPct:number;productMargin:number;ynotProductPrice:number;minimumMargin:number};
export type KlarnaPreview={eligible:boolean;parts:3|4|null;amount:number|null;label:string;country:string;reason?:string};

const round=(n:number)=>Math.round(n*100)/100;

export function etsyMarkupPct(price:number){
 if(price<=20)return .25;
 if(price<=50)return .20;
 if(price<=100)return .15;
 if(price<=250)return .12;
 return .09;
}

export function etsyMinimumMargin(price:number){
 if(price<=20)return 4;
 if(price<=50)return 5;
 if(price<=100)return 7;
 if(price<=250)return 10;
 return 15;
}

export function etsyProductPrice(supplierPrice:number):EtsyPriceBreakdown{
 const price=Math.max(0,Number(supplierPrice)||0),markupPct=etsyMarkupPct(price),minimumMargin=etsyMinimumMargin(price);
 const productMargin=Math.max(price*markupPct,minimumMargin),ynotProductPrice=round(price+productMargin);
 return{supplierPrice:round(price),markupPct,productMargin:round(productMargin),ynotProductPrice,minimumMargin};
}

const PAY3_EUR=new Set(["AT","DE","FR","IE","IT","ES","NL","GR","PT"]);
const PAY4=new Set(["AU","CA","NZ","US"]);

export function klarnaPreview(total:number,countryRaw:string,currencyRaw="EUR"):KlarnaPreview{
 const totalValue=round(Math.max(0,Number(total)||0)),country=String(countryRaw||"").toUpperCase(),currency=String(currencyRaw||"EUR").toUpperCase();
 if(currency==="EUR"&&PAY3_EUR.has(country)){
  const min=country==="NL"?25:1,max=["GR","PT"].includes(country)?1000:["AT","DE","NL"].includes(country)?5000:1500;
  if(totalValue>=min&&totalValue<=max)return{eligible:true,parts:3,amount:round(totalValue/3),label:`Pay in 3 with Klarna`,country};
  return{eligible:false,parts:null,amount:null,label:"Klarna may be available at checkout",country,reason:"amount_outside_installment_range"};
 }
 if(PAY4.has(country)){
  const expectedCurrency=country==="AU"?"AUD":country==="CA"?"CAD":country==="NZ"?"NZD":"USD",min=["AU","NZ"].includes(country)?10:1,max=country==="US"?2000:country==="CA"?1500:2000;
  if(currency===expectedCurrency&&totalValue>=min&&totalValue<=max)return{eligible:true,parts:4,amount:round(totalValue/4),label:"Pay in 4 with Klarna",country};
 }
 return{eligible:false,parts:null,amount:null,label:"Klarna may be available at checkout",country,reason:"country_currency_not_previewable"};
}
