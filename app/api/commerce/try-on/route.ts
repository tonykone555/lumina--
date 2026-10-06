import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";

function geminiKey(){return String(process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||"").trim()}
function safeHttp(value:unknown){try{const u=new URL(String(value||""));return u.protocol==="https:"||u.protocol==="http:"?u.toString():""}catch{return""}}
function parseDataUrl(value:unknown){
 const raw=String(value||"");const m=raw.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/i);
 if(!m)return null;const bytes=Buffer.from(m[2],"base64");if(!bytes.length||bytes.length>8*1024*1024)return null;
 return{mimeType:m[1].toLowerCase(),data:m[2]};
}
async function garmentPart(url:string){
 const r=await fetch(url,{cache:"no-store",redirect:"follow",headers:{Accept:"image/*,*/*;q=.8","User-Agent":"Mozilla/5.0 (compatible; YNOTTryOn/1.0)"},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error("GARMENT_IMAGE_FETCH_"+r.status);
 const ct=(r.headers.get("content-type")||"image/jpeg").split(";")[0].toLowerCase();if(!ct.startsWith("image/"))throw new Error("GARMENT_IMAGE_INVALID");
 const b=Buffer.from(await r.arrayBuffer());if(!b.length||b.length>10*1024*1024)throw new Error("GARMENT_IMAGE_TOO_LARGE");
 return{mimeType:ct,data:b.toString("base64")};
}

export async function POST(req:NextRequest){
 try{
  const body=await req.json();
  const person=parseDataUrl(body?.personImage),garmentUrl=safeHttp(body?.garmentImage),title=String(body?.title||"garment").trim().slice(0,180),variant=String(body?.variantLabel||"").trim().slice(0,120);
  if(!person)return NextResponse.json({error:"PERSON_IMAGE_REQUIRED"},{status:400});
  if(!garmentUrl)return NextResponse.json({error:"GARMENT_IMAGE_REQUIRED"},{status:400});
  const key=geminiKey();if(!key)return NextResponse.json({error:"TRY_ON_NOT_CONFIGURED"},{status:503});
  const garment=await garmentPart(garmentUrl);
  const requested=String(process.env.GEMINI_TRY_ON_MODEL||process.env.GEMINI_GROWTH_IMAGE_MODEL||"gemini-3.1-flash-lite-image").trim();
  const prompt=`Create a photorealistic virtual clothing try-on image.

IMAGE 1 is the shopper. Preserve this exact person's identity, face, body proportions, pose, skin tone, hair, background, camera angle and lighting.
IMAGE 2 is the exact garment/product reference. Dress the shopper in that exact garment while preserving its visible design, color, pattern, logo, silhouette, length, material appearance and proportions as faithfully as possible.
Product: ${title}
Selected variant: ${variant||"selected variant"}

Replace only the clothing area necessary for the try-on. Do not beautify or alter the person's body or face. Do not add accessories, text, watermarks, extra garments or unrelated objects. Keep the result realistic and ecommerce-appropriate.`;
  const r=await fetch(`https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(requested)}:generateContent`,{
   method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},
   body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt},{inlineData:person},{inlineData:garment}]}],generationConfig:{responseModalities:["IMAGE"],responseFormat:{image:{aspectRatio:"4:5",imageSize:"1K"}}}}),
   cache:"no-store",signal:AbortSignal.timeout(180000)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok)return NextResponse.json({error:"TRY_ON_GENERATION_FAILED",detail:String(data?.error?.message||"").slice(0,220)},{status:502});
  const parts=data?.candidates?.[0]?.content?.parts||[],image=parts.find((p:any)=>p?.inlineData?.data);
  if(!image?.inlineData?.data)return NextResponse.json({error:"TRY_ON_IMAGE_MISSING"},{status:502});
  const mime=String(image.inlineData.mimeType||"image/png");
  return NextResponse.json({ok:true,image:`data:${mime};base64,${String(image.inlineData.data)}`,model:requested});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"TRY_ON_FAILED"},{status:500})}
}
