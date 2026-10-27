import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const maxDuration=60;

const GEMINI_KEY=process.env.GEMINI_API_KEY||process.env.GOOGLE_GENERATIVE_AI_API_KEY||process.env.GOOGLE_API_KEY;
const configuredGemini=process.env.GEMINI_VISION_MODEL?.trim();
const GEMINI_MODELS=[...new Set([configuredGemini,"gemini-2.5-flash","gemini-2.5-flash-lite"].filter(Boolean) as string[])];

const schema={type:"object",additionalProperties:false,properties:{sceneTitle:{type:"string"},roomType:{type:"string"},sceneKind:{type:"string"},sceneDescription:{type:"string"},styleDescription:{type:"string"},opportunitySummary:{type:"string"},objects:{type:"array",items:{type:"object",additionalProperties:false,properties:{id:{type:"string"},label:{type:"string"},category:{type:"string"},searchQuery:{type:"string"},alternateQueries:{type:"array",items:{type:"string"}},confidence:{type:"number"},box_2d:{type:"array",items:{type:"integer"}},mask:{type:"array",items:{type:"array",items:{type:"integer"}}}},required:["id","label","category","searchQuery","alternateQueries","confidence","box_2d","mask"]}},suggestionSpots:{type:"array",items:{type:"object",additionalProperties:false,properties:{id:{type:"string"},label:{type:"string"},reason:{type:"string"},suggestedCategories:{type:"array",items:{type:"string"}},searchQuery:{type:"string"},point_2d:{type:"array",items:{type:"integer"}}},required:["id","label","reason","suggestedCategories","searchQuery","point_2d"]}}},required:["sceneTitle","roomType","sceneKind","sceneDescription","styleDescription","opportunitySummary","objects","suggestionSpots"]};

const prompt=`Analyze this upload as a UNIVERSAL visual-shopping image for YNOT. It may be a room, a single product photo, a cropped object, a screenshot from a website or social app, a collage, a vehicle part, electronics, clothing, jewellery, tools, sports equipment, beauty products, furniture, or any other purchasable object. Ignore social media buttons, watermarks, captions, player controls, hands and background when identifying the principal product. NEVER reject or classify an image as unusable merely because it is not a room. Detect the main visible product even when it is the only object. For a single-object image, return that object as the first detection and use a tight box around it. Only use room/interior logic when the image actually shows a room.
Understand the whole image first. sceneTitle is a short natural title. sceneDescription briefly describes only what is visibly present. styleDescription describes the visible aesthetic when supported. If a person is present, describe only visible outfit/style and items; never infer identity, age, ethnicity, health, personality, income, occupation or other sensitive traits. opportunitySummary is one concise shopping insight about what YNOT could add, replace, complement or help discover. Do not criticize the person or home.
IMPORTANT: do not stop after finding only the dominant product. Inspect the full image and return every clearly distinct useful shopping target you can ground visually, up to 14. For a product made of separately purchasable visible components/accessories, those components may be separate detections when a shopper could reasonably search for them independently (for example: sofa + cushions, bed + bedding/pillows, outfit + jacket/bag/watch, desk + lamp/monitor/keyboard, bicycle + helmet/light/bag). Do NOT invent hidden components, split a single indivisible product into meaningless pieces, or create duplicate detections of the same target.
For each detected shopping target return one tight box around that exact visible target. box_2d MUST be [ymin,xmin,ymax,xmax], normalized 0-1000. Prefer spatially distinct boxes; overlapping boxes are allowed only when they represent genuinely different independently shoppable targets. Do not create grids, duplicate objects, background regions, empty-space detections or arbitrary points. Return only visually grounded objects.
label should identify the item specifically using visible product type, style/material/form and color when useful. Include branding/model only when clearly legible; never guess brands. searchQuery should be a concise catalogue-ready query for THAT exact target, preserving the strongest visible attributes. alternateQueries should contain 3-5 useful progressively broader ways to find the same target, not unrelated products. category is broad. mask is a polygon of [x,y] normalized 0-1000 or [] if uncertain.
For non-room images, suggestionSpots may be an empty array; never invent empty room locations. For a single product image, objects must still contain the visible product. Return at most 4 genuinely useful suggestionSpots only when the image is actually a room or scene with useful open areas. Return up to 14 detected objects and aim for multiple detections whenever the image visibly contains multiple independently shoppable targets.`;

function clamp(n:any){const x=Number(n);return Number.isFinite(x)?Math.max(0,Math.min(1000,Math.round(x))):0}
function text(v:any,fallback=""){return typeof v==="string"?v:fallback}
function strings(v:any){return Array.isArray(v)?v.filter((x:any)=>typeof x==="string"&&x.trim()).map((x:string)=>x.trim()):[]}
function normalize(raw:any){
  const x=raw&&typeof raw==="object"?raw:{};
  const seen=new Set<string>();
  const objects=(Array.isArray(x.objects)?x.objects:[]).map((o:any,i:number)=>{
    const box=Array.isArray(o?.box_2d)&&o.box_2d.length===4?o.box_2d.map(clamp):[50,50,950,950];
    return {id:text(o?.id,`object-${i}`),label:text(o?.label,"Item"),category:text(o?.category,"shopping"),searchQuery:text(o?.searchQuery,text(o?.label,"item")),alternateQueries:strings(o?.alternateQueries).slice(0,5),confidence:Number.isFinite(Number(o?.confidence))?Number(o.confidence):0,box_2d:box,mask:Array.isArray(o?.mask)?o.mask:[]};
  }).filter((o:any)=>{const [y1,x1,y2,x2]=o.box_2d;const key=`${o.label.toLowerCase()}|${Math.round(x1/20)}|${Math.round(y1/20)}|${Math.round(x2/20)}|${Math.round(y2/20)}`;if(seen.has(key))return false;seen.add(key);return y2>y1&&x2>x1&&o.searchQuery}).slice(0,14);
  const suggestionSpots=(Array.isArray(x.suggestionSpots)?x.suggestionSpots:[]).map((s:any,i:number)=>({id:text(s?.id,`spot-${i}`),label:text(s?.label,"Suggestion"),reason:text(s?.reason,""),suggestedCategories:strings(s?.suggestedCategories),searchQuery:text(s?.searchQuery,text(s?.label,"home decor")),point_2d:Array.isArray(s?.point_2d)&&s.point_2d.length>=2?[clamp(s.point_2d[0]),clamp(s.point_2d[1])]:[]})).filter((s:any)=>s.point_2d.length===2&&s.searchQuery);
  return {sceneTitle:text(x.sceneTitle,"Your space"),roomType:text(x.roomType,""),sceneKind:text(x.sceneKind,""),sceneDescription:text(x.sceneDescription,""),styleDescription:text(x.styleDescription,""),opportunitySummary:text(x.opportunitySummary,""),objects,suggestionSpots};
}
function valid(x:any){return !!(x&&Array.isArray(x.objects)&&x.objects.length>0&&Array.isArray(x.suggestionSpots))}

// Use a compact schema first: Gemini can reject deeply nested polygon schemas or omit required fields.
const simpleSchema={type:"OBJECT",properties:{sceneTitle:{type:"STRING"},sceneKind:{type:"STRING"},objects:{type:"ARRAY",items:{type:"OBJECT",properties:{label:{type:"STRING"},searchQuery:{type:"STRING"},category:{type:"STRING"},box_2d:{type:"ARRAY",items:{type:"INTEGER"}}},required:["label","searchQuery"]}}},required:["objects"]};
function parseAnswer(value:string){const cleaned=value.trim().replace(/^\`\`\`(?:json)?\s*/i,"").replace(/\`\`\`\s*$/,"");return JSON.parse(cleaned)}
async function scanGemini(bytes:string,mime:string){
 if(!GEMINI_KEY)return {ok:false as const,error:"Gemini is not configured"};
 let last="";
 const oneProductPrompt="Examine the WHOLE uploaded image as a visual-shopping search. It may be a website screenshot or a photograph, not an apartment. Find the single main purchasable item, even if it is alone on a white background. Ignore browser bars, text overlays and social-media controls. Return at least one object with a specific visible label, a usable product searchQuery and box_2d [ymin,xmin,ymax,xmax] in 0-1000 coordinates. Only name brands that are visibly readable. If it is a room, identify its main visible purchasable object. Respond as JSON.";
 for(const model of GEMINI_MODELS){
  for(const attempt of [0,1]){
   const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),attempt?11000:17000);
   try{
    const config=attempt?{responseMimeType:"application/json",temperature:0}:{responseMimeType:"application/json",responseSchema:simpleSchema,temperature:0};
    const reqBody={contents:[{parts:[{text:attempt?oneProductPrompt:prompt},{inlineData:{mimeType:mime,data:bytes}}]}],generationConfig:config};
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:"POST",signal:controller.signal,headers:{"Content-Type":"application/json","x-goog-api-key":GEMINI_KEY},body:JSON.stringify(reqBody)});
    const raw=await r.json().catch(()=>({}));
    if(!r.ok){last=`${model}: ${raw?.error?.message||r.status}`;if(r.status===401||r.status===403||r.status===429)break;continue}
    const answer=raw?.candidates?.[0]?.content?.parts?.filter((p:any)=>typeof p?.text==="string").map((p:any)=>p.text).join("")||"";
    if(!answer){last=`${model} returned no visual description`;continue}
    const parsed=normalize(parseAnswer(answer));
    if(valid(parsed))return {ok:true as const,data:parsed,model};
    last=`${model} returned no identified item`;
   }catch(e){last=e instanceof Error?(e.name==="AbortError"?`${model} timed out`:e.message):"Gemini scanner failed"}finally{clearTimeout(timeout)}
  }
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
  return NextResponse.json({error:"Could not analyze this image",code:"VISION_ANALYSIS_FAILED",detail:gemini.error},{status:502});
}
