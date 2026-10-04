import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const maxDuration=60;

const GEMINI_KEY=process.env.GEMINI_API_KEY||process.env.GOOGLE_GENERATIVE_AI_API_KEY||process.env.GOOGLE_API_KEY;
const configuredGemini=process.env.GEMINI_VISION_MODEL?.trim();
const GEMINI_MODELS=[...new Set([configuredGemini,"gemini-3.8-flash","gemini-3.6-flash","gemini-3.5-flash"].filter(Boolean) as string[])];

const schema={type:"object",additionalProperties:false,properties:{sceneTitle:{type:"string"},roomType:{type:"string"},sceneKind:{type:"string"},sceneDescription:{type:"string"},styleDescription:{type:"string"},opportunitySummary:{type:"string"},objects:{type:"array",items:{type:"object",additionalProperties:false,properties:{id:{type:"string"},label:{type:"string"},category:{type:"string"},searchQuery:{type:"string"},alternateQueries:{type:"array",items:{type:"string"}},confidence:{type:"number"},box_2d:{type:"array",items:{type:"integer"}},mask:{type:"array",items:{type:"array",items:{type:"integer"}}}},required:["id","label","category","searchQuery","alternateQueries","confidence","box_2d","mask"]}},suggestionSpots:{type:"array",items:{type:"object",additionalProperties:false,properties:{id:{type:"string"},label:{type:"string"},reason:{type:"string"},suggestedCategories:{type:"array",items:{type:"string"}},searchQuery:{type:"string"},point_2d:{type:"array",items:{type:"integer"}}},required:["id","label","reason","suggestedCategories","searchQuery","point_2d"]}}},required:["sceneTitle","roomType","sceneKind","sceneDescription","styleDescription","opportunitySummary","objects","suggestionSpots"]};

const prompt=`Analyze this image as a visual-shopping scene for YNOT. Detect MULTIPLE useful VISIBLE purchasable products and independently shoppable aspects/components whenever they are genuinely visible. The image may contain furniture, clothing, electronics, beauty products, sports equipment, tools, decor or other purchasable items. Do not assume it is an interior.
Understand the whole image first. sceneTitle is a short natural title. sceneDescription briefly describes only what is visibly present. styleDescription describes the visible aesthetic when supported. If a person is present, describe only visible outfit/style and items; never infer identity, age, ethnicity, health, personality, income, occupation or other sensitive traits. opportunitySummary is one concise shopping insight about what YNOT could add, replace, complement or help discover. Do not criticize the person or home.
IMPORTANT: do not stop after finding only the dominant product. Inspect the full image and return every clearly distinct useful shopping target you can ground visually, up to 14. For a product made of separately purchasable visible components/accessories, those components may be separate detections when a shopper could reasonably search for them independently (for example: sofa + cushions, bed + bedding/pillows, outfit + jacket/bag/watch, desk + lamp/monitor/keyboard, bicycle + helmet/light/bag). Do NOT invent hidden components, split a single indivisible product into meaningless pieces, or create duplicate detections of the same target.
For each detected shopping target return one tight box around that exact visible target. box_2d MUST be [ymin,xmin,ymax,xmax], normalized 0-1000. Prefer spatially distinct boxes; overlapping boxes are allowed only when they represent genuinely different independently shoppable targets. Do not create grids, duplicate objects, background regions, empty-space detections or arbitrary points. Return only visually grounded objects.
label should identify the item specifically using visible product type, style/material/form and color when useful. Include branding/model only when clearly legible; never guess brands. searchQuery should be a concise catalogue-ready query for THAT exact target, preserving the strongest visible attributes. alternateQueries should contain 3-5 useful progressively broader ways to find the same target, not unrelated products. category is broad. mask is a polygon of [x,y] normalized 0-1000 or [] if uncertain.
Return at most 4 genuinely useful suggestionSpots for empty locations, point_2d [x,y] normalized 0-1000, never on top of detected products. Return up to 14 detected objects and aim for multiple detections whenever the image visibly contains multiple independently shoppable targets.`;

function clamp(n:any){const x=Number(n);return Number.isFinite(x)?Math.max(0,Math.min(1000,Math.round(x))):0}
function text(v:any,fallback=""){return typeof v==="string"?v:fallback}
function strings(v:any){return Array.isArray(v)?v.filter((x:any)=>typeof x==="string"&&x.trim()).map((x:string)=>x.trim()):[]}
function normalize(raw:any){
  const x=raw&&typeof raw==="object"?raw:{};
  const seen=new Set<string>();
  const objects=(Array.isArray(x.objects)?x.objects:[]).map((o:any,i:number)=>{
    const box=Array.isArray(o?.box_2d)&&o.box_2d.length===4?o.box_2d.map(clamp):[0,0,0,0];
    return {id:text(o?.id,`object-${i}`),label:text(o?.label,"Item"),category:text(o?.category,"shopping"),searchQuery:text(o?.searchQuery,text(o?.label,"item")),alternateQueries:strings(o?.alternateQueries).slice(0,5),confidence:Number.isFinite(Number(o?.confidence))?Number(o.confidence):0,box_2d:box,mask:Array.isArray(o?.mask)?o.mask:[]};
  }).filter((o:any)=>{const [y1,x1,y2,x2]=o.box_2d;const key=`${o.label.toLowerCase()}|${Math.round(x1/20)}|${Math.round(y1/20)}|${Math.round(x2/20)}|${Math.round(y2/20)}`;if(seen.has(key))return false;seen.add(key);return y2>y1&&x2>x1&&(y2-y1)>8&&(x2-x1)>8&&o.searchQuery}).slice(0,14);
  const suggestionSpots=(Array.isArray(x.suggestionSpots)?x.suggestionSpots:[]).map((s:any,i:number)=>({id:text(s?.id,`spot-${i}`),label:text(s?.label,"Suggestion"),reason:text(s?.reason,""),suggestedCategories:strings(s?.suggestedCategories),searchQuery:text(s?.searchQuery,text(s?.label,"home decor")),point_2d:Array.isArray(s?.point_2d)&&s.point_2d.length>=2?[clamp(s.point_2d[0]),clamp(s.point_2d[1])]:[]})).filter((s:any)=>s.point_2d.length===2&&s.searchQuery);
  return {sceneTitle:text(x.sceneTitle,"Your space"),roomType:text(x.roomType,""),sceneKind:text(x.sceneKind,""),sceneDescription:text(x.sceneDescription,""),styleDescription:text(x.styleDescription,""),opportunitySummary:text(x.opportunitySummary,""),objects,suggestionSpots};
}
function valid(x:any){return !!(x&&Array.isArray(x.objects)&&x.objects.length>0&&Array.isArray(x.suggestionSpots))}

async function scanGemini(bytes:string,mime:string){
  if(!GEMINI_KEY)return {ok:false as const,error:"Gemini is not configured"};
  let last="";
  const geminiSchema=JSON.parse(JSON.stringify(schema).replace(/"object"/g,'"OBJECT"').replace(/"string"/g,'"STRING"').replace(/"array"/g,'"ARRAY"').replace(/"integer"/g,'"INTEGER"').replace(/"number"/g,'"NUMBER"'));
  function strip(o:any){if(o&&typeof o==="object"){delete o.additionalProperties;for(const v of Object.values(o))strip(v)}}
  strip(geminiSchema);
  for(const model of GEMINI_MODELS){
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:"POST",signal:controller.signal,headers:{"Content-Type":"application/json","x-goog-api-key":GEMINI_KEY},body:JSON.stringify({contents:[{parts:[{text:prompt},{inlineData:{mimeType:mime,data:bytes}}]}],generationConfig:{responseMimeType:"application/json",responseSchema:geminiSchema,temperature:0,thinkingConfig:{thinkingLevel:"minimal"}}})});
      const raw=await r.json().catch(()=>({}));
      if(!r.ok){last=raw?.error?.message||`${model} failed`;continue}
      const answer=raw?.candidates?.[0]?.content?.parts?.find((p:any)=>typeof p?.text==="string")?.text;
      if(!answer){last=`${model} returned no analysis`;continue}
      const parsed=normalize(JSON.parse(answer));
      if(valid(parsed))return {ok:true as const,data:parsed,model};
      last=`${model} returned no usable detected objects`;
    }catch(e){last=e instanceof Error?(e.name==="AbortError"?`${model} timed out`:e.message):"Gemini scanner failed"}finally{clearTimeout(timeout)}
  }
  return {ok:false as const,error:last||"Gemini scanner failed"};
}

export async function POST(req:NextRequest){
  if(!GEMINI_KEY)return NextResponse.json({error:"Image scanning is temporarily unavailable",code:"VISION_NOT_CONFIGURED"},{status:503});
  const form=await req.formData();const image=form.get("image");
  if(!(image instanceof File)||!image.type.startsWith("image/"))return NextResponse.json({error:"Upload an image"},{status:400});
  if(image.size>15*1024*1024)return NextResponse.json({error:"Image is too large"},{status:413});
  const bytes=Buffer.from(await image.arrayBuffer()).toString("base64");
  const gemini=await scanGemini(bytes,image.type);
  if(gemini.ok)return NextResponse.json({...gemini.data,scanner:"gemini",scannerModel:String(gemini.model||"")},{headers:{"Cache-Control":"no-store","X-YNOT-Scanner":"gemini","X-YNOT-Scanner-Model":String(gemini.model||"")}});
  console.error("YNOT_ROOM_SCAN_FAILED",{gemini:gemini.error});
  return NextResponse.json({error:"Could not analyze this photo",code:"VISION_ANALYSIS_FAILED",detail:gemini.error},{status:502});
}
