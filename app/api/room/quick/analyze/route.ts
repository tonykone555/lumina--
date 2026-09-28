import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const maxDuration=60;

const GROQ_KEY=process.env.GROQ_API_KEY;
const GEMINI_KEY=process.env.GEMINI_API_KEY||process.env.GOOGLE_GENERATIVE_AI_API_KEY||process.env.GOOGLE_API_KEY;
const GROQ_MODEL=process.env.GROQ_VISION_MODEL?.trim()||"qwen/qwen3.8-27b";
const configuredGemini=process.env.GEMINI_VISION_MODEL?.trim();
const GEMINI_MODELS=[...new Set([configuredGemini,"gemini-3.8-flash","gemini-3.6-flash","gemini-3.5-flash-lite"].filter(Boolean) as string[])];

const schema={type:"object",additionalProperties:false,properties:{sceneTitle:{type:"string"},roomType:{type:"string"},sceneKind:{type:"string"},objects:{type:"array",items:{type:"object",additionalProperties:false,properties:{id:{type:"string"},label:{type:"string"},category:{type:"string"},searchQuery:{type:"string"},alternateQueries:{type:"array",items:{type:"string"}},confidence:{type:"number"},box_2d:{type:"array",items:{type:"integer"}},mask:{type:"array",items:{type:"array",items:{type:"integer"}}}},required:["id","label","category","searchQuery","alternateQueries","confidence","box_2d","mask"]}},suggestionSpots:{type:"array",items:{type:"object",additionalProperties:false,properties:{id:{type:"string"},label:{type:"string"},reason:{type:"string"},suggestedCategories:{type:"array",items:{type:"string"}},searchQuery:{type:"string"},point_2d:{type:"array",items:{type:"integer"}}},required:["id","label","reason","suggestedCategories","searchQuery","point_2d"]}}},required:["sceneTitle","roomType","sceneKind","objects","suggestionSpots"]};
const prompt=`Analyze this image as a universal visual-shopping scene for YNOT. The image may show a room, person/outfit, beauty products, hair, sports equipment, food, electronics, tools, furniture or other everyday purchasable things. Do NOT assume it is an interior.
Return tappable purchasable objects/regions that a shopper could reasonably search, replace, complement or buy. Prefer concrete shopping regions and products. Never infer sensitive traits or health conditions. label must be short and visually grounded. category must be a broad catalogue category. searchQuery should be a useful primary shopping query and must never invent a brand. alternateQueries should contain up to 6 broader/adjacent catalogue searches. box_2d is [ymin,xmin,ymax,xmax], normalized 0-1000. mask is a polygon of [x,y] points normalized 0-1000, or [] when uncertain.
Also return suggestionSpots: contextual places/regions where something useful or complementary could be added even if it is not currently present. Do not suggest unsafe placements or obstruction of doors, walkways, windows or functional areas. point_2d is [x,y], normalized 0-1000. Keep labels concise. Return at most 22 objects and 8 suggestion spots.`;
function valid(x:any){return x&&Array.isArray(x.objects)&&Array.isArray(x.suggestionSpots)}

async function scanGroq(bytes:string,mime:string){
 if(!GROQ_KEY)return {ok:false,error:"Groq is not configured"};
 try{
  const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Authorization":`Bearer ${GROQ_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:GROQ_MODEL,messages:[{role:"user",content:[{type:"text",text:prompt},{type:"image_url",image_url:{url:`data:${mime};base64,${bytes}`}}]}],temperature:0.1,max_completion_tokens:5000,response_format:{type:"json_schema",json_schema:{name:"ynot_room_scan",strict:true,schema}}})});
  const raw=await r.json().catch(()=>({}));if(!r.ok)return {ok:false,error:raw?.error?.message||`Groq ${r.status}`};
  const text=raw?.choices?.[0]?.message?.content;if(typeof text!=="string")return {ok:false,error:"Groq returned no scene analysis"};
  const parsed=JSON.parse(text);return valid(parsed)?{ok:true,data:parsed}:{ok:false,error:"Groq returned an invalid scene analysis"};
 }catch(e){return {ok:false,error:e instanceof Error?e.message:"Groq scanner failed"}}
}
async function scanGemini(bytes:string,mime:string){
 if(!GEMINI_KEY)return {ok:false,error:"Gemini is not configured"};let last="";
 const geminiSchema=JSON.parse(JSON.stringify(schema).replace(/"object"/g,'"OBJECT"').replace(/"string"/g,'"STRING"').replace(/"array"/g,'"ARRAY"').replace(/"integer"/g,'"INTEGER"').replace(/"number"/g,'"NUMBER"'));function strip(o:any){if(o&&typeof o==="object"){delete o.additionalProperties;for(const v of Object.values(o))strip(v)}}strip(geminiSchema);
 for(const model of GEMINI_MODELS){try{const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":GEMINI_KEY},body:JSON.stringify({contents:[{parts:[{text:prompt},{inlineData:{mimeType:mime,data:bytes}}]}],generationConfig:{responseMimeType:"application/json",responseSchema:geminiSchema,temperature:.1}})});const raw=await r.json().catch(()=>({}));if(!r.ok){last=raw?.error?.message||`${model} failed`;continue}const text=raw?.candidates?.[0]?.content?.parts?.find((p:any)=>typeof p?.text==="string")?.text;if(!text){last=`${model} returned no analysis`;continue}const parsed=JSON.parse(text);if(valid(parsed))return {ok:true,data:parsed,model};last=`${model} returned invalid analysis`}catch(e){last=e instanceof Error?e.message:"Gemini scanner failed"}}return {ok:false,error:last||"Gemini scanner failed"}
}
export async function POST(req:NextRequest){
 if(!GROQ_KEY&&!GEMINI_KEY)return NextResponse.json({error:"Image scanning is temporarily unavailable",code:"VISION_NOT_CONFIGURED"},{status:503});
 const form=await req.formData();const image=form.get("image");if(!(image instanceof File)||!image.type.startsWith("image/"))return NextResponse.json({error:"Upload an image"},{status:400});if(image.size>15*1024*1024)return NextResponse.json({error:"Image is too large"},{status:413});
 const bytes=Buffer.from(await image.arrayBuffer()).toString("base64");const groq=await scanGroq(bytes,image.type);if(groq.ok)return NextResponse.json(groq.data,{headers:{"Cache-Control":"no-store","X-YNOT-Scanner":"groq","X-YNOT-Scanner-Model":GROQ_MODEL}});
 const gemini=await scanGemini(bytes,image.type);if(gemini.ok)return NextResponse.json(gemini.data,{headers:{"Cache-Control":"no-store","X-YNOT-Scanner":"gemini","X-YNOT-Scanner-Model":String((gemini as any).model||"")}});
 return NextResponse.json({error:"Could not analyze this photo",code:"VISION_ANALYSIS_FAILED",providers:{groq:groq.error,gemini:gemini.error}},{status:502});
}
