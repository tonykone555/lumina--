const MODEL=String(process.env.GEMINI_GROWTH_IMAGE_MODEL||"gemini-3.1-flash-lite-image").trim();
const VARIANT_LENSES=[
 "Create a clean premium hero composition with deliberate negative space, a polished commercial camera angle and restrained props.",
 "Create a believable candid lifestyle composition with a different environment, camera distance, crop, lighting direction and product placement.",
 "Create a direct-response social ad composition with a strong first-glance visual hook and a clear product benefit or interaction.",
 "Create an editorial product-story composition with a distinctly different scene, perspective, lighting, props and subject placement."
];

function key(){const v=String(process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||"").trim();if(!v)throw new Error("GEMINI_IMAGE_NOT_CONFIGURED");return v}
function db(){const base=String(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||"").replace(/\/$/,"");const k=String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"");if(!base||!k)throw new Error("IMAGE_STORE_NOT_CONFIGURED");return{base,key:k}}

async function fetchReference(url:string){
 const r=await fetch(url,{cache:"no-store",redirect:"follow",signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw new Error(`PRODUCT_IMAGE_FETCH_${r.status}`);
 const ct=(r.headers.get("content-type")||"image/jpeg").split(";")[0].toLowerCase();
 if(!ct.startsWith("image/"))throw new Error("PRODUCT_IMAGE_NOT_IMAGE");
 const b=Buffer.from(await r.arrayBuffer());
 if(!b.length||b.byteLength>12*1024*1024)throw new Error("PRODUCT_IMAGE_SIZE_INVALID");
 return{mimeType:ct,data:b.toString("base64")};
}

async function storeImage(data:string,contentType="image/png"){
 const {base,key:k}=db();const bytes=Buffer.from(data,"base64");
 if(!bytes.length||bytes.byteLength>20*1024*1024)throw new Error("GEMINI_IMAGE_SIZE_INVALID");
 const ext=contentType.includes("jpeg")||contentType.includes("jpg")?"jpg":"png";
 const path=`generated/growth/${Date.now()}-${crypto.randomUUID()}.${ext}`;
 const h:Record<string,string>={apikey:k,"Content-Type":contentType,"x-upsert":"false"};if(!k.startsWith("sb_"))h.Authorization=`Bearer ${k}`;
 const up=await fetch(`${base}/storage/v1/object/creator-studio/${path.split("/").map(encodeURIComponent).join("/")}`,{method:"POST",headers:h,body:bytes,cache:"no-store"});
 if(!up.ok)throw new Error("GEMINI_IMAGE_STORE_"+up.status+":"+(await up.text()).slice(0,160));
 const sh:Record<string,string>={apikey:k,"Content-Type":"application/json"};if(!k.startsWith("sb_"))sh.Authorization=`Bearer ${k}`;
 const sign=await fetch(`${base}/storage/v1/object/sign/creator-studio/${path.split("/").map(encodeURIComponent).join("/")}`,{method:"POST",headers:sh,body:JSON.stringify({expiresIn:60*60*24*30}),cache:"no-store"});
 const j=await sign.json().catch(()=>({}));if(!sign.ok)throw new Error("GEMINI_IMAGE_SIGN_"+sign.status);
 const raw=String(j?.signedURL||j?.signedUrl||"");return raw.startsWith("http")?raw:`${base}/storage/v1${raw}`;
}

async function generateOne(input:{reference:{mimeType:string;data:string};direction:any;variantIndex:number}){
 const d=input.direction||{};const humanUse=Boolean(d.human_use)||["human","lifestyle","ugc","demonstration"].includes(String(d.scene_type||"").toLowerCase());
 const prompt=[
  String(d.prompt||"Create a premium paid-social advertisement for the referenced product."),
  VARIANT_LENSES[(input.variantIndex-1)%VARIANT_LENSES.length],
  humanUse?"Include a photorealistic adult naturally USING, WEARING, HOLDING or interacting with the exact referenced product in the physically correct way for this product category. The interaction must make sense and the product must remain clearly visible.":"Do not add a person unless the concept genuinely benefits from one.",
  "The supplied image is the exact product reference. Preserve its product identity, silhouette, proportions, materials, colors, packaging, logo and readable label as faithfully as possible. Do not redesign, morph, recolor, relabel or blur the product.",
  "Create a NEW scene around the product rather than repainting the reference image. Do not copy competitor branding, logos, exact ad wording or a near-identical composition.",
  `Direction name: ${String(d.name||"")}. Hook: ${String(d.hook||"")}. Layout: ${String(d.layout_concept||"")}.`,
  "Output one polished 4:5 paid-social image. No watermark, no UI chrome, no gibberish text."
 ].join("\n\n");
 const started=Date.now();
 const r=await fetch(`https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(MODEL)}:generateContent`,{
  method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key()},
  body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt},{inlineData:input.reference}]}],generationConfig:{responseModalities:["IMAGE"],responseFormat:{image:{aspectRatio:"4:5",imageSize:"1K"}}}}),
  cache:"no-store",signal:AbortSignal.timeout(180000)
 });
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(`GEMINI_IMAGE_FAILED_${r.status}:`+String(j?.error?.message||"unknown").slice(0,320));
 const parts=j?.candidates?.[0]?.content?.parts||[];const imagePart=parts.find((p:any)=>p?.inlineData?.data);
 if(!imagePart?.inlineData?.data)throw new Error("GEMINI_IMAGE_OUTPUT_MISSING");
 const contentType=String(imagePart.inlineData.mimeType||"image/png");const url=await storeImage(String(imagePart.inlineData.data),contentType);
 return{directionId:String(d.direction_id||""),variantIndex:input.variantIndex,seed:0,url,prompt,contentType,generationSeconds:(Date.now()-started)/1000};
}

export function geminiGrowthImageConfigured(){return Boolean(String(process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||"").trim())}

export async function generateGeminiAdVariants(input:{productImageUrl:string;directions:any[];variantsPerDirection?:number}){
 const started=Date.now();const reference=await fetchReference(input.productImageUrl);const variants:any[]=[];
 const count=Math.max(1,Math.min(4,input.variantsPerDirection||4));
 for(const direction of (input.directions||[]).slice(0,5)){
  for(let i=1;i<=count;i++)variants.push(await generateOne({reference,direction,variantIndex:i}));
 }
 return{provider:"gemini-nano-banana-2-lite" as const,model:MODEL,gpu:null,generationSeconds:(Date.now()-started)/1000,requestId:crypto.randomUUID(),variants};
}
