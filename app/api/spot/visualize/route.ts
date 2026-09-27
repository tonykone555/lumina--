import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const maxDuration=60;

const KEY=process.env.GEMINI_API_KEY||process.env.GOOGLE_GENERATIVE_AI_API_KEY||process.env.GOOGLE_API_KEY;
const MODEL=process.env.GEMINI_IMAGE_MODEL||"gemini-2.5-flash-image";

type Operation="ADD"|"REPLACE";
function editPrompt(operation:Operation,target:string,product:string,kind:string){
 const physical=/jacket|coat|shirt|top|dress|trouser|pants|jeans|skirt|shoe|clothing|garment/i.test(`${target} ${kind}`)?"WEAR":/earring|jewel|necklace|bracelet|watch|hat|glasses|accessor/i.test(`${target} ${kind}`)?"ACCESSORY":/tv|mirror|art|shelf|wall/i.test(`${target} ${kind}`)?"MOUNT":"PLACE";
 const common=`Use image 1 as the original scene and image 2 as the exact YNOT product reference. The selected target/spot is ${target}. The chosen product is ${product}. Preserve the original camera angle, composition, people, identity, faces, body proportions, architecture, background and every unrelated object. Preserve the reference product's recognizable shape, design, color, material and details. Match realistic perspective, scale, lighting, shadows and occlusion. Do not redesign the scene and do not add unrelated objects.`;
 if(operation==="ADD")return `${common}\nOperation: ADD (${physical}). Add the selected reference product naturally at the indicated ${target} location. Do not remove, replace, move or restyle existing objects. If worn/accessory, place it naturally while preserving the person's identity, pose, hair and existing clothing except where physically occluded by the new item. If placed or mounted, create believable contact/mounting and shadows.`;
 return `${common}\nOperation: REPLACE (${physical}). Replace only the selected ${target} with the selected reference product. Remove only what is necessary to perform that replacement. If clothing/accessory, preserve the person's identity, face, hair, pose, hands and all non-selected garments/accessories. If furniture/equipment/electronics/decor, keep the same functional location and believable floor/wall contact. Everything outside the selected target must remain unchanged.`;
}

export async function POST(req:NextRequest){
 if(!KEY)return NextResponse.json({error:"Visual generation is not configured",code:"SPOT_GENERATION_NOT_CONFIGURED"},{status:503});
 const form=await req.formData();
 const scene=form.get("scene"),product=form.get("product");
 if(!(scene instanceof File)||!(product instanceof File))return NextResponse.json({error:"Scene and product reference images are required"},{status:400});
 const operation=(String(form.get("operation")||"REPLACE").toUpperCase()==="ADD"?"ADD":"REPLACE") as Operation;
 const target=String(form.get("target")||"selected object").slice(0,240),productTitle=String(form.get("productTitle")||"selected YNOT product").slice(0,300),kind=String(form.get("kind")||"").slice(0,120);
 const scene64=Buffer.from(await scene.arrayBuffer()).toString("base64"),product64=Buffer.from(await product.arrayBuffer()).toString("base64");
 const body={contents:[{parts:[{text:editPrompt(operation,target,productTitle,kind)},{inlineData:{mimeType:scene.type||"image/jpeg",data:scene64}},{inlineData:{mimeType:product.type||"image/jpeg",data:product64}}]}],generationConfig:{responseModalities:["TEXT","IMAGE"]}};
 const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":KEY},body:JSON.stringify(body)});
 const raw=await r.json().catch(()=>({}));if(!r.ok)return NextResponse.json({error:raw?.error?.message||"Could not generate preview",code:"SPOT_GENERATION_FAILED"},{status:502});
 const parts=raw?.candidates?.[0]?.content?.parts||[];const img=parts.find((p:any)=>p?.inlineData?.data);
 if(!img)return NextResponse.json({error:"The image model returned no preview",code:"SPOT_NO_IMAGE"},{status:502});
 return NextResponse.json({image:`data:${img.inlineData.mimeType||"image/png"};base64,${img.inlineData.data}`,operation},{headers:{"Cache-Control":"no-store"}});
}
