type SourceAd={
 id?:string;platform?:string;advertiser?:string;headline?:string;body?:string;cta?:string;format?:string;imageUrl?:string;videoUrl?:string;previewUrl?:string;landingPage?:string;started?:string;[key:string]:any
};
type Product={product_id?:string;id?:string;title?:string;image_url?:string;image?:string;price?:any;currency?:string;advertability_score?:any;description?:string;brand?:string;[key:string]:any};

const MODEL=String(process.env.GEMINI_GROWTH_MODEL||"gemini-2.5-flash");
function key(){const v=String(process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||"").trim();if(!v)throw new Error("GEMINI_NOT_CONFIGURED");return v}

async function imagePart(url?:string){
 if(!url)return null;
 try{
  const r=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(12000)});
  if(!r.ok)return null;
  const ct=(r.headers.get("content-type")||"image/jpeg").split(";")[0];
  if(!ct.startsWith("image/"))return null;
  const b=Buffer.from(await r.arrayBuffer());
  if(!b.length||b.length>10*1024*1024)return null;
  return{inlineData:{mimeType:ct,data:b.toString("base64")}};
 }catch{return null}
}

function extractJson(text:string){
 const raw=String(text||"").trim().replace(/^```json\s*/i,"").replace(/```$/i,"").trim();
 try{return JSON.parse(raw)}catch{}
 const s=raw.indexOf("{"),e=raw.lastIndexOf("}");
 if(s>=0&&e>s)return JSON.parse(raw.slice(s,e+1));
 throw new Error("GEMINI_ANALYSIS_INVALID_JSON");
}

export async function analyseAdForProduct(input:{ad:SourceAd;product:Product;contextAds?:SourceAd[]}){
 const ad=input.ad||{},product=input.product||{},context=(input.contextAds||[]).slice(0,12);
 const prompt=`You are YNOT's paid-social creative strategist. Analyse a public competitor ad as MARKET RESEARCH, then adapt only the underlying marketing patterns for our own product. Never copy a competitor logo, exact wording, distinctive trade dress, branded character, or a near-identical composition. Produce original concepts.

SOURCE AD\n${JSON.stringify({platform:ad.platform,advertiser:ad.advertiser,headline:ad.headline,body:ad.body,cta:ad.cta,format:ad.format,started:ad.started,landingPage:ad.landingPage},null,2)}

OUR PRODUCT\n${JSON.stringify({id:product.product_id||product.id,title:product.title,brand:product.brand,description:product.description,price:product.price,currency:product.currency,advertability_score:product.advertability_score},null,2)}

RELATED ADS IN THE SAME SAVED RESEARCH FOLDER\n${JSON.stringify(context.map(x=>({advertiser:x.advertiser,headline:x.headline,body:x.body,cta:x.cta,format:x.format})),null,2)}

Return ONLY valid JSON with this exact top-level structure:
{
 "analysis":{
  "niche":"", "sub_niche":"", "audience":{"segment":"","intent":"","price_sensitivity":""},
  "creative_type":"", "format":"",
  "style":{"visual_style":"","lighting":"","composition":"","background":"","color_palette":[],"text_overlay_style":""},
  "marketing_structure":{"hook":"","problem":"","promise":"","offer":"","cta":""},
  "visual_elements":[],"what_to_keep":[],"what_to_change":[],"risk_flags":[]
 },
 "adaptation":{
  "reason_for_match":"","adapted_angle":"","adapted_benefit":"","price_positioning":"","cta_direction":"","tone":"","constraints":[]
 },
 "directions":[
  {"direction_id":"dir_01","name":"","goal":"","hook":"","overlay_text":[],"layout_concept":"","prompt":"","negative_prompt":[],"format":"4:5","variant_count":4}
 ]
}
Create exactly 5 substantially different directions. Prompts must describe photorealistic paid-social still images and explicitly say to preserve the supplied YNOT product's real design, branding, colors, proportions and readable label. Do not ask the image model to reproduce the competitor ad; translate its useful principles into an original YNOT composition.`;
 const parts:any[]=[{text:prompt}];
 const source=await imagePart(ad.imageUrl);if(source)parts.push(source);
 const prod=await imagePart(product.image_url||product.image);if(prod)parts.push(prod);
 const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(key())}`,{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({contents:[{role:"user",parts}],generationConfig:{responseMimeType:"application/json",temperature:.65}}),
  cache:"no-store",signal:AbortSignal.timeout(120000)
 });
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error("GEMINI_ANALYSIS_FAILED_"+r.status+":"+String(j?.error?.message||"unknown").slice(0,280));
 const text=(j?.candidates?.[0]?.content?.parts||[]).map((p:any)=>p?.text||"").join("");
 const out=extractJson(text);
 if(!Array.isArray(out?.directions)||out.directions.length<1)throw new Error("GEMINI_DIRECTIONS_MISSING");
 out.directions=out.directions.slice(0,5).map((d:any,i:number)=>({...d,direction_id:String(d.direction_id||`dir_${String(i+1).padStart(2,"0")}`),variant_count:4,format:String(d.format||"4:5")}));
 return{model:MODEL,...out};
}
