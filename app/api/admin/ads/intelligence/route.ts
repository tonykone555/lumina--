import {NextRequest,NextResponse} from "next/server";
import {adminDb,adminErrorStatus,requireYnotAdmin} from "@/lib/ynot/admin-server";

export const runtime="nodejs";
export const maxDuration=60;

type Probe={name:string;query:string;vertical:string;audience:string;intent:string;novelty:number;ynot:number;organic:number;conversion:number};
type Product={id?:string;title?:string;brand?:string;price?:number|null;currency?:string;image?:string;images?:string[];url?:string;tags?:string[];source?:string};

const PROBES:Probe[]=[
 {name:"Run-club starter kit",query:"run club accessories hydration reflective recovery",vertical:"Fitness",audience:"18–38 social runners, beginners and local run-club members",intent:"identity + habit",novelty:82,ynot:92,organic:94,conversion:78},
 {name:"Pilates grip + carry",query:"pilates grip socks straps bottle tote accessories",vertical:"Fitness",audience:"18–40 Pilates regulars and studio-first wellness shoppers",intent:"identity + bundle",novelty:73,ynot:94,organic:92,conversion:82},
 {name:"Recovery desk athlete",query:"recovery massage mobility desk worker fitness accessories",vertical:"Wellness",audience:"24–45 hybrid workers who train and care about recovery",intent:"problem solution",novelty:88,ynot:89,organic:81,conversion:85},
 {name:"Small-space home gym",query:"compact home gym apartment workout equipment storage",vertical:"Fitness",audience:"23–45 apartment dwellers who want convenient training",intent:"space saving",novelty:78,ynot:90,organic:84,conversion:87},
 {name:"Quiet-luxury desk",query:"minimal premium desk accessories leather wood metal workspace",vertical:"Home + Tech",audience:"25–45 professionals, founders and aesthetic workspace buyers",intent:"aspiration",novelty:86,ynot:95,organic:91,conversion:80},
 {name:"Nightstand reset",query:"nightstand bedroom sleep lamp tray charging wellness",vertical:"Home",audience:"22–45 home-aesthetic and self-care shoppers",intent:"routine + aesthetic",novelty:91,ynot:94,organic:95,conversion:76},
 {name:"Rental-friendly upgrades",query:"renter friendly apartment decor removable lighting storage",vertical:"Home",audience:"20–38 renters wanting visible upgrades without renovation",intent:"transformation",novelty:84,ynot:96,organic:96,conversion:84},
 {name:"Tiny kitchen upgrades",query:"small kitchen space saving organizer tools aesthetic",vertical:"Home",audience:"22–45 apartment cooks and organization audiences",intent:"utility + transformation",novelty:77,ynot:90,organic:88,conversion:88},
 {name:"Hotel-bedroom look",query:"luxury bedroom hotel bedding lamp decor neutral",vertical:"Home",audience:"25–50 interior-aesthetic shoppers seeking premium feel",intent:"aspiration",novelty:81,ynot:96,organic:93,conversion:82},
 {name:"Coffee ritual",query:"coffee ritual accessories glass mug grinder storage aesthetic",vertical:"Food + Home",audience:"20–45 coffee culture, home-bar and morning-routine audiences",intent:"ritual + identity",novelty:83,ynot:93,organic:94,conversion:81},
 {name:"Matcha station",query:"matcha set whisk bowl glass accessories aesthetic",vertical:"Food + Wellness",audience:"18–38 wellness, café and aesthetic routine audiences",intent:"ritual + trend",novelty:88,ynot:95,organic:97,conversion:78},
 {name:"Mocktail bar",query:"mocktail bar glassware cocktail tools alcohol free hosting",vertical:"Home + Food",audience:"21–40 hosts, sober-curious and aesthetic entertainment shoppers",intent:"social + hosting",novelty:92,ynot:93,organic:96,conversion:72},
 {name:"Carry-on optimizer",query:"carry on travel organizer packing tech accessories flight",vertical:"Travel",audience:"20–45 frequent flyers, city-break and budget travel audiences",intent:"utility",novelty:79,ynot:91,organic:91,conversion:90},
 {name:"Airport comfort kit",query:"airport flight comfort travel pillow pouch bottle charger",vertical:"Travel",audience:"20–50 frequent travelers and long-haul flyers",intent:"problem solution",novelty:82,ynot:89,organic:85,conversion:89},
 {name:"One-bag city break",query:"weekend travel one bag backpack organizer capsule accessories",vertical:"Travel",audience:"20–40 minimalist travelers and weekend-break audiences",intent:"challenge + utility",novelty:90,ynot:95,organic:95,conversion:82},
 {name:"Dog-walk upgrade",query:"dog walk accessories leash pouch bottle reflective travel",vertical:"Pets",audience:"20–50 urban dog owners who walk daily",intent:"daily routine",novelty:82,ynot:91,organic:91,conversion:88},
 {name:"Indoor-cat enrichment",query:"indoor cat enrichment interactive toys scratcher window",vertical:"Pets",audience:"20–45 indoor-cat owners and pet-content audiences",intent:"care + entertainment",novelty:87,ynot:92,organic:96,conversion:86},
 {name:"Pet-parent personalization",query:"personalized pet owner gifts portrait necklace blanket tag",vertical:"Pets + Gifts",audience:"20–55 emotionally invested pet owners and gift buyers",intent:"emotion + gift",novelty:77,ynot:94,organic:94,conversion:92},
 {name:"New-dog starter",query:"new puppy starter kit training feeding walking accessories",vertical:"Pets",audience:"22–50 new dog owners with immediate purchase intent",intent:"life event",novelty:76,ynot:89,organic:82,conversion:94},
 {name:"BookTok annotation",query:"book annotation tabs highlighter reading accessories booktok",vertical:"Stationery",audience:"16–35 BookTok, students and heavy fiction readers",intent:"community + identity",novelty:91,ynot:96,organic:98,conversion:83},
 {name:"Analog productivity",query:"paper planner focus timer desk notebook productivity analog",vertical:"Stationery",audience:"20–45 productivity audiences reducing screen dependence",intent:"self improvement",novelty:93,ynot:94,organic:92,conversion:80},
 {name:"Creator carry kit",query:"content creator portable light mic tripod phone accessories",vertical:"Creator Tech",audience:"18–40 creators, solopreneurs and social sellers",intent:"aspiration + utility",novelty:79,ynot:93,organic:94,conversion:91},
 {name:"Phone filmmaking",query:"phone filmmaking cage lens light mic creator video",vertical:"Creator Tech",audience:"18–40 short-form creators and small businesses",intent:"performance",novelty:86,ynot:91,organic:92,conversion:92},
 {name:"Home podcast starter",query:"podcast starter microphone arm light acoustic desk",vertical:"Creator Tech",audience:"20–45 aspiring podcasters, coaches and creators",intent:"starter system",novelty:81,ynot:90,organic:85,conversion:90},
 {name:"Car interior reset",query:"car interior organizer cleaning ambient accessories aesthetic",vertical:"Auto",audience:"18–40 drivers who personalize and maintain their cars",intent:"transformation",novelty:84,ynot:92,organic:97,conversion:88},
 {name:"Road-trip setup",query:"road trip car travel charger organizer cooler comfort",vertical:"Auto + Travel",audience:"20–50 couples, families and frequent road trippers",intent:"event + utility",novelty:80,ynot:90,organic:89,conversion:90},
 {name:"EV owner accessories",query:"electric vehicle EV accessories charging organizer console",vertical:"Auto + Tech",audience:"25–55 EV owners and tech-forward drivers",intent:"ownership utility",novelty:90,ynot:88,organic:81,conversion:91},
 {name:"Curly-hair wash day",query:"curly hair wash day diffuser bonnet brush microfiber",vertical:"Beauty + Hair",audience:"18–45 curly/coily hair audiences with routine-led buying",intent:"routine",novelty:84,ynot:94,organic:96,conversion:90},
 {name:"Scalp-care ritual",query:"scalp care massager oil applicator brush serum routine",vertical:"Beauty + Hair",audience:"20–45 hair-care audiences focused on scalp health and ritual",intent:"routine + care",novelty:88,ynot:93,organic:91,conversion:87},
 {name:"Heatless styling",query:"heatless curls hair styling rollers clips bonnet",vertical:"Beauty + Hair",audience:"16–38 social beauty audiences seeking low-damage styling",intent:"trend + result",novelty:82,ynot:94,organic:98,conversion:85},
 {name:"Travel beauty capsule",query:"travel beauty organizer refillable bottle mini tools case",vertical:"Beauty + Travel",audience:"18–45 travelers and beauty-routine shoppers",intent:"utility + routine",novelty:86,ynot:95,organic:90,conversion:89},
 {name:"Barrier-first skincare",query:"skin barrier routine gentle moisturizer cleanser ceramide",vertical:"Beauty",audience:"18–45 skincare audiences seeking simple sensitive-skin routines",intent:"problem solution",novelty:73,ynot:90,organic:86,conversion:88},
 {name:"Men's grooming shelf",query:"mens grooming beard skincare fragrance organizer premium",vertical:"Beauty",audience:"20–45 men upgrading grooming routines and gift buyers",intent:"routine + aspiration",novelty:83,ynot:91,organic:84,conversion:90},
 {name:"Wedding-morning kit",query:"wedding morning bridal robe jewelry bag personalized gift",vertical:"Wedding",audience:"23–38 brides, bridesmaids and wedding-party gift buyers",intent:"life event",novelty:85,ynot:95,organic:94,conversion:93},
 {name:"Guest-event accessories",query:"wedding guest accessories clutch jewelry shawl hair",vertical:"Fashion",audience:"20–45 event-goers with date-specific purchase intent",intent:"occasion",novelty:78,ynot:96,organic:88,conversion:94},
 {name:"Quiet-luxury accessories",query:"quiet luxury leather belt watch sunglasses jewelry minimal",vertical:"Fashion",audience:"22–45 style audiences seeking understated premium cues",intent:"aspiration",novelty:80,ynot:97,organic:94,conversion:86},
 {name:"Capsule wardrobe",query:"capsule wardrobe neutral basics layering accessories",vertical:"Fashion",audience:"22–45 minimal-style shoppers seeking fewer versatile pieces",intent:"system + identity",novelty:79,ynot:98,organic:92,conversion:88},
 {name:"Festival utility fashion",query:"festival outfit bag sunglasses hydration accessories utility",vertical:"Fashion + Events",audience:"18–32 festival and concert audiences",intent:"occasion + identity",novelty:85,ynot:96,organic:98,conversion:87},
 {name:"Golf lifestyle",query:"golf accessories premium glove towel rangefinder bag lifestyle",vertical:"Sports",audience:"24–55 golfers, aspirational sports and gifting audiences",intent:"identity + hobby",novelty:82,ynot:90,organic:86,conversion:92},
 {name:"Padel lifestyle",query:"padel accessories bag grip bottle apparel",vertical:"Sports",audience:"18–40 social racquet-sport audiences in Europe",intent:"trend + identity",novelty:94,ynot:96,organic:97,conversion:89},
 {name:"Hiking day-pack",query:"day hiking pack hydration trekking accessories lightweight",vertical:"Outdoor",audience:"20–50 casual hikers, weekend travelers and outdoor starters",intent:"starter system",novelty:78,ynot:89,organic:85,conversion:91},
 {name:"Balcony outdoor room",query:"small balcony outdoor decor lighting furniture planter",vertical:"Home + Outdoor",audience:"22–50 apartment dwellers with balconies and renters",intent:"transformation",novelty:90,ynot:97,organic:97,conversion:88},
 {name:"Indoor plant parent",query:"indoor plant accessories grow light pot tools propagation",vertical:"Home + Garden",audience:"18–45 plant-parent communities and home-aesthetic shoppers",intent:"identity + hobby",novelty:84,ynot:95,organic:96,conversion:84},
 {name:"New-parent night shift",query:"new parent night feeding nursery organizer light bottle",vertical:"Baby",audience:"25–40 expecting and new parents with urgent utility needs",intent:"life event + utility",novelty:90,ynot:88,organic:82,conversion:95},
 {name:"Toddler travel survival",query:"toddler travel airplane car organizer toys snack accessories",vertical:"Baby + Travel",audience:"25–42 parents traveling with toddlers",intent:"problem solution",novelty:92,ynot:91,organic:91,conversion:94},
 {name:"Sensory play shelf",query:"sensory play toys montessori toddler educational storage",vertical:"Kids",audience:"24–42 parents interested in development-led play",intent:"education + care",novelty:83,ynot:90,organic:91,conversion:92},
 {name:"AI solopreneur stack",query:"AI automation templates prompts agents small business course",vertical:"AI + Digital",audience:"22–45 solopreneurs, agencies and small-business operators",intent:"ROI + education",novelty:93,ynot:98,organic:90,conversion:95},
 {name:"Notion business OS",query:"Notion business dashboard CRM content finance templates",vertical:"Digital",audience:"20–40 creators, freelancers and small teams",intent:"system + productivity",novelty:88,ynot:97,organic:89,conversion:93},
 {name:"Creator monetization kit",query:"creator monetization ebook course templates sponsorship media kit",vertical:"Digital",audience:"18–40 creators trying to monetize audience",intent:"income + aspiration",novelty:91,ynot:96,organic:94,conversion:91},
 {name:"High-ticket business coaching",query:"business coaching mastermind sales marketing course consulting",vertical:"Education + Services",audience:"25–50 founders, consultants and service businesses",intent:"transformation + ROI",novelty:74,ynot:83,organic:73,conversion:94},
 {name:"Career-switch education",query:"career course certification bootcamp coaching digital training",vertical:"Education",audience:"22–45 professionals seeking career change or upskilling",intent:"life change",novelty:80,ynot:85,organic:78,conversion:92}
];

function clamp(n:number){return Math.max(0,Math.min(100,Math.round(n)))}
function median(values:number[]){if(!values.length)return 0;const s=[...values].sort((a,b)=>a-b);const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2}
function productQuality(p:Product){let s=0;const imgs=[p.image,...(p.images||[])].filter(Boolean);s+=Math.min(35,imgs.length*7);if(String(p.image||"").startsWith("https://"))s+=15;if((p.title||"").length>12)s+=12;if((p.tags||[]).length>2)s+=12;if(Number(p.price)>0)s+=12;if(p.brand)s+=8;if(p.url&&p.url!=="#")s+=6;return clamp(s)}
function ticket(prices:number[]){const m=median(prices);return m>=180?"high":m>=60?"mid":"low"}
function buildStrategy(probe:Probe,priceBand:string,score:number){
 const high=priceBand==="high";
 return {
  audience:probe.audience,
  funnel:high?"educate → proof → retarget → conversion":"hook → discovery → product/world → retarget",
  organic:`Lead with ${probe.intent}; make the content useful or identity-led before asking for a click.`,
  paid:high?"Use education/proof creatives, then retarget engaged viewers with the strongest product or offer.":"Test product/collection hooks immediately and route clicks into the matching YNOT world.",
  ynot:`Run the same YNOT visual lens while swapping this micro-niche into the product world so the platform versatility becomes the ad.`,
  firstTest:score>=88?"6–10 creatives across 3 hooks":"3–6 creatives across 2 hooks",
  landingQuery:probe.query
 };
}

export async function POST(req:NextRequest){
 try{
  const admin=await requireYnotAdmin(req);
  const body=await req.json().catch(()=>({}));
  const action=String(body?.action||"scan");
  if(action==="save"){
   const opportunities=Array.isArray(body?.opportunities)?body.opportunities.slice(0,80):[];
   const rows=await adminDb("ynot_ad_intelligence_runs",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({created_by:admin.profile.id,mode:String(body?.mode||"deep").slice(0,20),country:String(body?.country||"France").slice(0,80),summary:body?.summary||{},opportunities,sample_count:Number(body?.sampleCount||0),probe_count:Number(body?.probeCount||0),status:"completed"})});
   return NextResponse.json({ok:true,run:rows?.[0]});
  }
  const batch=Math.max(0,Math.min(7,Number(body?.batch||0)));
  const size=Math.max(4,Math.min(8,Number(body?.size||6)));
  const start=batch*size;
  const probes=PROBES.slice(start,start+size);
  const origin=req.nextUrl.origin;
  const results=await Promise.all(probes.map(async probe=>{
   try{
    const url=new URL("/api/catalog",origin);url.searchParams.set("q",probe.query);url.searchParams.set("source","shopify");url.searchParams.set("limit","30");
    const response=await fetch(url,{cache:"no-store"});const data=await response.json().catch(()=>({}));
    const products:(Product[])=(Array.isArray(data?.products)?data.products:[]).filter((p:Product)=>p?.id&&p?.title&&p?.image&&p?.url&&p.url!=="#");
    const deduped=Array.from(new Map(products.map(p=>[`${String(p.title).toLowerCase()}|${String(p.brand||"").toLowerCase()}`,p])).values());
    const prices=deduped.map(p=>Number(p.price)).filter(n=>Number.isFinite(n)&&n>0);
    const qualities=deduped.map(productQuality);const brands=new Set(deduped.map(p=>p.brand).filter(Boolean));
    const inventory=clamp((Math.min(deduped.length,24)/24)*100);const visual=qualities.length?Math.round(qualities.reduce((a,b)=>a+b,0)/qualities.length):0;const diversity=clamp((Math.min(brands.size,10)/10)*100);
    const band=ticket(prices);const priceSpread=prices.length?{min:Math.min(...prices),median:Math.round(median(prices)*100)/100,max:Math.max(...prices)}:{min:0,median:0,max:0};
    const evidence=clamp(inventory*.34+visual*.32+diversity*.14+(prices.length?20:0));
    const gem=clamp(evidence*.38+probe.novelty*.18+probe.ynot*.18+probe.organic*.12+probe.conversion*.14);
    const broad=clamp(probe.organic*.42+visual*.22+inventory*.18+probe.ynot*.18);const conversion=clamp(probe.conversion*.38+evidence*.28+inventory*.14+probe.ynot*.2);const ynot=clamp(probe.ynot*.48+visual*.2+probe.novelty*.16+inventory*.16);
    return {probe,products:deduped.slice(0,12),metrics:{inventory,visual,diversity,evidence,gem,broad,conversion,ynot,ticket:band,priceSpread,productCount:deduped.length,brandCount:brands.size},strategy:buildStrategy(probe,band,gem)};
   }catch(error){return {probe,products:[],metrics:{inventory:0,visual:0,diversity:0,evidence:0,gem:0,broad:probe.organic,conversion:probe.conversion,ynot:probe.ynot,ticket:"unknown",priceSpread:{min:0,median:0,max:0},productCount:0,brandCount:0},strategy:buildStrategy(probe,"unknown",0),error:error instanceof Error?error.message:"SCAN_FAILED"}}
  }));
  return NextResponse.json({ok:true,batch,size,totalProbes:PROBES.length,hasMore:start+size<PROBES.length,results});
 }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"INTELLIGENCE_ERROR"},{status:adminErrorStatus(error)})}
}
