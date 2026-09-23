import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const maxDuration=60;

const MODEL=String(process.env.GEMINI_GROWTH_MODEL||"gemini-3.6-flash").trim();

function clean(value:unknown){return String(value??"").replace(/\s+/g," ").trim()}
function unique(values:string[]){const seen=new Set<string>();return values.map(clean).filter(Boolean).filter(value=>{const key=value.toLowerCase();if(seen.has(key))return false;seen.add(key);return true})}

function fallbackPlan(input:{query:string;category:string;tags:string[]}){
 const root=clean(input.query||input.category||input.tags[0]||"products");
 const tags=unique(input.tags).slice(0,5);
 const searches=unique([root,...tags.map(tag=>`${root} ${tag}`)]).slice(0,5);
 return{intent:root,searches,clusters:searches.map((query,index)=>({label:tags[index-1]||root,query})),combined_query:root};
}

async function geminiPlan(input:{source:string;query:string;category:string;tags:string[];country:string}){
 const key=String(process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||"").trim();
 if(!key)return fallbackPlan(input);
 const prompt=`You are the shopping-intent planner for YNOT, a product-discovery engine. Expand one shopping signal into a small, tightly related catalogue plan. Your job is NOT to broaden the category or replace the shopper's original request.\n\nSOURCE: ${input.source}\nQUERY: ${input.query||""}\nCATEGORY: ${input.category||""}\nTAGS: ${JSON.stringify(input.tags||[])}\nCOUNTRY: ${input.country}\n\nReturn ONLY JSON in this shape:\n{"intent":"short human-readable intent","searches":["specific catalogue query",...],"clusters":[{"label":"short product type","query":"specific catalogue query"},...],"combined_query":"the shopper's original intent, kept concise"}\n\nRules:\n- Treat QUERY/CATEGORY/TAGS as hard constraints, not inspiration.\n- Never jump to an adjacent category. Skincare stays skincare; furniture stays furniture; running shoes stay running shoes.\n- Keep the exact requested product/category as the anchor of every search.\n- Produce only 3 to 5 useful subtypes when the intent is broad. For a narrow request, produce fewer.\n- Subtypes must be products a shopper would reasonably expect inside that exact category.\n- Preserve explicit style, colour, budget, audience, use-case and geography constraints.\n- Do not invent brands unless the user explicitly gave one.\n- Do not invent products; queries are only for the real YNOT catalogue.\n- Avoid near-duplicates, trend words, vague discovery phrases and cross-category suggestions.\n- combined_query must stay close to the original signal and MUST NOT concatenate a long list of subcategories.\n- Keep each search under 80 characters and combined_query under 140 characters.`;
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(key)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json"}}),cache:"no-store",signal:AbortSignal.timeout(45000)});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(String(body?.error?.message||`Gemini ${response.status}`));
 const raw=(body?.candidates?.[0]?.content?.parts||[]).map((part:any)=>part?.text||"").join("").replace(/^```json\s*/i,"").replace(/```$/i,"").trim();
 const parsed=JSON.parse(raw||"{}");
 const searches=unique(Array.isArray(parsed?.searches)?parsed.searches:[]).slice(0,5);
 const clusters=Array.isArray(parsed?.clusters)?parsed.clusters.map((item:any)=>({label:clean(item?.label),query:clean(item?.query)})).filter((item:any)=>item.label&&item.query).slice(0,5):[];
 const fallback=fallbackPlan(input);
 const original=clean(input.query||input.category||input.tags.join(" "));
 return{
  intent:clean(parsed?.intent)||fallback.intent,
  searches:searches.length?searches:fallback.searches,
  clusters:clusters.length?clusters:fallback.clusters,
  combined_query:original||clean(parsed?.combined_query)||fallback.combined_query
 };
}

export async function POST(req:NextRequest){
 try{
  const body=await req.json().catch(()=>({}));
  const source=["search","category","tags","deep-link"].includes(clean(body?.source))?clean(body.source):"search";
  const input={source,query:clean(body?.query).slice(0,240),category:clean(body?.category).slice(0,120),tags:Array.isArray(body?.tags)?unique(body.tags).slice(0,12):[],country:(clean(body?.country)||"FR").toUpperCase().slice(0,2)};
  if(!input.query&&!input.category&&!input.tags.length)return NextResponse.json({error:"SHOP_INTENT_EMPTY"},{status:400});
  let plan;
  try{plan=await geminiPlan(input)}catch{plan=fallbackPlan(input)}
  return NextResponse.json({ok:true,source,...plan});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"SHOP_INTENT_PLAN_FAILED"},{status:500})}
}
