type SourceAd={
 id?:string;platform?:string;advertiser?:string;headline?:string;body?:string;cta?:string;format?:string;imageUrl?:string;videoUrl?:string;previewUrl?:string;landingPage?:string;started?:string;title?:string;assets?:any[];[key:string]:any
};
type Product={product_id?:string;id?:string;title?:string;image_url?:string;image?:string;price?:any;currency?:string;advertability_score?:any;description?:string;brand?:string;[key:string]:any};

const REQUESTED_MODEL=String(process.env.GEMINI_GROWTH_MODEL||"gemini-3.6-flash").trim();
const MODEL=/^gemini-(?:2\.5|3\.8)-flash$/i.test(REQUESTED_MODEL)?"gemini-3.6-flash":REQUESTED_MODEL;
function key(){const v=String(process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||"").trim();if(!v)throw new Error("GEMINI_NOT_CONFIGURED");return v}
function assetUrl(x:any){return String(x?.url||x?.downloadUrl||x?.download_url||"").trim()}
function assetKind(x:any){const k=String(x?.kind||"").toLowerCase(),ct=String(x?.contentType||x?.content_type||"").toLowerCase();if(k.includes("video")||ct.startsWith("video/"))return"video";if(k.includes("image")||k.includes("thumbnail")||ct.startsWith("image/"))return"image";return"media"}

async function mediaPart(url?:string){
 if(!url)return null;
 try{
  const r=await fetch(url,{cache:"no-store",redirect:"follow",headers:{"User-Agent":"Mozilla/5.0 (compatible; YNOTGrowth/1.0)",Accept:"image/*,video/*,*/*;q=0.8"},signal:AbortSignal.timeout(30000)});
  if(!r.ok)return null;
  const ct=(r.headers.get("content-type")||"").split(";")[0].toLowerCase();
  if(!ct.startsWith("image/")&&!ct.startsWith("video/"))return null;
  const b=Buffer.from(await r.arrayBuffer());
  const max=ct.startsWith("video/")?32*1024*1024:12*1024*1024;
  if(!b.length||b.length>max)return null;
  return{inlineData:{mimeType:ct||"application/octet-stream",data:b.toString("base64")}};
 }catch{return null}
}

async function adMediaParts(ad:SourceAd){
 const out:any[]=[];
 const seen=new Set<string>();
 const candidates:any[]=[...(Array.isArray(ad.assets)?ad.assets:[])];
 if(ad.videoUrl)candidates.unshift({kind:"video",url:ad.videoUrl});
 if(ad.imageUrl)candidates.push({kind:"image",url:ad.imageUrl});
 if(ad.previewUrl)candidates.push({kind:"image",url:ad.previewUrl});
 const ordered=[...candidates.filter(x=>assetKind(x)==="video"),...candidates.filter(x=>assetKind(x)!=="video")];
 for(const a of ordered){
  const u=assetUrl(a);if(!u||seen.has(u))continue;seen.add(u);
  const p=await mediaPart(u);if(p)out.push(p);
  if(out.length>=6)break;
 }
 return out;
}

function extractJson(text:string){
 const raw=String(text||"").trim().replace(/^```json\s*/i,"").replace(/```$/i,"").trim();
 try{return JSON.parse(raw)}catch{}
 const s=raw.indexOf("{"),e=raw.lastIndexOf("}");
 if(s>=0&&e>s)return JSON.parse(raw.slice(s,e+1));
 throw new Error("GEMINI_ANALYSIS_INVALID_JSON");
}

async function generateJson(parts:any[]){
 const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(key())}`,{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({contents:[{role:"user",parts}],generationConfig:{responseMimeType:"application/json"}}),
  cache:"no-store",signal:AbortSignal.timeout(180000)
 });
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error("GEMINI_ANALYSIS_FAILED_"+r.status+":"+String(j?.error?.message||"unknown").slice(0,320));
 const text=(j?.candidates?.[0]?.content?.parts||[]).map((p:any)=>p?.text||"").join("");
 return extractJson(text);
}

export async function analyseSourceAd(input:{ad:SourceAd;contextAds?:SourceAd[]}){
 const ad=input.ad||{},context=(input.contextAds||[]).slice(0,10);
 const prompt=`You are YNOT's multimodal ad intelligence analyst. Analyse the COMPLETE PUBLIC AD supplied after this text. Treat the actual video/images as primary evidence and the title, body, CTA, advertiser and platform metadata as supporting context. If several assets are supplied, analyse them together as one ad. For video, inspect the hook, sequence, product reveal, setting, pacing, camera/motion, on-screen text and CTA. Do not invent anything you cannot see or read. Do not copy branding or exact creative; extract reusable marketing principles.\n\nSOURCE AD METADATA\n${JSON.stringify({platform:ad.platform,advertiser:ad.advertiser,title:ad.title,headline:ad.headline,body:ad.body,cta:ad.cta,format:ad.format,started:ad.started,landingPage:ad.landingPage},null,2)}\n\nRELATED ADS\n${JSON.stringify(context.map(x=>({advertiser:x.advertiser,title:x.title,headline:x.headline,body:x.body,cta:x.cta,format:x.format})),null,2)}\n\nReturn ONLY JSON:\n{\n "analysis":{\n  "niche":"","sub_niche":"","product_category":"","product_type":"",\n  "audience":{"segment":"","intent":"","price_sensitivity":""},\n  "creative_type":"image|video|carousel|unknown","format":"",\n  "style":{"visual_style":"","lighting":"","composition":"","background":"","color_palette":[],"text_overlay_style":"","camera_or_motion":""},\n  "marketing_structure":{"hook":"","problem":"","promise":"","offer":"","cta":""},\n  "video_sequence":[],"visual_elements":[],"what_works":[],"what_to_avoid_copying":[]\n },\n "product_search_queries":["","","","",""],\n "product_match_requirements":["","",""],\n "summary":""\n}\nThe product_search_queries must be concise catalogue searches for multiple suitable products that could use the same underlying ad strategy.`;
 const media=await adMediaParts(ad);
 const parts:any[]=[{text:prompt},...media];
 const out=await generateJson(parts);
 out.product_search_queries=Array.isArray(out?.product_search_queries)?out.product_search_queries.filter(Boolean).slice(0,5):[];
 return{model:MODEL,media_inputs:media.length,...out};
}

export async function analyseAdForProduct(input:{ad:SourceAd;product:Product;contextAds?:SourceAd[];sourceAnalysis?:any}){
 const ad=input.ad||{},product=input.product||{},context=(input.contextAds||[]).slice(0,12);
 const prompt=`You are YNOT's paid-social creative strategist. The complete source ad was already analysed as MARKET RESEARCH. Adapt only its useful underlying marketing principles to OUR PRODUCT. Never copy a competitor logo, exact wording, distinctive trade dress, branded character, or near-identical composition. Produce original concepts and make each direction materially different.\n\nSOURCE AD\n${JSON.stringify({platform:ad.platform,advertiser:ad.advertiser,title:ad.title,headline:ad.headline,body:ad.body,cta:ad.cta,format:ad.format,started:ad.started,landingPage:ad.landingPage},null,2)}\n\nSOURCE ANALYSIS\n${JSON.stringify(input.sourceAnalysis||{},null,2)}\n\nOUR PRODUCT\n${JSON.stringify({id:product.product_id||product.id,title:product.title,brand:product.brand,description:product.description,price:product.price,currency:product.currency,advertability_score:product.advertability_score},null,2)}\n\nRELATED ADS\n${JSON.stringify(context.map(x=>({advertiser:x.advertiser,headline:x.headline,body:x.body,cta:x.cta,format:x.format})),null,2)}\n\nReturn ONLY JSON:\n{\n "analysis":{"niche":"","sub_niche":"","audience":{"segment":"","intent":"","price_sensitivity":""},"creative_type":"","format":"","style":{"visual_style":"","lighting":"","composition":"","background":"","color_palette":[],"text_overlay_style":""},"marketing_structure":{"hook":"","problem":"","promise":"","offer":"","cta":""},"visual_elements":[],"what_to_keep":[],"what_to_change":[],"risk_flags":[]},\n "adaptation":{"reason_for_match":"","adapted_angle":"","adapted_benefit":"","price_positioning":"","cta_direction":"","tone":"","constraints":[]},\n "directions":[{"direction_id":"dir_01","name":"","goal":"","hook":"","overlay_text":[],"layout_concept":"","prompt":"","negative_prompt":[],"format":"4:5","variant_count":4}]\n}\nCreate exactly 5 substantially different directions. Preserve the supplied YNOT product's real design, branding, colors, proportions and readable label. Translate the source ad's useful principles into original YNOT compositions.`;
 const parts:any[]=[{text:prompt},...(await adMediaParts(ad))];
 const prod=await mediaPart(product.image_url||product.image);if(prod)parts.push(prod);
 const out=await generateJson(parts);
 if(!Array.isArray(out?.directions)||out.directions.length<1)throw new Error("GEMINI_DIRECTIONS_MISSING");
 out.directions=out.directions.slice(0,5).map((d:any,i:number)=>({...d,direction_id:String(d.direction_id||`dir_${String(i+1).padStart(2,"0")}`),variant_count:4,format:String(d.format||"4:5")}));
 return{model:MODEL,...out};
}
