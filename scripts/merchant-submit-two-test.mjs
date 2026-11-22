// Controlled one-time Merchant Center upload test. Remove the temporary build command after execution.
// Uses only the existing YNOT Shopify selling prices and recorded inventory.
import { createSign } from "node:crypto";
const products = [
 { offerId:"ynot-v2-fb0f8bcb85cbbb2cd689ed9e", title:"11 lb Dual Platform Kitchen Scale", description:"Dual platform digital kitchen scale measures two ingredients simultaneously with independent tare buttons for precise, easy cooking.", price:33.15, image:"https://cdn.shopify.com/s/files/1/1023/7453/9590/files/5322736_TopDown_3000px.jpg?v=1790008306", stock:10 },
 { offerId:"ynot-v2-abcf872ed467f0d8e1a24e65", title:"22 lb Waterproof Digital Kitchen Scale", description:"A waterproof digital kitchen scale with a marble-veined design, offering precise measurements and easy cleaning for any kitchen.", price:28.79, image:"https://cdn.shopify.com/s/files/1/1023/7453/9590/files/5330233_TopDown_3000px.jpg?v=1790008305", stock:10 },
];
const project = "5899503459", source = "10797727768";
const b64 = x => Buffer.from(x).toString("base64url");
async function auth() {
 const c = JSON.parse(process.env.GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON||"{}");
 if(c.type!=="service_account"||!c.private_key||!c.client_email) throw Error("Missing service account credential fields");
 const now=Math.floor(Date.now()/1000);
 const unsigned=b64(JSON.stringify({alg:"RS256",typ:"JWT"}))+"."+b64(JSON.stringify({iss:c.client_email,scope:"https://www.googleapis.com/auth/content",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600}));
 const signer=createSign("RSA-SHA256");signer.update(unsigned);signer.end();
 const assertion=unsigned+"."+b64(signer.sign(c.private_key));
 const result=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion}),signal:AbortSignal.timeout(20000)});
 if(!result.ok)throw Error("Google OAuth HTTP "+result.status);
 const response=await result.json();
 if(!response.access_token)throw Error("Google OAuth access token missing");
 return response.access_token;
}
async function main() {
 if(process.env.VERCEL_ENV!=="preview") {console.log("MERCHANT_TEST skipped: not preview");return;}
 if(process.env.GOOGLE_MERCHANT_ACCOUNT_ID!==project||process.env.GOOGLE_MERCHANT_DATA_SOURCE_ID!==source) {
  console.log("MERCHANT_TEST skipped: configured account or data source mismatch");return;
 }
 const ready=[];
 for(const p of products) {
  const link="https://shop.ynotworld.app/products/"+p.offerId;
  try {
   const res=await fetch(link,{redirect:"follow",signal:AbortSignal.timeout(15000),headers:{"user-agent":"Googlebot"}});
   const html=res.ok ? (await res.text()).slice(0,250000) : "";
   const titlePresent=html.toLowerCase().includes(p.title.toLowerCase().slice(0,15));
   const pricePresent=html.includes(p.price.toFixed(2));
   console.log("MERCHANT_TEST storefront "+p.offerId+" HTTP="+res.status+" title="+titlePresent+" price="+pricePresent+" finalHost="+new URL(res.url).hostname);
   if(res.ok && titlePresent && pricePresent && new URL(res.url).hostname==="shop.ynotworld.app") ready.push({...p,link});
   else console.log("MERCHANT_TEST withheld "+p.offerId+" storefront not confirmed");
  }catch(e){console.log("MERCHANT_TEST withheld "+p.offerId+" storefront check: "+(e?.name||"network_error"));}
 }
 if(!ready.length){console.log("MERCHANT_TEST complete submitted=0: no verified public storefront pages");return;}
 let token;
 try {token=await auth();console.log("MERCHANT_TEST Google OAuth authenticated");}
 catch(e){console.log("MERCHANT_TEST OAuth failed "+String(e.message||e));return;}
 let count=0;
 for(const p of ready) {
  const input={offerId:p.offerId,contentLanguage:"en",feedLabel:"FR",productAttributes:{title:p.title,description:p.description,link:p.link,imageLink:p.image,availability:p.stock>0?"IN_STOCK":"OUT_OF_STOCK",price:{amountMicros:String(Math.round(p.price*1e6)),currencyCode:"EUR"}}};
  const url="https://merchantapi.googleapis.com/products/v1/accounts/"+project+"/productInputs:insert?dataSource=accounts/"+project+"/dataSources/"+source;
  try {
   const res=await fetch(url,{method:"POST",headers:{"authorization":"Bearer "+token,"content-type":"application/json"},body:JSON.stringify(input),signal:AbortSignal.timeout(25000)});
   const json=await res.json().catch(()=>({}));
   if(res.ok){count++;console.log("MERCHANT_TEST inserted "+p.offerId+" status="+res.status+" input="+(json.name||"unnamed"));}
   else console.log("MERCHANT_TEST rejected "+p.offerId+" status="+res.status+" code="+(json.error?.status||"unknown")+" message="+String(json.error?.message||"").slice(0,300));
  } catch(e){console.log("MERCHANT_TEST failed "+p.offerId+" "+(e?.name||"network_error"));}
 }
 console.log("MERCHANT_TEST completed submitted="+count+" attempted="+ready.length);
}
await main();
