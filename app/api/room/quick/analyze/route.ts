import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const maxDuration=60;

const MODEL=process.env.GEMINI_VISION_MODEL||"gemini-3.8-flash";
const API_KEY=process.env.GEMINI_API_KEY||process.env.GOOGLE_GENERATIVE_AI_API_KEY||process.env.GOOGLE_API_KEY;

const schema={type:"OBJECT",properties:{sceneTitle:{type:"STRING"},roomType:{type:"STRING"},sceneKind:{type:"STRING"},objects:{type:"ARRAY",items:{type:"OBJECT",properties:{id:{type:"STRING"},label:{type:"STRING"},category:{type:"STRING"},searchQuery:{type:"STRING"},alternateQueries:{type:"ARRAY",items:{type:"STRING"}},confidence:{type:"NUMBER"},box_2d:{type:"ARRAY",items:{type:"INTEGER"}},mask:{type:"ARRAY",items:{type:"ARRAY",items:{type:"INTEGER"}}}},required:["id","label","category","searchQuery","confidence","box_2d"]}},suggestionSpots:{type:"ARRAY",items:{type:"OBJECT",properties:{id:{type:"STRING"},label:{type:"STRING"},reason:{type:"STRING"},suggestedCategories:{type:"ARRAY",items:{type:"STRING"}},searchQuery:{type:"STRING"},point_2d:{type:"ARRAY",items:{type:"INTEGER"}}},required:["id","label","suggestedCategories","searchQuery","point_2d"]}}},required:["sceneTitle","roomType","objects","suggestionSpots"]};

export async function POST(req:NextRequest){
  if(!API_KEY)return NextResponse.json({error:"Gemini image analysis is not configured",code:"GEMINI_NOT_CONFIGURED"},{status:503});
  const form=await req.formData();const image=form.get("image");
  if(!(image instanceof File)||!image.type.startsWith("image/"))return NextResponse.json({error:"Upload an image"},{status:400});
  if(image.size>15*1024*1024)return NextResponse.json({error:"Image is too large"},{status:413});
  const bytes=Buffer.from(await image.arrayBuffer()).toString("base64");
  const prompt=`Analyze this image as a universal visual-shopping scene for YNOT. The image may show a room, person/outfit, beauty products, hair, sports equipment, food, electronics, tools, furniture or other everyday purchasable things. Do NOT assume it is an interior.

Return tappable purchasable objects/regions that a shopper could reasonably search, replace, complement or buy. Examples include clothing pieces, bags, jewelry, hats, hair accessories/tools, visible packaged beauty/body/hair products, sports equipment, packaged food/drink, electronics, furniture, lighting, decor and appliances. For a person/outfit, prefer concrete shopping regions such as coat/top, trousers/skirt, shoes, bag, earrings/jewelry, hat/headwear and hair accessories rather than demographic labels. Never infer race, ethnicity, religion, health condition, disability, sexual orientation or other sensitive traits. Do not diagnose skin, scalp, hair loss, medical or nutritional conditions from appearance. For skin/hair/body contexts, only surface neutral cosmetic/grooming shopping categories when visually appropriate or when a visible product/accessory can be identified.

label must be short, human-readable and visually grounded (for example Black bomber jacket, Silver hoop earrings, Adjustable dumbbell, Wall-mounted flatscreen TV). category must be a broad catalogue category. searchQuery should be a useful primary shopping query, not an over-specific caption, and must never invent a brand. alternateQueries should contain up to 6 broader/adjacent catalogue searches that remain replaceable or strongly related; e.g. a flatscreen TV can include smart TV, OLED TV, QLED TV, television and TV mirror; a ficus can include indoor plant, house plant, artificial plant and planter; a bomber can include bomber jacket, jacket and outerwear. box_2d is [ymin,xmin,ymax,xmax], normalized 0-1000. mask, when confident, is a polygon of [x,y] points normalized 0-1000.

Also return suggestionSpots: contextual places/regions where something useful or complementary could be added even if it is not currently present. Suggestions must depend on scene context: a home gym may suggest bench/weights/storage; an outfit may suggest bag/jewelry/hat; an empty wall may suggest mirror/art/TV/shelving; a desk may suggest lamp/monitor/accessories. Do not suggest unsafe placements or obstruction of doors, walkways, windows or functional areas. point_2d is [x,y], normalized 0-1000. Keep labels concise. Return at most 22 objects and 8 suggestion spots.`;
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":API_KEY},body:JSON.stringify({contents:[{parts:[{text:prompt},{inlineData:{mimeType:image.type,data:bytes}}]}],generationConfig:{responseMimeType:"application/json",responseSchema:schema,temperature:.1}})});
  const raw=await response.json().catch(()=>({}));
  if(!response.ok)return NextResponse.json({error:raw?.error?.message||"Gemini could not analyze this image",code:"GEMINI_ANALYSIS_FAILED"},{status:502});
  const text=raw?.candidates?.[0]?.content?.parts?.find((p:any)=>typeof p?.text==="string")?.text;
  if(!text)return NextResponse.json({error:"Gemini returned no scene analysis"},{status:502});
  try{return NextResponse.json(JSON.parse(text),{headers:{"Cache-Control":"no-store"}})}catch{return NextResponse.json({error:"Gemini returned an invalid scene analysis"},{status:502})}
}
