type ListingInput={
 id:string;title:string;description?:string;propertyType?:string;roomType?:string;location?:string;
 nightlyPrice?:number|null;currency?:string;rating?:number|null;reviewCount?:number|null;
 amenities?:string[];photos?:string[];host?:Record<string,unknown>;reviews?:string[];
};

function geminiKey(){
 const value=String(process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||"").trim();
 if(!value)throw new Error("GEMINI_NOT_CONFIGURED");
 return value;
}
async function imagePart(url:string){
 const r=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error("HOST_IMAGE_FETCH_"+r.status);
 const mime=(r.headers.get("content-type")||"image/jpeg").split(";")[0];
 const bytes=Buffer.from(await r.arrayBuffer());
 if(bytes.length>10*1024*1024)throw new Error("HOST_IMAGE_TOO_LARGE");
 return{inlineData:{mimeType:mime,data:bytes.toString("base64")}};
}
function cleanJson(text:string){
 const stripped=text.replace(/^\s*```(?:json)?/i,"").replace(/```\s*$/,"").trim();
 const start=stripped.indexOf("{"),end=stripped.lastIndexOf("}");
 return start>=0&&end>start?stripped.slice(start,end+1):stripped;
}

export function hostQualification(input:ListingInput){
 const nightly=Math.max(0,Number(input.nightlyPrice||0));
 const reviews=Math.max(0,Number(input.reviewCount||0));
 const rating=Math.max(0,Number(input.rating||0));
 const type=(String(input.propertyType||"")+" "+String(input.roomType||"")).toLowerCase();
 let score=0;
 score+=nightly>=500?45:nightly>=300?35:nightly>=200?26:nightly>=120?16:8;
 score+=/entire|villa|penthouse|house|loft|apartment|chalet/.test(type)?18:7;
 score+=reviews>=100?14:reviews>=40?10:reviews>=10?6:2;
 score+=rating>=4.8?12:rating>=4.6?8:4;
 score+=Math.min(11,(input.photos?.length||0));
 return Math.max(0,Math.min(100,Math.round(score)));
}

export async function analyzeHostProperty(input:ListingInput){
 const model=String(process.env.GEMINI_HOST_ANALYSIS_MODEL||"gemini-2.5-flash").trim();
 const prompt=[
  "You are YNOT Host Intelligence. Analyse this short-term-rental property for commercially sensible, visually appropriate upgrades that a premium host could buy.",
  "Do not criticize the host. Do not invent dimensions, defects, amenities, or review complaints. Separate what is visible from what is inferred.",
  "Focus especially on high-ticket or differentiated upgrades where appropriate: smart TV mirrors, premium outdoor furniture, statement lighting, premium mirrors/vanities, entertainment/projector systems, designer-style seating, smart access, and smart-property-control bundles.",
  "Use photos as both opportunity detection and style references. Reviews are evidence of guest needs; only cite a need when supported by supplied review text.",
  "Return strict JSON only with this shape:",
  "{\"propertyTier\":\"standard|premium|luxury\",\"styleSummary\":\"string\",\"bestRooms\":[{\"room\":\"string\",\"visualSummary\":\"string\",\"opportunities\":[{\"category\":\"string\",\"productSearch\":\"string\",\"reason\":\"string\",\"evidence\":\"visible|review|inferred\",\"priority\":0,\"ticket\":\"medium|high|signature\"}]}],\"reviewSignals\":[{\"signal\":\"string\",\"count\":0,\"example\":\"string\"}],\"heroOpportunity\":{\"category\":\"string\",\"productSearch\":\"string\",\"reason\":\"string\",\"room\":\"string\",\"ticket\":\"high|signature\"},\"searchQueries\":[\"string\"],\"outreachAngle\":\"string\",\"confidence\":0}",
  "Listing: "+input.title,
  "Property type: "+String(input.propertyType||input.roomType||"unknown"),
  "Location: "+String(input.location||"unknown"),
  "Nightly price: "+String(input.nightlyPrice??"unknown")+" "+String(input.currency||""),
  "Rating/reviews: "+String(input.rating??"unknown")+" / "+String(input.reviewCount??"unknown"),
  "Amenities: "+(input.amenities||[]).slice(0,50).join(", "),
  "Description: "+String(input.description||"").slice(0,2500),
  "Reviews: "+(input.reviews||[]).slice(0,15).map((x,i)=>"["+(i+1)+"] "+String(x).slice(0,500)).join("\n")
 ].join("\n");
 const parts:any[]=[{text:prompt}];
 for(const url of (input.photos||[]).slice(0,6)){try{parts.push(await imagePart(url))}catch{}}
 const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(geminiKey()),{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({contents:[{role:"user",parts}],generationConfig:{responseMimeType:"application/json",temperature:.2}}),
  cache:"no-store",signal:AbortSignal.timeout(120000)
 });
 const json=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error("GEMINI_HOST_ANALYSIS_FAILED_"+r.status+": "+String(json?.error?.message||"unknown").slice(0,280));
 const out=(json?.candidates?.[0]?.content?.parts||[]).map((p:any)=>p?.text||"").join("").trim();
 if(!out)throw new Error("GEMINI_HOST_ANALYSIS_EMPTY");
 let analysis:any;try{analysis=JSON.parse(cleanJson(out))}catch{throw new Error("GEMINI_HOST_ANALYSIS_INVALID_JSON")}
 return{model,qualificationScore:hostQualification(input),analysis};
}