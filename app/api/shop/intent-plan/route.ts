import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const maxDuration=60;

const MODEL=String(process.env.GEMINI_GROWTH_MODEL||"gemini-3.6-flash").trim();

function clean(value:unknown){return String(value??"").replace(/\s+/g," ").trim()}
function unique(values:string[]){const seen=new Set<string>();return values.map(clean).filter(Boolean).filter(value=>{const key=value.toLowerCase();if(seen.has(key))return false;seen.add(key);return true})}

function fallbackPlan(input:{query:string;category:string;tags:string[]}){
 const root=clean(input.query||input.category||input.tags[0]||"products");
 const tags=unique(input.tags).slice(0,8);
 const searches=unique([root,...tags.map(tag=>`${root} ${tag}`)]).slice(0,8);
 return{intent:root,searches,clusters:searches.map((query,index)=>({label:tags[index-1]||root,query})),combined_query:unique([root,...tags]).join(" ")};
}

async function geminiPlan(input:{source:string;query:string;category:string;tags:string[];country:string}){
 const key=String(process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||"").trim();
 if(!key)return fallbackPlan(input);
 const prompt=`You are the shopping-intent planner for YNOT, a product-discovery engine. Turn one user shopping signal into a diverse but precise catalogue search plan. The signal can come from a typed search, a category click, or selected tags.\n\nSOURCE: ${input.source}\nQUERY: ${input.query||""}\nCATEGORY: ${input.category||""}\nTAGS: ${JSON.stringify(input.tags||[])}\nCOUNTRY: ${input.country}\n\nReturn ONLY JSON in this shape:\n{"intent":"short human-readable intent","searches":["specific catalogue query",...],"clusters":[{"label":"short product type","query":"specific catalogue query"},...],"combined_query":"single natural-language query containing the most important product types and constraints"}\n\nRules:\n- Produce 6 to 10 materially different product-type searches when the intent is broad enough.\n- Expand broad categories into useful subtypes. Example: furniture can include sofas, armchairs, coffee tables, dining tables, shelving, storage, beds, desks, lighting or rugs depending on intent.\n- Preserve explicit style, colour, budget, audience, use-case and geography constraints.\n- Do not invent brands unless the user explicitly gave one.\n- Do not invent products. You are only creating queries for the real YNOT catalogue.\n- Avoid near-duplicate searches.\n- combined_query should remain readable and be suitable for YNOT's existing semantic catalogue search.\n- Keep each search under 90 characters and combined_query under 260 characters.`;
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(key)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json"}}),cache:"no-store",signal:AbortSignal.timeout(45000)});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(String(body?.error?.message||`Gemini ${response.status}`));
 const raw=(body?.candidates?.[0]?.content?.parts||[]).map((part:any)=>part?.text||"").join("").replace(/^```json\s*/i,"").replace(/```$/i,"").trim();
 const parsed=JSON.parse(raw||"{}");
 const searches=unique(Array.isArray(parsed?.searches)?parsed.searches:[]).slice(0,10);
 const clusters=Array.isArray(parsed?.clusters)?parsed.clusters.map((item:any)=>({label:clean(item?.label),query:clean(item?.query)})).filter((item:any)=>item.label&&item.query).slice(0,10):[];
 const fallback=fallbackPlan(input);
 return{
  intent:clean(parsed?.intent)||fallback.intent,
  searches:searches.length?searches:fallback.searches,
  clusters:clusters.length?clusters:fallback.clusters,
  combined_query:clean(parsed?.combined_query)||searches.slice(0,8).join(" ")||fallback.combined_query
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
