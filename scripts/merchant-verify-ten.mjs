import {createSign} from "node:crypto";
const project="5899503459";const targetIds=["ynot-v2-fb0f8bcb85cbbb2cd689ed9e","ynot-v2-abcf872ed467f0d8e1a24e65","ynot-v2-8030dd3d2c7f9e727d263895","ynot-v2-d1eb77ee7d40be30d7bc3123","ynot-v2-ee955767479d8de9a2507165","ynot-v2-3bd5a08f684f644c4df61fba","ynot-v2-73390490053a8a060808af02","ynot-v2-e7844438919d05a8140dc1f5","ynot-v2-21a6457f9693c293c217600d","ynot-v2-f55bfd201346336338f7fb47"];
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
if(process.env.VERCEL_ENV!=="preview")return console.log("MERCHANT_VERIFY skipped non-preview");
let token;try{token=await auth()}catch(e){return console.log("MERCHANT_VERIFY auth "+e.message)}
const url="https://merchantapi.googleapis.com/products/v1/accounts/"+project+"/products?pageSize=100";
try{
const r=await fetch(url,{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(20000)});
const b=await r.json();console.log("MERCHANT_VERIFY status="+r.status+" count="+(b.products||[]).length+" page="+Boolean(b.nextPageToken));
if(!r.ok)return console.log("MERCHANT_VERIFY error "+JSON.stringify(b.error).slice(0,500));
for(const id of targetIds){
const p=(b.products||[]).find(x=>x.offerId===id);
if(!p){console.log("MERCHANT_VERIFY "+id+" not_yet_processed");continue;}
const issues=p.productStatus?.itemLevelIssues||[];
const shipping=p.attributes?.shipping||p.productAttributes?.shipping||[];
const destinations=p.productStatus?.destinationStatuses||[];
console.log("MERCHANT_VERIFY "+JSON.stringify({id,source:p.dataSource,shipping,issues:issues.map(i=>({code:i.code,resolution:i.resolution,severity:i.severity,countries:i.applicableCountries?.includes("FR")?"FR":"other"})),destinations:destinations.map(d=>({context:d.reportingContext,pendingFR:d.pendingCountries?.includes("FR"),approvedFR:d.approvedCountries?.includes("FR"),disapprovedFR:d.disapprovedCountries?.includes("FR")}))}));
}
}catch(e){console.log("MERCHANT_VERIFY error "+String(e.message||e))}
}
await main();