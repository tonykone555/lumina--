export type CatalogueProduct={id?:string;title?:string;brand?:string;price?:number|null;currency?:string;image?:string;images?:string[];url?:string;tags?:string[];description?:string;source?:string};
export type MarketArchetype="enthusiast"|"problem-solving"|"safety"|"luxury"|"professional"|"wellness"|"identity"|"convenience"|"accessibility"|"gifting"|"education"|"recurring"|"setup"|"novelty"|"replacement";

export const MARKET_CATEGORIES=[
 "Fashion & Style","Beauty & Personal Care","Hair","Jewelry & Accessories","Shoes","Bags & Travel","Home & Living","Furniture","Lighting","Kitchen & Food","Fitness & Sports","Racquet Sports","Golf","Cycling","Outdoor & Adventure","Auto & Mobility","Car Tools & Diagnostics","Tech & Gadgets","Gaming","Creator & Camera","Drones","Smart Home","Security & Safety","Tracking & GPS","Tools & DIY","Workshop & Maker","Rare Materials","Energy & Power","Air & Water Quality","Accessibility & Mobility","Wellness & Recovery","Massage","Sauna & Cold Therapy","Sleep","Pets","Pet Tech","Aquarium","Kids & Baby","Office & Stationery","Books & Media","Art & Creative","Education & Courses","AI & Automation","Digital Products","Business & Professional","Memberships & Subscriptions","Weddings & Events","Gifts","Collectibles & Vintage","Specialty Storage","Emergency Preparedness","Home Diagnostics","Home Cinema & Displays"
] as const;

export const RESEARCH_AXES=[
 ["attachment","Attachments & add-ons","What attaches to it or extends it?"],
 ["measure","Measurement & sensors","What measures performance, condition, safety or quality?"],
 ["maintain","Maintenance","What keeps it working or looking good?"],
 ["protect","Protection","What protects it from damage, theft, weather or misuse?"],
 ["store","Storage & display","How is it stored, organized, transported or displayed?"],
 ["upgrade","Performance upgrades","What upgrades the baseline experience?"],
 ["travel","Travel & portable","What changes when the same activity travels?"],
 ["install","Installation","What is needed before it can be used correctly?"],
 ["pro","Professional version","What do professionals use instead of the consumer version?"],
 ["safe","Safety","What can go wrong and what prevents or detects it?"],
 ["automate","Automation","What can be automated, monitored or remotely controlled?"],
 ["repair","Repair & diagnostics","How do owners identify and fix hidden problems?"],
 ["power","Power & charging","What powers, charges or backs it up?"],
 ["custom","Customization","How do people personalize or configure it?"],
 ["comfort","Comfort & ergonomics","What pain appears after long use?"],
 ["space","Small-space version","How does the use case change in a small home or apartment?"],
 ["luxury","Luxury version","What premium, handmade or design-led version exists?"],
 ["accessible","Accessibility adaptation","What adaptation makes it usable for more people?"],
 ["weather","Outdoor/weatherproof","What changes outdoors or in harsh conditions?"],
 ["consumable","Consumables & replacement","What needs refilling, replacing or recurring purchase?"],
 ["before","Before-use problem","What problem exists before the core product is used?"],
 ["after","After-use problem","What happens after the activity ends?"],
 ["beginner","Beginner setup","What does a first-time buyer actually need?"],
 ["bundle","Complete setup","Which products create a useful system together?"]
] as const;

const ARCHETYPE_RULES:[RegExp,MarketArchetype][]=[
 [/sensor|meter|diagnostic|tester|repair|inspection|utility|tool/i,"problem-solving"],
 [/alarm|security|safe|safety|tracker|gps|protect|emergency|leak|smoke/i,"safety"],
 [/luxury|designer|premium|handmade|statement|resin|travertine|mirror tv/i,"luxury"],
 [/professional|commercial|industrial|precision|workshop|trade|pro\b/i,"professional"],
 [/massage|recovery|sauna|wellness|sleep|cold plunge/i,"wellness"],
 [/adaptive|accessible|wheelchair|mobility|assist|one hand/i,"accessibility"],
 [/course|education|training|coaching|guide|ebook/i,"education"],
 [/refill|replacement|filter|cartridge|consumable/i,"recurring"],
 [/setup|kit|rig|system|cockpit|station|ecosystem/i,"setup"],
 [/gift|personalized|wedding|occasion/i,"gifting"],
 [/gaming|tennis|golf|camera|drone|cycling|aquarium|collector|hobby/i,"enthusiast"],
 [/fashion|style|grooming|desk|aesthetic|identity/i,"identity"],
 [/automatic|smart|remote|portable|organizer|convenient/i,"convenience"],
 [/hidden|novel|unique|unusual|smart mirror|thermal camera/i,"novelty"],
 [/replacement|spare|repair|maintenance/i,"replacement"]
];

export const clamp=(n:number)=>Math.max(0,Math.min(100,Math.round(n)));
export const median=(values:number[])=>{if(!values.length)return 0;const s=[...values].sort((a,b)=>a-b);const i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2};
export function productQuality(p:CatalogueProduct){const imgs=[p.image,...(p.images||[])].filter(Boolean);let score=Math.min(35,imgs.length*7);if(String(p.image||"").startsWith("https://"))score+=15;if(String(p.title||"").length>14)score+=12;if((p.tags||[]).length>2)s+=12;if(Number(p.price)>0)score+=12;if(p.brand)score+=8;if(p.url&&p.url!=="#")score+=6;return clamp(score)}
export function inferArchetypes(text:string):MarketArchetype[]{const found=[] as MarketArchetype[];for(const[r,a]of ARCHETYPE_RULES)if(r.test(text)&&!found.includes(a))found.push(a);return found.length?found.slice(0,6):["novelty","problem-solving"]}
export function inferAudience(text:string){const t=text.toLowerCase();const out:string[]=[];if(/tennis|golf|cycling|fitness|sport/.test(t))out.push("enthusiasts and committed hobbyists");if(/camera|creator|video|drone/.test(t))out.push("creators, freelancers and small studios");if(/home|furniture|lighting|kitchen/.test(t))out.push("homeowners, renters and design-conscious buyers");if(/car|auto|vehicle|obd/.test(t))out.push("drivers, enthusiasts and DIY vehicle owners");if(/access|mobility|adaptive|wheelchair/.test(t))out.push("disabled users, caregivers, older adults and families");if(/professional|workshop|diagnostic|precision/.test(t))out.push("professionals, tradespeople and serious DIY users");if(/gaming|sim racing/.test(t))out.push("PC/console gamers, streamers and setup enthusiasts");if(/safety|security|camera|tracker|gps/.test(t))out.push("households and owners motivated by prevention and reassurance");return out.length?out.slice(0,4):["buyers already interested in this use case","adjacent audiences who discover the problem through content"]}
export function scoreMarket(products:CatalogueProduct[],novelty=75){const prices=products.map(p=>Number(p.price)).filter(n=>Number.isFinite(n)&&n>0);const qualities=products.map(productQuality);const brands=new Set(products.map(p=>p.brand).filter(Boolean));const inventory=clamp(Math.min(1,products.length/30)*100);const visual=qualities.length?Math.round(qualities.reduce((a,b)=>a+b,0)/qualities.length):0;const diversity=clamp(Math.min(1,brands.size/12)*100);const evidence=clamp(inventory*.36+visual*.28+diversity*.16+(prices.length?20:0));const m=median(prices);const highTicket=clamp((m>=250?85:m>=100?65:m>=50?35:15)+(prices.some(x=>x>=500)?12:0));const crossSell=clamp(Math.min(100,products.length*2.2+brands.size*3+novelty*.35));const repeat=clamp(products.some(p=>/refill|replacement|filter|cartridge|consumable/i.test(`${p.title} ${(p.tags||[]).join(" ")}`))?82:32);const discovery=clamp(novelty*.45+visual*.25+evidence*.3);const organic=clamp(discovery*.55+visual*.3+Math.min(100,products.length*3)*.15);const conversion=clamp(evidence*.45+crossSell*.2+(m>0?20:0)+visual*.15);const ynot=clamp(discovery*.3+crossSell*.25+visual*.25+evidence*.2);const opportunity=clamp(evidence*.34+discovery*.17+conversion*.18+organic*.10+ynot*.12+crossSell*.09);return {inventory,visual,diversity,evidence,opportunity,discovery,conversion,organic,ynot,crossSell,highTicket,repeat,ticket:m>=250?"high":m>=80?"mid":"low",price:{min:prices.length?Math.min(...prices):0,median:Math.round(m*100)/100,max:prices.length?Math.max(...prices):0},productCount:products.length,merchantCount:brands.size}}
export function productReasoning(p:CatalogueProduct,marketName:string){const text=`${p.title||""} ${(p.tags||[]).join(" ")} ${marketName}`;const archetypes=inferArchetypes(text);const audience=inferAudience(text);const price=Number(p.price||0);const quality=productQuality(p);const novelty=clamp(55+(archetypes.includes("novelty")?22:0)+(archetypes.includes("professional")?8:0)+(archetypes.includes("setup")?6:0));const advertability=clamp(quality*.42+novelty*.22+(price>0?12:0)+(archetypes.includes("problem-solving")||archetypes.includes("safety")?14:6)+(archetypes.includes("enthusiast")?10:5));const why=archetypes.includes("problem-solving")?"It solves a specific problem that can be demonstrated clearly.":archetypes.includes("luxury")?"It has a visible premium/design difference that can carry aspirational creative.":archetypes.includes("enthusiast")?"It serves a committed audience that understands upgrades and specialist gear.":"It has a clear use case that can be introduced through discovery-led content.";const organic=[`I didn't know ${String(p.title||"this product").toLowerCase()} existed.`,`A specialist upgrade for ${marketName.toLowerCase()}.`,`The useful part of this setup most people overlook.`];const paid=[`For people already serious about ${marketName.toLowerCase()}.`,`Solve the specific problem before upgrading the whole setup.`,`Build the complete ${marketName.toLowerCase()} setup in YNOT.`];const ynot=[`Explore the ${marketName} world inside YNOT.`,`From the hero product to the accessories around it—see the whole setup.`,`YNOT found the products around this use case, not just one SKU.`];const crossSell=RESEARCH_AXES.filter(x=>["attachment","protect","store","upgrade","power","maintain","bundle"].includes(x[0])).slice(0,5).map(x=>`${p.title||marketName} ${x[2].replace(/\?/g,"")}`);return {archetypes,audience,problems:archetypes.includes("safety")?["risk prevention","loss or failure prevention"]:archetypes.includes("problem-solving")?["specific task friction","hidden problem detection"]:["better experience","upgrade or specialization"],useCases:[marketName,"specialist setup","adjacent use case"],organicHooks:organic,paidHooks:paid,ynotHooks:ynot,objections:["Do I really need this?","Is the improvement worth the price?","Will it work with my existing setup?"],crossSellQueries:crossSell,visualScore:quality,advertabilityScore:advertability,noveltyScore:novelty,confidence:clamp(55+quality*.25+advertability*.2),why}}
export function combinationCandidates(products:(CatalogueProduct&{intelligence?:ReturnType<typeof productReasoning>})[],marketName:string){const ranked=[...products].sort((a,b)=>(b.intelligence?.advertabilityScore||0)-(a.intelligence?.advertabilityScore||0));const top=ranked.slice(0,8);const groups=[
 {type:"starter",name:`${marketName} starter setup`,logic:"A coherent entry setup for a first-time buyer.",take:[0,1,2,3]},
 {type:"pro",name:`${marketName} professional setup`,logic:"Higher-quality items for serious or professional users.",take:[0,2,4,5]},
 {type:"hero_plus",name:`${marketName} hero + essentials`,logic:"One stronger anchor product with lower-ticket complements.",take:[0,1,3,6]},
 {type:"discovery",name:`Things you didn't know existed for ${marketName}`,logic:"Novel and useful products selected for broad discovery content.",take:[0,2,5,7]},
 {type:"complete",name:`Complete ${marketName} system`,logic:"Products that cover before, during and after the use case.",take:[0,1,2,4,6]}
 ];return groups.map(g=>({type:g.type,name:g.name,logic:g.logic,products:g.take.map(i=>top[i]).filter(Boolean),score:clamp((g.take.map(i=>top[i]?.intelligence?.advertabilityScore||0).reduce((a,b)=>a+b,0)/Math.max(1,g.take.filter(i=>top[i]).length))*.72+22)})).filter(g=>g.products.length>=2)}

function outputText(data:any){return data?.output?.flatMap((o:any)=>o?.content||[]).find((c:any)=>c?.type==="output_text")?.text||""}
export async function optionalAiJson<T>(system:string,input:any,fallback:T):Promise<{usedAi:boolean,value:T}> {const key=String(process.env.OPENAI_API_KEY||"");if(!key)return {usedAi:false,value:fallback};try{const model=String(process.env.YNOT_INTELLIGENCE_MODEL||"gpt-5.6-mini");const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,input:[{role:"system",content:[{type:"input_text",text:system}]},{role:"user",content:[{type:"input_text",text:JSON.stringify(input)}]}],text:{format:{type:"json_object"}}})});if(!response.ok)return {usedAi:false,value:fallback};const data=await response.json();const text=outputText(data);if(!text)return {usedAi:false,value:fallback};return {usedAi:true,value:JSON.parse(text) as T}}catch{return {usedAi:false,value:fallback}}}

export type WebMarketResearch={
 summary:string;
 marketArchetypes:string[];
 buyerSegments:{segment:string;whyTheyBuy:string;budget:string;trigger:string}[];
 replacementCycles:{thing:string;whyReplace:string;searchQuery:string}[];
 upgradePaths:{from:string;to:string;motivation:string;searchQuery:string}[];
 overlookedProblems:{problem:string;productOpportunity:string;searchQuery:string}[];
 accessoryEcosystems:{core:string;adjacent:string[];searchQueries:string[]}[];
 buyingMoments:string[];
 catalogueQueries:string[];
 contentAngles:string[];
 paidAngles:string[];
 evidenceNotes:string[];
 sourceUrls:string[];
};

export async function researchMarketWithWeb(name:string,query:string,parent?:string|null):Promise<{usedAi:boolean;usedWeb:boolean;value:WebMarketResearch}> {
 const fallback:WebMarketResearch={summary:`Research plan for ${name}`,marketArchetypes:inferArchetypes(`${name} ${query}`),buyerSegments:inferAudience(`${name} ${query}`).map(segment=>({segment,whyTheyBuy:"specific utility, replacement or upgrade need",budget:"unknown",trigger:"problem, upgrade or discovery moment"})),replacementCycles:[{thing:name,whyReplace:"wear, failure, compatibility or performance improvement",searchQuery:`${query} replacement upgrade`}],upgradePaths:[{from:`entry-level ${name}`,to:`premium or professional ${name}`,motivation:"better performance, durability or convenience",searchQuery:`${query} professional upgrade`}],overlookedProblems:RESEARCH_AXES.slice(0,5).map(a=>({problem:a[1],productOpportunity:a[2],searchQuery:`${query} ${a[1]}`})),accessoryEcosystems:[{core:name,adjacent:["attachments","maintenance","protection","storage","power"],searchQueries:[`${query} accessories`,`${query} maintenance`,`${query} protection`,`${query} storage`,`${query} power`]}],buyingMoments:["first purchase","replacement","upgrade","problem discovered","professional use"],catalogueQueries:[query,`${query} replacement`,`${query} upgrade`,`${query} professional`,`${query} accessories`,`${query} maintenance`,`${query} safety`,`${query} setup`],contentAngles:["what people replace too late","the upgrade most owners eventually make","what specialists use instead","things buyers discover after owning the core product"],paidAngles:["problem-aware replacement","upgrade from generic to specialist","complete setup","high-ticket anchor plus essentials"],evidenceNotes:["Fallback plan uses deterministic commercial research axes; no external web evidence was available."],sourceUrls:[]};
 const key=String(process.env.OPENAI_API_KEY||"");if(!key)return {usedAi:false,usedWeb:false,value:fallback};
 try{
  const model=String(process.env.YNOT_RESEARCH_MODEL||process.env.YNOT_INTELLIGENCE_MODEL||"gpt-5.6-mini");
  const instructions=`You are YNOT's market-research planner. Research the CURRENT public internet before proposing catalogue searches. Look for buying guides, specialist retailers, enthusiast/professional communities, product comparisons, upgrade/replacement discussions, maintenance pain points, accessories bought after the core product, and premium/pro versions. The goal is to discover what people actually buy, replace, upgrade, add on, or only learn they need later. Do not invent sales volumes, demand, trends, demographics, replacement intervals, or product facts. When evidence is weak, label it as a hypothesis. Return JSON only with exactly these top-level keys: summary, marketArchetypes, buyerSegments, replacementCycles, upgradePaths, overlookedProblems, accessoryEcosystems, buyingMoments, catalogueQueries, contentAngles, paidAngles, evidenceNotes, sourceUrls. catalogueQueries must contain 10-18 concrete product-oriented searches suitable for a Shopify catalogue, not vague research questions. Include low-ticket accessories, mid-ticket upgrades, high-ticket/pro equipment, replacements/consumables where relevant, and non-obvious specialist products. sourceUrls must contain only URLs actually surfaced by web research.`;
  const input={market:name,startingQuery:query,parentCategory:parent||null,goal:"Find evidence-backed product pathways, replacement/upgrade demand, accessory ecosystems, specialist purchases and overlooked needs before searching the Shopify catalogue."};
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,instructions,input:JSON.stringify(input),tools:[{type:"web_search"}],tool_choice:"auto",include:["web_search_call.action.sources"],text:{format:{type:"json_object"}}})});
  if(!response.ok)return {usedAi:false,usedWeb:false,value:fallback};
  const data=await response.json();const text=outputText(data);if(!text)return {usedAi:false,usedWeb:false,value:fallback};const parsed=JSON.parse(text) as WebMarketResearch;
  const toolSources=(data?.output||[]).filter((o:any)=>o?.type==="web_search_call").flatMap((o:any)=>o?.action?.sources||[]).map((s:any)=>String(s?.url||s?.link||"")).filter(Boolean);
  const sourceUrls=[...new Set([...(Array.isArray(parsed.sourceUrls)?parsed.sourceUrls:[]),...toolSources])].slice(0,24);
  const value={...fallback,...parsed,catalogueQueries:[...new Set([query,...(Array.isArray(parsed.catalogueQueries)?parsed.catalogueQueries:[])].map(x=>String(x||"").trim()).filter(Boolean))].slice(0,18),sourceUrls};
  return {usedAi:true,usedWeb:sourceUrls.length>0,value};
 }catch{return {usedAi:false,usedWeb:false,value:fallback}}
}
