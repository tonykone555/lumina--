import { createSign } from "node:crypto";
const project="5899503459";
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

async function main(){
if(process.env.VERCEL_ENV!=="preview"){console.log("MERCHANT_DIAG skip environment");return;}
if(process.env.GOOGLE_MERCHANT_ACCOUNT_ID!==project){console.log("MERCHANT_DIAG wrong account env");return;}
let token;try{token=await auth()}catch(e){console.log("MERCHANT_DIAG auth error "+e.message);return;}
const endpoints=[["products","https://merchantapi.googleapis.com/products/v1/accounts/"+project+"/products?pageSize=100"],["source","https://merchantapi.googleapis.com/datasources/v1/accounts/"+project+"/dataSources/10797727768"]];
for(const [tag,url] of endpoints){try{const r=await fetch(url,{headers:{authorization:"Bearer "+token},signal:AbortSignal.timeout(20000)});const body=await r.json();console.log("MERCHANT_DIAG "+tag+" HTTP="+r.status);if(!r.ok){console.log("MERCHANT_DIAG "+tag+" error="+JSON.stringify(body.error||{}).slice(0,500));continue;}
if(tag==="products"){const p=body.products||[];console.log("MERCHANT_DIAG count="+p.length+" next="+Boolean(body.nextPageToken));for(const x of p.slice(0,20))console.log("MERCHANT_DIAG product "+JSON.stringify({name:x.name,offerId:x.offerId,feedLabel:x.feedLabel,dataSource:x.dataSource,attributes:x.attributes?.title||x.productAttributes?.title,status:x.productStatus,issues:x.productStatus?.itemLevelIssues}).slice(0,1100));}
else console.log("MERCHANT_DIAG source "+JSON.stringify({name:body.name,displayName:body.displayName,primaryProductDataSource:body.primaryProductDataSource,input:body.input,defaultRule:body.defaultRule}).slice(0,1000));
}catch(e){console.log("MERCHANT_DIAG "+tag+" failure "+e.message);}}
}
await main();