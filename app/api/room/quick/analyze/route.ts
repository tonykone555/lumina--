import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const maxDuration=60;

const MODEL=process.env.GEMINI_VISION_MODEL||"gemini-3.8-flash";
const API_KEY=process.env.GEMINI_API_KEY||process.env.GOOGLE_GENERATIVE_AI_API_KEY||process.env.GOOGLE_API_KEY;

const schema={type:"OBJECT",properties:{sceneTitle:{type:"STRING"},roomType:{type:"STRING"},objects:{type:"ARRAY",items:{type:"OBJECT",properties:{id:{type:"STRING"},label:{type:"STRING"},category:{type:"STRING"},searchQuery:{type:"STRING"},confidence:{type:"NUMBER"},box_2d:{type:"ARRAY",items:{type:"INTEGER"}},mask:{type:"ARRAY",items:{type:"ARRAY",items:{type:"INTEGER"}}}},required:["id","label","category","searchQuery","confidence","box_2d"]}},suggestionSpots:{type:"ARRAY",items:{type:"OBJECT",properties:{id:{type:"STRING"},label:{type:"STRING"},reason:{type:"STRING"},suggestedCategories:{type:"ARRAY",items:{type:"STRING"}},searchQuery:{type:"STRING"},point_2d:{type:"ARRAY",items:{type:"INTEGER"}}},required:["id","label","suggestedCategories","searchQuery","point_2d"]}}},required:["sceneTitle","roomType","objects","suggestionSpots"]};

export async function POST(req:NextRequest){
  if(!API_KEY)return NextResponse.json({error:"Gemini image analysis is not configured",code:"GEMINI_NOT_CONFIGURED"},{status:503});
  const form=await req.formData();const image=form.get("image");
  if(!(image instanceof File)||!image.type.startsWith("image/"))return NextResponse.json({error:"Upload an image"},{status:400});
  if(image.size>15*1024*1024)return NextResponse.json({error:"Image is too large"},{status:413});
  const bytes=Buffer.from(await image.arrayBuffer()).toString("base64");
  const prompt=`Analyze this interior/home image for a shoppable YNOT experience. Detect every prominent purchasable object a user could tap: furniture, lighting, mirrors, rugs, decor, electronics, storage and fixtures. Use specific human labels such as Beige 3-seat sofa or Rectangular wall mirror. category must be a concise catalogue category. searchQuery must be a strong product-search query using visible attributes, never invent a brand. box_2d is [ymin,xmin,ymax,xmax], normalized 0-1000. mask, when confident, is a polygon of [x,y] points normalized 0-1000. Also identify genuinely useful EMPTY spots where an additional product could improve the space: empty wall, corner, floor zone, bedside space, etc. point_2d is [x,y], normalized 0-1000. Do not suggest an addition where it would obstruct a door, walkway, window, toilet, bath, sink or other functional area. Return at most 18 objects and 6 suggestion spots.`;
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":API_KEY},body:JSON.stringify({contents:[{parts:[{text:prompt},{inlineData:{mimeType:image.type,data:bytes}}]}],generationConfig:{responseMimeType:"application/json",responseSchema:schema,temperature:.1}})});
  const raw=await response.json().catch(()=>({}));
  if(!response.ok)return NextResponse.json({error:raw?.error?.message||"Gemini could not analyze this image",code:"GEMINI_ANALYSIS_FAILED"},{status:502});
  const text=raw?.candidates?.[0]?.content?.parts?.find((p:any)=>typeof p?.text==="string")?.text;
  if(!text)return NextResponse.json({error:"Gemini returned no scene analysis"},{status:502});
  try{return NextResponse.json(JSON.parse(text),{headers:{"Cache-Control":"no-store"}})}catch{return NextResponse.json({error:"Gemini returned an invalid scene analysis"},{status:502})}
}
