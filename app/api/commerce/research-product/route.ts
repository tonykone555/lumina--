import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";

const cache=new Map<string,{description:string;sources:string[];rating:number|null;reviewCount:number;at:number}>();
const TTL=1000*60*60*24*7;

function apiKey(){return String(process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||"").trim()}
function cleanText(value:any):string{
 if(value==null)return"";
 if(typeof value==="object"){
  if(Array.isArray(value))return value.map(cleanText).filter(Boolean).join(" ");
  return cleanText(value.description??value.text??value.plain??value.value??value.html??"");
 }
 const s=String(value).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
 if(!s||/^\[object Object\]$/i.test(s)||/^object object$/i.test(s))return"";
 return s;
}
function parseJson(raw:string){
 const text=String(raw||"").trim().replace(/^\`\`\`json\s*/i,"").replace(/\`\`\`$/,"").trim();
 try{return JSON.parse(text)}catch{}
 const a=text.indexOf("{"),b=text.lastIndexOf("}");
 if(a>=0&&b>a)try{return JSON.parse(text.slice(a,b+1))}catch{}
 return null;
}

export async function POST(req:NextRequest){
 try{
  const body=await req.json();
  const title=cleanText(body?.title),brand=cleanText(body?.brand),url=cleanText(body?.url),catalogue=cleanText(body?.description);
  if(!title)return NextResponse.json({found:false,description:"",sources:[],reason:"TITLE_REQUIRED"},{status:400});
  const key=[title.toLowerCase(),brand.toLowerCase(),url].join("|");
  const hit=cache.get(key);
  if(hit&&Date.now()-hit.at<TTL)return NextResponse.json({found:Boolean(hit.description||hit.rating||hit.reviewCount),description:hit.description,sources:hit.sources,rating:hit.rating,reviewCount:hit.reviewCount,cached:true,enrichedBy:"gemini-search"});
  const keyValue=apiKey();
  if(!keyValue)return NextResponse.json({found:false,description:"",sources:[],reason:"GEMINI_NOT_CONFIGURED"});

  const model=String(process.env.GEMINI_PRODUCT_RESEARCH_MODEL||"gemini-2.5-flash").trim();
  const prompt=`Research ONLY this exact ecommerce item for YNOT.
TITLE: ${title}
BRAND: ${brand||"Unknown"}
MERCHANT URL: ${url||"Unknown"}
CATALOGUE DESCRIPTION: ${catalogue||"None"}

Use Google Search grounding to verify the exact item. Do not substitute a similar product, another model, another size, or another brand. If exact identity cannot be verified, return found=false. Never mention or infer price, availability, shipping, reviews, warranty, medical claims, or specifications unless clearly verified for this exact item. Do not invent materials or features.

Return ONLY JSON:\n{"found":true|false,"description":"2-4 concise factual sentences suitable for an About this product section","rating":4.7,"reviewCount":286,"reason":""}\nThe description must add useful verified information beyond the supplied catalogue text where possible. For rating and reviewCount, use ONLY an exact-product rating/count you can verify from a merchant, retailer, manufacturer, or trusted review source for this exact item. Never estimate, average across similar products, or invent values. Use null and 0 when no exact rating/count is verifiable. If neither useful exact description nor exact review data is found, return found=false.`;

  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(keyValue)}`,{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({
    contents:[{role:"user",parts:[{text:prompt}]}],
    tools:[{google_search:{}}],
    generationConfig:{responseMimeType:"application/json",temperature:0.1}
   }),
   cache:"no-store",
   signal:AbortSignal.timeout(20000)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok)return NextResponse.json({found:false,description:"",sources:[],reason:"GEMINI_SEARCH_FAILED",status:r.status},{status:200});
  const raw=(data?.candidates?.[0]?.content?.parts||[]).map((p:any)=>p?.text||"").join("");
  const parsed=parseJson(raw)||{};
  const description=cleanText(parsed?.description);
  const found=Boolean(parsed?.found&&description);
  const chunks=data?.candidates?.[0]?.groundingMetadata?.groundingChunks||[];
  const sources=[...new Set<string>(chunks.map((c:any)=>String(c?.web?.uri||"")).filter((u:string)=>/^https?:\/\//i.test(u)))].slice(0,6);
  if(found)cache.set(key,{description,sources,at:Date.now()});
  return NextResponse.json({found,description:found?description:"",sources,enrichedBy:found?"gemini-search":"none",reason:cleanText(parsed?.reason)});
 }catch(e){
  return NextResponse.json({found:false,description:"",sources:[],reason:e instanceof Error?e.message:"GEMINI_PRODUCT_RESEARCH_FAILED"},{status:200});
 }
}
