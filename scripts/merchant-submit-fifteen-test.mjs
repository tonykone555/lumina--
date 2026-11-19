// Controlled one-time additional 15-product Merchant Center upload test. Remove the temporary build command after execution.
// Uses only the existing YNOT Shopify selling prices and recorded inventory.
import { createSign } from "node:crypto";
const products = [
  {
    "offerId": "ynot-v2-f7e7cc4e41404f446f3cd9ca",
    "title": "Havoc 1.0 700 Adult Batting Gloves",
    "description": "Classic cricket batting gloves with advanced tri-layer protection and premium materials for pro and club players.",
    "price": 69.85,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/CGBC26Batting_20Gloves_20Havoc_201.0_20700_20Batting_20Glove_20Bottom_20Hand_20Back_20Angle_021452d8-e8b6-4bb4-9a86-c8befc09bf38.jpg?v=1790008305",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-8030dd3d2c7f9e727d263895",
    "title": "7 Litre Slow Cooker",
    "description": "A large-capacity 7L slow cooker with a premium matte black finish, three heat settings, and dishwasher-safe ceramic pot for effortless meal prep an...",
    "price": 61.95,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/7l_slow_cooker_n27720_wbimage.jpg?v=1790008303",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-ee955767479d8de9a2507165",
    "title": "Preset Wired Probe Thermometer",
    "description": "Monitor food temperature inside ovens or grills without opening the door for precise cooking results.",
    "price": 30.53,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/Taylor-1471N-Thermometer_OL-1_57a4fa9c-709e-4109-905f-fc2060c81f1e.jpg?v=1790008302",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-3bd5a08f684f644c4df61fba",
    "title": "Portable Electric Induction Cooktop 2200W Ceramic Infrared Hot Plate with Adjustable Temperature & Dual Touch Rotation Control",
    "description": "A compact 2200W induction cooktop with adjustable temperature and dual touch rotation for versatile home or outdoor cooking.",
    "price": 59.33,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/cfd7ec26b71e78b4acb2562de8f946c6.jpg?v=1790008302",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-73390490053a8a060808af02",
    "title": "Breville The Mix and Store Turbo Hand Mixer",
    "description": "A compact, powerful hand mixer with five speed settings, turbo boost, and easy storage for effortless baking and mixing.",
    "price": 55.85,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/5dfb6e93-ea95-4ff4-bfbe-5ecf61102ae3_44709c35-9115-407e-af79-dc498142403b.png?v=1790008302",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-e7844438919d05a8140dc1f5",
    "title": "Adidas Combat 50 Boxing Gloves - Green",
    "description": "Durable boxing gloves with advanced moisture control and shock-absorbing padding for intense training and competition.",
    "price": 32.29,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/adidas-adidas-combat-50-boxing-gloves-green-1200502816.jpg?v=1790008301",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-21a6457f9693c293c217600d",
    "title": "Gunn & Moore Rival Wicket keeping Gloves",
    "description": "Durable cricket wicketkeeping gloves with superior grip, comfort, and legal specifications for reliable match performance.",
    "price": 56.03,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/rival_wkt_glove_thumb_2000pxl_2_900x_5b27a97b-3ade-4cde-93e0-d46793c423c4.webp?v=1790008300",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-f55bfd201346336338f7fb47",
    "title": "Taylor Digital Wired Probe Thermometer",
    "description": "Digital probe thermometer with timer and dual temperature display for precise cooking without opening the oven door.",
    "price": 28.75,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/cfn-1470n-lifestyle-zoomed__80225.1626180403.1280.1280.jpg?v=1790008299",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-1ed7cd31c166b96601a20b3b",
    "title": "SS Clublite Cricket Batting Gloves - Adult",
    "description": "Lightweight cricket batting gloves offering reliable protection and comfort for club and recreational players.",
    "price": 35.78,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/SS-Clublite-Cricket-Batting-Gloves-2019-2025-Main.jpg?v=1790008298",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-8f438f86d657c235d4289d0b",
    "title": "Davis & Waddell Atlas Electronic Kitchen Scale Black",
    "description": "A durable electronic kitchen scale with a large backlit display, tare function, and 5 kg capacity for precise food preparation.",
    "price": 34.03,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/bjkcmkmcot99grntobzd.jpg?v=1790008298",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-758196f3f444bbc87298e1e7",
    "title": "Traeger Instant Read Thermometer",
    "description": "Quickly and accurately measure food temperatures with a large LCD display and built-in food safety chart.",
    "price": 43.63,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/61071953-78ae-4df6-b43f-e389ca0adfbd.png?v=1790008298",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-16010d1586956642a34ca53d",
    "title": "O'Neill Epic 3mm SL Wetsuit Gloves - Black",
    "description": "Super warm 3mm neoprene gloves designed for comfort, grip, and flexibility during water sports.",
    "price": 30.54,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/1694300193438694_1.jpg?v=1790008297",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-d8c0ff6531a78c3bd7fbfce2",
    "title": "New Balance Chamois Wicket keeping Inner Gloves",
    "description": "Chamois leather padded wicket keeping gloves with soft foam inner for comfort and protection.",
    "price": 20.19,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/1_700x_9b7ad91b-7557-497f-badb-c057e18d6ebc.webp?v=1790008292",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-af99934940fd6273625821bb",
    "title": "Warrior Nemesis Lacrosse Field Goalie Gloves – 2019 Model",
    "description": "High-protection lacrosse goalie gloves designed for elite-level performance, mobility, and stick feel.",
    "price": 63.7,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/Warrior-Nemesis-Lacrosse-Goalie-Gloves-_19-Model-Black_747d6450-0982-4f5d-b924-63ebc7ae6945.webp?v=1790008292",
    "stock": 10
  },
  {
    "offerId": "ynot-v2-4f624991a2fc9393e4ae771a",
    "title": "Flashbomb 2MM GB Hood",
    "description": "A high-performance neoprene surf hood designed to keep you warm and dry in the coldest water conditions.",
    "price": 61.04,
    "image": "https://cdn.shopify.com/s/files/1/1023/7453/9590/files/WHOYIM_0090-1.jpg?v=1790008295",
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
 if(process.env.VERCEL_ENV!=="preview") {console.log("MERCHANT_15 skipped: not preview");return;}
 if(process.env.GOOGLE_MERCHANT_ACCOUNT_ID!==project||process.env.GOOGLE_MERCHANT_DATA_SOURCE_ID!==source) {
  console.log("MERCHANT_15 skipped: configured account or data source mismatch");return;
 }
 const ready=[];
 for(const p of products) {
  const link="https://shop.ynotworld.app/products/"+p.offerId;
  try {
   const res=await fetch(link,{redirect:"follow",signal:AbortSignal.timeout(15000),headers:{"user-agent":"Googlebot"}});
   const html=res.ok ? (await res.text()).slice(0,250000) : "";
   const titlePresent=html.toLowerCase().includes(p.title.toLowerCase().slice(0,15));
   const pricePresent=html.includes(p.price.toFixed(2));
   console.log("MERCHANT_15 storefront "+p.offerId+" HTTP="+res.status+" title="+titlePresent+" price="+pricePresent+" finalHost="+new URL(res.url).hostname);
   if(res.ok && titlePresent && pricePresent && new URL(res.url).hostname==="shop.ynotworld.app") ready.push({...p,link});
   else console.log("MERCHANT_15 withheld "+p.offerId+" storefront not confirmed");
  }catch(e){console.log("MERCHANT_15 withheld "+p.offerId+" storefront check: "+(e?.name||"network_error"));}
 }
 if(!ready.length){console.log("MERCHANT_15 complete submitted=0: no verified public storefront pages");return;}
 let token;
 try {token=await auth();console.log("MERCHANT_15 Google OAuth authenticated");}
 catch(e){console.log("MERCHANT_15 OAuth failed "+String(e.message||e));return;}
 let count=0;
 for(const p of ready) {
  const input={offerId:p.offerId,contentLanguage:"en",feedLabel:"FR",productAttributes:{title:p.title,description:p.description,link:p.link,imageLink:p.image,availability:p.stock>0?"IN_STOCK":"OUT_OF_STOCK",price:{amountMicros:String(Math.round(p.price*1e6)),currencyCode:"EUR"}}};
  const url="https://merchantapi.googleapis.com/products/v1/accounts/"+project+"/productInputs:insert?dataSource=accounts/"+project+"/dataSources/"+source;
  try {
   const res=await fetch(url,{method:"POST",headers:{"authorization":"Bearer "+token,"content-type":"application/json"},body:JSON.stringify(input),signal:AbortSignal.timeout(25000)});
   const json=await res.json().catch(()=>({}));
   if(res.ok){count++;console.log("MERCHANT_15 inserted "+p.offerId+" status="+res.status+" input="+(json.name||"unnamed"));}
   else console.log("MERCHANT_15 rejected "+p.offerId+" status="+res.status+" code="+(json.error?.status||"unknown")+" message="+String(json.error?.message||"").slice(0,300));
  } catch(e){console.log("MERCHANT_15 failed "+p.offerId+" "+(e?.name||"network_error"));}
 }
 console.log("MERCHANT_15 completed submitted="+count+" attempted="+ready.length);
}
await main();
