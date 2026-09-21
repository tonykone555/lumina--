export type StudioProductInput={
 title:string;
 description?:string;
 category?:string;
 brand?:string;
};

export type StudioPromptInput={
 product:StudioProductInput;
 angle:string;
 mode:string;
 hasBackground?:boolean;
};

function textOf(product:StudioProductInput){
 return [product.title,product.description,product.category,product.brand].filter(Boolean).join(" ").toLowerCase();
}

function productContext(product:StudioProductInput){
 const text=textOf(product);
 if(/serum|cleanser|moistur|skincare|cream|beauty|cosmetic|makeup|lipstick|mascara/.test(text))return{
  kind:"beauty/skincare",
  use:"a believable self-care, vanity or skincare routine",
  scene:"a clean bathroom, vanity, bedroom or softly lit lifestyle space",
  action:"hold, open, apply or demonstrate the product naturally with realistic amounts and hand movement",
  tone:"clean, reassuring, premium and calm",
  guard:"Preserve realistic packaging scale, texture and skin interaction. Avoid exaggerated skin transformations, impossible cosmetic effects or altered branding."
 };
 if(/dress|top|shirt|jacket|jeans|legging|fashion|swimwear|activewear|hoodie|skirt|shoe|sneaker|clothing|apparel/.test(text))return{
  kind:"fashion/apparel",
  use:"an outfit styling, try-on or real lifestyle moment",
  scene:"a mirror setup, modern interior, gym, street-style or relevant lifestyle environment",
  action:"wear the product naturally, walk, turn, adjust it and show fit, silhouette and movement instead of simply holding it",
  tone:"confident, stylish, aspirational and natural",
  guard:"Preserve realistic garment fit, fabric weight, folds and movement. Keep the clothing attached naturally to the body and do not alter color, cut, pattern, proportions or branding."
 };
 if(/protein|supplement|pre-workout|vitamin|powder|creatine|collagen|wellness/.test(text))return{
  kind:"supplement/wellness",
  use:"a realistic morning, kitchen, health or workout routine",
  scene:"a kitchen, gym, training space or casual wellness environment",
  action:"hold, scoop, pour, mix or use the product only in a plausible everyday way",
  tone:"energetic, practical and trustworthy",
  guard:"Preserve realistic packaging, scooping, pouring and mixing behavior. Do not imply medical effects, guaranteed health outcomes or unrealistic physical transformation."
 };
 if(/lamp|chair|sofa|couch|decor|table|storage|rug|furniture|home|interior/.test(text))return{
  kind:"home/interior",
  use:"a realistic home styling, furnishing or room-improvement moment",
  scene:"a modern apartment, lounge, bedroom or clean interior",
  action:"place, arrange, sit near, touch or demonstrate the item naturally within the room",
  tone:"elevated, tasteful and lifestyle-led",
  guard:"Maintain realistic dimensions, room scale, contact with floors and surfaces, lighting and shadows. Do not change the product design."
 };
 if(/headphone|earbud|phone case|charger|speaker|keyboard|mouse|tech|camera|gadget|device/.test(text))return{
  kind:"tech/accessory",
  use:"a desk, commute, travel or daily-use demonstration",
  scene:"a modern desk setup, living room, studio or on-the-go environment",
  action:"hold, wear, plug in, press, type, listen or demonstrate the device in a plausible way",
  tone:"smart, modern and efficient",
  guard:"Preserve ports, buttons, screens, product proportions and branding. Demonstrate only plausible real-world interaction."
 };
 return{
  kind:"general product",
  use:"a natural lifestyle use case appropriate to the product",
  scene:"a clean modern environment relevant to the product",
  action:"use, wear, hold or interact with the product the way a real customer realistically would",
  tone:"native, realistic and premium",
  guard:"Preserve product proportions, materials, colors and branding. Do not invent unrealistic features or usage."
 };
}

function modeDirection(mode:string){
 if(mode==="video-avatar")return"Use the supplied source performance as the exact motion, gesture, timing, framing and camera blueprint. Replace the visible creator with the supplied avatar while preserving the performance. Maintain strong avatar identity consistency, natural facial behavior, realistic anatomy and believable product interaction.";
 if(mode==="video-self")return"Preserve the source creator identity, body movement, facial expression, timing, gesture rhythm and camera movement. Keep the result recognizably grounded in the original performance.";
 if(mode==="image-self"||mode==="ai-avatar")return"Use the supplied creator/avatar image as the consistent identity. Animate the creator naturally with believable eye contact, restrained gestures, realistic body mechanics and native social-video behavior.";
 return"No presenter is required. Make the product the hero while keeping the video grounded in realistic human use and lifestyle context.";
}

function angleDirection(angle:string,ctx:ReturnType<typeof productContext>){
 if(angle==="problem")return{
  name:"problem to solution",
  direction:`Open on a relatable real-world problem connected to ${ctx.use}. Show the problem quickly without exaggerated acting, then introduce the product naturally as the solution. Follow a clear problem → discovery → use → result sequence and finish on a believable improvement.`
 };
 if(angle==="routine")return{
  name:"daily lifestyle routine",
  direction:`Integrate the product naturally into ${ctx.use}. It should feel like one believable part of the creator's routine rather than the sole reason for the video. Use relaxed pacing, casual framing and understated product exposure.`
 };
 if(angle==="demo")return{
  name:"clear product demonstration",
  direction:`Prioritize hands-on proof and realistic use. Show how the product actually works, fits or behaves through purposeful interaction, detail shots and close-ups where useful. Demonstrate features through action, not floating labels or artificial callouts.`
 };
 return{
  name:"natural UGC testimonial",
  direction:`Make this feel like a genuine first-person creator recommendation based on real use in ${ctx.use}. Keep delivery conversational and believable rather than commercial. Show the product clearly but naturally while the creator behaves like someone recommending something they actually use.`
 };
}

export function buildStudioPrompt(input:StudioPromptInput){
 const ctx=productContext(input.product),angle=angleDirection(input.angle,ctx);
 const background=input.hasBackground?"Use the supplied background reference as the visual environment guide while keeping the creator and product naturally integrated into that space.":`Use ${ctx.scene}.`;
 return [
  "Create a vertical 9:16 native social-commerce video.",
  `Feature the exact product: ${input.product.title}.`,
  input.product.brand?`Brand: ${input.product.brand}.`:"",
  input.product.category?`Category: ${input.product.category}.`:"",
  `Product context: ${ctx.kind}. Use context: ${ctx.use}. Creator action: ${ctx.action}. Tone: ${ctx.tone}.`,
  `Creative angle: ${angle.name}. ${angle.direction}`,
  modeDirection(input.mode),
  background,
  ctx.guard,
  "Keep the product visually faithful, believable in scale and naturally integrated into hands, body, outfit or environment as appropriate.",
  "Use realistic lighting, natural skin texture, authentic phone-camera framing and subtle imperfections. Premium but not overproduced.",
  "Avoid warped packaging, incorrect logos, duplicate products, floating objects, extra fingers, deformed hands, distorted anatomy, identity drift, face morphing, stiff movement or impossible product interaction.",
  "The product must be used in context the way a real human would actually use it; do not merely place or hold it in frame unless that is genuinely how the product is used."
 ].filter(Boolean).join(" ");
}

export function studioVoiceDirection(angle:string){
 if(angle==="problem")return"Natural short-form creator voice. Start slightly urgent and relatable, then become clear and confident after the solution appears. Conversational pacing, realistic emphasis, subtle breaths, no announcer tone.";
 if(angle==="routine")return"Soft, casual lifestyle creator delivery. Relaxed pacing, warm tone, understated enthusiasm, natural pauses and subtle breaths. Avoid sounding scripted or overly promotional.";
 if(angle==="demo")return"Clear, direct creator-demo delivery. Slightly faster and more explanatory while still sounding natural. Emphasize useful details rather than hype. No robotic cadence or commercial announcer style.";
 return"Speak like a real short-form creator talking to one person through their phone. Natural conversational pacing, subtle rhythm variation, realistic emphasis and breaths. Confident but not overexcited. Avoid announcer delivery, exaggerated enthusiasm and robotic cadence.";
}
