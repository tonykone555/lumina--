// Controlled one-time Merchant Center upload test. Remove the temporary build command after execution.
// Uses only the existing YNOT Shopify selling prices and recorded inventory.
import { createSign } from "node:crypto";
const products = [
  {
    "offerId": "ynot-v2-fb0f8bcb85cbbb2cd689ed9e",
    "handle": "ynot-v2-fb0f8bcb85cbbb2cd689ed9e",
    "title": "11 lb Dual Platform Kitchen Scale",
    "description": "Dual platform digital kitchen scale measures two ingredients simultaneously with independent tare buttons for precise, easy cooking.",
    "price": 33.15,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/5322736_TopDown_3000px.jpg?v=1790008306",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-abcf872ed467f0d8e1a24e65",
    "handle": "ynot-v2-abcf872ed467f0d8e1a24e65",
    "title": "22 lb Waterproof Digital Kitchen Scale",
    "description": "A waterproof digital kitchen scale with a marble-veined design, offering precise measurements and easy cleaning for any kitchen.",
    "price": 28.79,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/5330233_TopDown_3000px.jpg?v=1790008305",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-8030dd3d2c7f9e727d263895",
    "handle": "ynot-v2-8030dd3d2c7f9e727d263895",
    "title": "7 Litre Slow Cooker",
    "description": "A large-capacity 7L slow cooker with a premium matte black finish, three heat settings, and dishwasher-safe ceramic pot for effortless meal prep.",
    "price": 61.95,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/7l_slow_cooker_n27720_wbimage.jpg?v=1790008303",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-d1eb77ee7d40be30d7bc3123",
    "handle": "ynot-v2-d1eb77ee7d40be30d7bc3123",
    "title": "Portable Electric Induction Cooktop 2200W Ceramic Infrared Hot Plate with Adjustable Temperature & Dual Touch Rotation Control – Single Burner Electric Stove for Home Dorm Cooking",
    "description": "A compact 2200W ceramic induction cooktop with dual touch controls for efficient, precise cooking anywhere.",
    "price": 59.33,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/cfd7ec26b71e78b4acb2562de8f946c6_e3818453-4ff4-41f7-9169-fa76540703c3.jpg?v=1790008303",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-ee955767479d8de9a2507165",
    "handle": "ynot-v2-ee955767479d8de9a2507165",
    "title": "Preset Wired Probe Thermometer",
    "description": "Monitor food temperature inside ovens or grills without opening the door for precise cooking results.",
    "price": 30.53,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/Taylor-1471N-Thermometer_OL-1_57a4fa9c-709e-4109-905f-fc2060c81f1e.jpg?v=1790008302",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-3bd5a08f684f644c4df61fba",
    "handle": "ynot-v2-3bd5a08f684f644c4df61fba",
    "title": "Portable Electric Induction Cooktop 2200W Ceramic Infrared Hot Plate with Adjustable Temperature & Dual Touch Rotation Control",
    "description": "A compact 2200W induction cooktop with adjustable temperature and dual touch rotation for versatile home or outdoor cooking.",
    "price": 59.33,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/cfd7ec26b71e78b4acb2562de8f946c6.jpg?v=1790008302",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-73390490053a8a060808af02",
    "handle": "ynot-v2-73390490053a8a060808af02",
    "title": "Breville The Mix and Store Turbo Hand Mixer",
    "description": "A compact, powerful hand mixer with five speed settings, turbo boost, and easy storage for effortless baking and mixing.",
    "price": 55.85,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/5dfb6e93-ea95-4ff4-bfbe-5ecf61102ae3_44709c35-9115-407e-af79-dc498142403b.png?v=1790008302",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-e7844438919d05a8140dc1f5",
    "handle": "ynot-v2-e7844438919d05a8140dc1f5",
    "title": "Adidas Combat 50 Boxing Gloves - Green",
    "description": "Durable boxing gloves with advanced moisture control and shock-absorbing padding for intense training and competition.",
    "price": 32.29,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/adidas-adidas-combat-50-boxing-gloves-green-1200502816.jpg?v=1790008301",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-21a6457f9693c293c217600d",
    "handle": "ynot-v2-21a6457f9693c293c217600d",
    "title": "Gunn & Moore Rival Wicket keeping Gloves",
    "description": "Durable cricket wicketkeeping gloves with superior grip, comfort, and legal specifications for reliable match performance.",
    "price": 56.03,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/rival_wkt_glove_thumb_2000pxl_2_900x_5b27a97b-ade5-4cde-93e0-d46793c423c4.webp?v=1790008300",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-f55bfd201346336338f7fb47",
    "handle": "ynot-v2-f55bfd201346336338f7fb47",
    "title": "Taylor Digital Wired Probe Thermometer",
    "description": "Digital probe thermometer with timer and dual temperature display for precise cooking without opening the oven door.",
    "price": 28.75,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/cfn-1470n-lifestyle-zoomed__80225.1626180403.1280.1280.jpg?v=1790008299",
    "stock": 10
  }
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
 if(process.env.VERCEL_ENV!=="preview") {console.log("MERCHANT_SHIPPING_TEST skipped: not preview");return;}
 if(process.env.GOOGLE_MERCHANT_ACCOUNT_ID!==project||process.env.GOOGLE_MERCHANT_DATA_SOURCE_ID!==source) {
  console.log("MERCHANT_TEN skipped: configured account or data source mismatch");return;
 }
 const ready=[];
 for(const p of products) {
  const link="https://shop.ynotworld.app/products/"+p.handle;
  try {
   const res=await fetch(link,{redirect:"follow",signal:AbortSignal.timeout(15000),headers:{"user-agent":"Googlebot"}});
   const html=res.ok ? (await res.text()).slice(0,250000) : "";
   const titlePresent=html.toLowerCase().includes(p.title.toLowerCase().slice(0,15));
   const pricePresent=html.includes(p.price.toFixed(2));
   console.log("MERCHANT_TEN storefront "+p.offerId+" HTTP="+res.status+" title="+titlePresent+" price="+pricePresent+" finalHost="+new URL(res.url).hostname);
   if(res.ok && titlePresent && pricePresent && new URL(res.url).hostname==="shop.ynotworld.app") ready.push({...p,link});
   else console.log("MERCHANT_TEN withheld "+p.offerId+" storefront not confirmed");
  }catch(e){console.log("MERCHANT_TEN withheld "+p.offerId+" storefront check: "+(e?.name||"network_error"));}
 }
 if(!ready.length){console.log("MERCHANT_TEN complete submitted=0: no verified public storefront pages");return;}
 let token;
 try {token=await auth();console.log("MERCHANT_TEN Google OAuth authenticated");}
 catch(e){console.log("MERCHANT_TEN OAuth failed "+String(e.message||e));return;}
 let count=0;
 for(const p of ready) {
  const input={offerId:p.offerId,contentLanguage:"en",feedLabel:"FR",productAttributes:{title:p.title,description:p.description,link:p.link,imageLink:p.image,availability:p.stock>0?"IN_STOCK":"OUT_OF_STOCK",price:{amountMicros:String(Math.round(p.price*1e6)),currencyCode:"EUR"},shipping:[{country:"FR",service:"Standard",price:{amountMicros:"7990000",currencyCode:"EUR"}}]}};
  const url="https://merchantapi.googleapis.com/products/v1/accounts/"+project+"/productInputs:insert?dataSource=accounts/"+project+"/dataSources/"+source;
  try {
   const res=await fetch(url,{method:"POST",headers:{"authorization":"Bearer "+token,"content-type":"application/json"},body:JSON.stringify(input),signal:AbortSignal.timeout(25000)});
   const json=await res.json().catch(()=>({}));
   if(res.ok){count++;console.log("MERCHANT_TEN inserted "+p.offerId+" status="+res.status+" input="+(json.name||"unnamed"));}
   else console.log("MERCHANT_TEN rejected "+p.offerId+" status="+res.status+" code="+(json.error?.status||"unknown")+" message="+String(json.error?.message||"").slice(0,300));
  } catch(e){console.log("MERCHANT_TEN failed "+p.offerId+" "+(e?.name||"network_error"));}
 }
 console.log("MERCHANT_TEN completed submitted="+count+" attempted="+ready.length);
}
await main();
