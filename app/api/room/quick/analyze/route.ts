import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const maxDuration=60;

const API_KEY=process.env.GEMINI_API_KEY||process.env.GOOGLE_GENERATIVE_AI_API_KEY||process.env.GOOGLE_API_KEY;
const configured=process.env.GEMINI_VISION_MODEL?.trim();
// Current production models only. 2.x fallbacks are intentionally excluded for new YNOT Room scans.
const MODELS=[...new Set([configured,"gemini-3.8-flash","gemini-3.6-flash","gemini-3.5-flash-lite"].filter(Boolean) as string[])];

const schema={type:"OBJECT",properties:{sceneTitle:{type:"STRING"},roomType:{type:"STRING"},sceneKind:{type:"STRING"},objects:{type:"ARRAY",items:{type:"OBJECT",properties:{id:{type:"STRING"},label:{type:"STRING"},category:{type:"STRING"},searchQuery:{type:"STRING"},alternateQueries:{type:"ARRAY",items:{type:"STRING"}},confidence:{type:"NUMBER"},box_2d:{type:"ARRAY",items:{type:"INTEGER"}},mask:{type:"ARRAY",items:{type:"ARRAY",items:{type:"INTEGER"}}}},required:["id","label","category","searchQuery","confidence","box_2d"]}},suggestionSpots:{type:"ARRAY",items:{type:"OBJECT",properties:{id:{type:"STRING"},label:{type:"STRING"},reason:{type:"STRING"},suggestedCategories:{type:"ARRAY",items:{type:"STRING"}},searchQuery:{type:"STRING"},point_2d:{type:"ARRAY",items:{type:"INTEGER"}}},required:["id","label","suggestedCategories","searchQuery","point_2d"]}}},required:["sceneTitle","roomType","objects","suggestionSpots"]};
const prompt=`Analyze this image as a universal visual-shopping scene for YNOT. The image may show a room, person/outfit, beauty products, hair, sports equipment, food, electronics, tools, furniture or other everyday purchasable things. Do NOT assume it is an interior.
Return tappable purchasable objects/regions that a shopper could reasonably search, replace, complement or buy. Prefer concrete shopping regions and products. Never infer sensitive traits or health conditions. label must be short and visually grounded. category must be a broad catalogue category. searchQuery should be a useful primary shopping query and must never invent a brand. alternateQueries should contain up to 6 broader/adjacent catalogue searches. box_2d is [ymin,xmin,ymax,xmax], normalized 0-1000. mask, when confident, is a polygon of [x,y] points normalized 0-1000.
Also return suggestionSpots: contextual places/regions where something useful or complementary could be added even if it is not currently present. Do not suggest unsafe placements or obstruction of doors, walkways, windows or functional areas. point_2d is [x,y], normalized 0-1000. Keep labels concise. Return at most 22 objects and 8 suggestion spots.`;

export async function POST(req:NextRequest){
 if(!API_KEY)return NextResponse.json({error:"Image scanning is temporarily unavailable",code:"GEMINI_NOT_CONFIGURED"},{status:503});
 const form=await req.formData();const image=form.get("image");
 if(!(image instanceof File)||!image.type.startsWith("image/"))return NextResponse.json({error:"Upload an image"},{status:400});
 if(image.size>15*1024*1024)return NextResponse.json({error:"Image is too large"},{status:413});
 const bytes=Buffer.from(await image.arrayBuffer()).toString("base64");let last="";
 for(const model of MODELS){
  try{
   const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":API_KEY},body:JSON.stringify({contents:[{parts:[{text:prompt},{inlineData:{mimeType:image.type,data:bytes}}]}],generationConfig:{responseMimeType:"application/json",responseSchema:schema,temperature:.1}})});
   const raw=await response.json().catch(()=>({}));
   if(!response.ok){last=raw?.error?.message||`Scanner model ${model} failed`;if(response.status===404||response.status===400||response.status===429)continue;return NextResponse.json({error:last,code:"GEMINI_ANALYSIS_FAILED"},{status:502})}
   const text=raw?.candidates?.[0]?.content?.parts?.find((p:any)=>typeof p?.text==="string")?.text;
   if(!text){last=`${model} returned no scene analysis`;continue}
   try{const parsed=JSON.parse(text);if(!Array.isArray(parsed?.objects))throw new Error("Missing objects");return NextResponse.json(parsed,{headers:{"Cache-Control":"no-store","X-YNOT-Scanner-Model":model}})}catch{last=`${model} returned an invalid scene analysis`;continue}
  }catch(e){last=e instanceof Error?e.message:"Scanner request failed"}
 }
 return NextResponse.json({error:last||"Could not analyze this photo",code:"GEMINI_ANALYSIS_FAILED"},{status:502});
}
