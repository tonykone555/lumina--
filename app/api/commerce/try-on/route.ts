import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";

function geminiKey(){return String(process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||"").trim()}
function safeHttp(value:unknown){try{const u=new URL(String(value||""));return u.protocol==="https:"||u.protocol==="http:"?u.toString():""}catch{return""}}
function parseDataUrl(value:unknown){
 const raw=String(value||"");const m=raw.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/i);
 if(!m)return null;const bytes=Buffer.from(m[2],"base64");if(!bytes.length||bytes.length>8*1024*1024)return null;
 return{mime_type:m[1].toLowerCase(),data:m[2]};
}
async function garmentPart(url:string){
 const r=await fetch(url,{cache:"no-store",redirect:"follow",headers:{Accept:"image/*,*/*;q=.8","User-Agent":"Mozilla/5.0 (compatible; YNOTTryOn/1.0)"},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error("GARMENT_IMAGE_FETCH_"+r.status);
 const ct=(r.headers.get("content-type")||"image/jpeg").split(";")[0].toLowerCase();
 if(!ct.startsWith("image/"))throw new Error("GARMENT_IMAGE_INVALID");
 const b=Buffer.from(await r.arrayBuffer());if(!b.length||b.length>10*1024*1024)throw new Error("GARMENT_IMAGE_TOO_LARGE");
 return{mime_type:ct,data:b.toString("base64")};
}
function outputImage(data:any){
 return data?.interaction?.output_image||data?.output_image||data?.outputImage||data?.interaction?.outputImage||
   data?.interaction?.outputs?.find?.((x:any)=>x?.type==="image")||
   data?.outputs?.find?.((x:any)=>x?.type==="image")||null;
}
function detail(data:any){
 return String(data?.error?.message||data?.message||data?.detail||"").replace(/\s+/g," ").trim().slice(0,280);
}

export async function POST(req:NextRequest){
 try{
  const body=await req.json();
  const person=parseDataUrl(body?.personImage),garmentUrl=safeHttp(body?.garmentImage),title=String(body?.title||"garment").trim().slice(0,180),variant=String(body?.variantLabel||"").trim().slice(0,120);
  if(!person)return NextResponse.json({error:"PERSON_IMAGE_REQUIRED",detail:"Upload a JPG, PNG or WebP photo under 8 MB."},{status:400});
  if(!garmentUrl)return NextResponse.json({error:"GARMENT_IMAGE_REQUIRED",detail:"The selected product variant does not have a usable garment image."},{status:400});
  const key=geminiKey();if(!key)return NextResponse.json({error:"TRY_ON_NOT_CONFIGURED",detail:"Gemini image generation is not configured on the server."},{status:503});

  const garment=await garmentPart(garmentUrl);
  const requested=String(process.env.GEMINI_TRY_ON_MODEL||"gemini-3.1-flash-image").trim()||"gemini-3.1-flash-image";
  const prompt=`Create a photorealistic virtual clothing try-on image.

The first image is the shopper. Preserve the shopper's identity, face, body proportions, pose, skin tone, hair, background, camera angle and lighting.
The second image is the exact product reference. Put that exact wearable item on the shopper while preserving its visible design, color, pattern, branding, silhouette, proportions and material appearance as faithfully as possible.

Product: ${title}
Selected variant: ${variant||"selected variant"}

Only change the clothing/protective-wear area needed for the try-on. Do not beautify, reshape, age-shift or otherwise alter the shopper. Do not add text, watermarks, unrelated accessories or extra garments. Keep the result realistic and ecommerce-appropriate.`;

  const r=await fetch("https://generativelanguage.googleapis.com/v1beta/interactions",{
   method:"POST",
   headers:{"Content-Type":"application/json","x-goog-api-key":key},
   body:JSON.stringify({
    model:requested,
    input:[
     {type:"text",text:prompt},
     {type:"image",mime_type:person.mime_type,data:person.data},
     {type:"image",mime_type:garment.mime_type,data:garment.data}
    ],
    response_format:{type:"image",mime_type:"image/jpeg",aspect_ratio:"4:5",image_size:"1K"}
   }),
   cache:"no-store",
   signal:AbortSignal.timeout(180000)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok){
   const message=detail(data);
   return NextResponse.json({error:"TRY_ON_GENERATION_FAILED",detail:message||`Gemini returned HTTP ${r.status}.`,model:requested},{status:502});
  }
  const image=outputImage(data),imageData=String(image?.data||image?.inlineData?.data||""),mime=String(image?.mime_type||image?.mimeType||"image/jpeg");
  if(!imageData)return NextResponse.json({error:"TRY_ON_IMAGE_MISSING",detail:"Gemini completed the request but did not return an image.",model:requested},{status:502});
  return NextResponse.json({ok:true,image:`data:${mime};base64,${imageData}`,model:requested});
 }catch(e){
  const message=e instanceof Error?e.message:"TRY_ON_FAILED";
  return NextResponse.json({error:"TRY_ON_FAILED",detail:message},{status:500});
 }
}
