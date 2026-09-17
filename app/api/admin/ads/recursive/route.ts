import {NextRequest,NextResponse} from "next/server";
import {adminErrorStatus,requireYnotAdmin} from "@/lib/ynot/admin-server";

export const runtime="nodejs";
export const maxDuration=60;

type Product={id?:string;title?:string;brand?:string;price?:number|null;currency?:string;image?:string;images?:string[];url?:string;tags?:string[]};
type Axis={id:string;label:string;terms:string;why:string};

const AXES:Axis[]=[
 {id:"attach",label:"Attachments & add-ons",terms:"attachment accessory add on adapter mount",why:"Products people only discover after owning the core item."},
 {id:"measure",label:"Measurement & sensors",terms:"sensor meter monitor gauge measurement smart",why:"Specialist tools that quantify performance, condition or safety."},
 {id:"maintain",label:"Maintenance",terms:"maintenance cleaning care service tool kit",why:"Recurring needs around keeping expensive products working well."},
 {id:"protect",label:"Protection",terms:"protective case cover guard shield anti theft",why:"Loss prevention and protection become easier sells after ownership."},
 {id:"store",label:"Storage",terms:"storage organizer rack cabinet case holder",why:"Ownership creates organization and display problems."},
 {id:"upgrade",label:"Performance upgrades",terms:"upgrade premium performance pro improved replacement",why:"Enthusiasts frequently pay to improve the baseline experience."},
 {id:"travel",label:"Portable & travel",terms:"portable travel compact carry case mobile",why:"A new use case appears when the same hobby must travel."},
 {id:"install",label:"Installation",terms:"installation mounting bracket setup tool hardware",why:"Installation friction creates its own product ecosystem."},
 {id:"pro",label:"Professional version",terms:"professional commercial heavy duty precision pro",why:"Professional users often support higher tickets and clearer ROI."},
 {id:"safe",label:"Safety",terms:"safety alarm emergency protective detection",why:"Safety products often have strong utility and educational content hooks."},
 {id:"automate",label:"Automation",terms:"automatic smart remote app controlled automation",why:"Automation creates novelty and premium positioning."},
 {id:"repair",label:"Repair & diagnostics",terms:"diagnostic repair inspection tester troubleshooting tool",why:"Hidden-problem products create strong reveal-style content."},
 {id:"power",label:"Power & charging",terms:"battery charger charging hub power adapter backup",why:"Anything electronic usually creates a secondary power ecosystem."},
 {id:"custom",label:"Customization",terms:"custom personalized modular configurable color kit",why:"Identity-heavy niches can support personalization and premium variants."},
 {id:"comfort",label:"Comfort & ergonomics",terms:"ergonomic comfort support padded adjustable",why:"Long-use products often create pain points users learn to solve later."},
 {id:"space",label:"Small-space version",terms:"compact folding wall mounted space saving apartment",why:"Space constraints create highly specific buyer segments."},
 {id:"luxury",label:"Luxury version",terms:"luxury premium designer handmade high end",why:"High-ticket variants can be hidden inside otherwise ordinary categories."},
 {id:"accessible",label:"Accessibility adaptation",terms:"adaptive accessible one hand mobility easy grip assist",why:"Mainstream products often have overlooked accessibility branches."},
 {id:"weather",label:"Outdoor/weatherproof",terms:"outdoor waterproof weatherproof rugged solar",why:"Changing environment often creates a distinct product submarket."},
 {id:"consumable",label:"Consumables & replacement",terms:"replacement refill consumable spare filter cartridge",why:"Repeat-purchase ecosystems can outperform the hero product over time."}
];

const STOP=new Set("the a an and or for with to of in on by from kit set pro premium smart tool tools accessory accessories product products new best high quality".split(" "));
const clamp=(n:number)=>Math.max(0,Math.min(100,Math.round(n)));
const median=(v:number[])=>{if(!v.length)return 0;const s=[...v].sort((a,b)=>a-b);const i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2};
function quality(p:Product){const imgs=[p.image,...(p.images||[])].filter(Boolean);let s=Math.min(35,imgs.length*7);if(String(p.image||"").startsWith("https://"))s+=15;if(String(p.title||"").length>14)s+=12;if((p.tags||[]).length>2)s+=12;if(Number(p.price)>0)s+=12;if(p.brand)s+=8;if(p.url&&p.url!=="#")s+=6;return clamp(s)}
function keywords(products:Product[]){const counts=new Map<string,number>();for(const p of products){const text=`${p.title||""} ${(p.tags||[]).join(" ")}`.toLowerCase().replace(/[^a-z0-9 ]/g," ");for(const w of text.split(/\s+/)){if(w.length<4||STOP.has(w)||/^\d+$/.test(w))continue;counts.set(w,(counts.get(w)||0)+1)}}return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([w])=>w)}
async function catalog(origin:string,q:string){const url=new URL("/api/catalog",origin);url.searchParams.set("q",q);url.searchParams.set("source","shopify");url.searchParams.set("limit","36");const r=await fetch(url,{cache:"no-store"});const d=await r.json().catch(()=>({}));const rows:(Product[])=(Array.isArray(d?.products)?d.products:[]).filter((p:Product)=>p?.id&&p?.title&&p?.image&&p?.url&&p.url!=="#");return Array.from(new Map(rows.map(p=>[`${String(p.title).toLowerCase()}|${String(p.brand||"").toLowerCase()}`,p])).values())}
function score(products:Product[],novelty:number){const prices=products.map(p=>Number(p.price)).filter(n=>Number.isFinite(n)&&n>0);const qs=products.map(quality);const brands=new Set(products.map(p=>p.brand).filter(Boolean));const inventory=clamp(Math.min(1,products.length/24)*100);const visual=qs.length?Math.round(qs.reduce((a,b)=>a+b,0)/qs.length):0;const diversity=clamp(Math.min(1,brands.size/10)*100);const evidence=clamp(inventory*.38+visual*.30+diversity*.14+(prices.length?18:0));const opportunity=clamp(evidence*.52+novelty*.22+visual*.14+diversity*.12);const m=median(prices);return {inventory,visual,diversity,evidence,opportunity,ticket:m>=250?"high":m>=80?"mid":"low",price:{min:prices.length?Math.min(...prices):0,median:Math.round(m*100)/100,max:prices.length?Math.max(...prices):0},productCount:products.length,brandCount:brands.size}}

export async function POST(req:NextRequest){
 try{
  await requireYnotAdmin(req);
  const body=await req.json().catch(()=>({}));
  const origin=req.nextUrl.origin;
  const seedName=String(body?.seedName||"Specialist market").slice(0,120);
  const seedQuery=String(body?.seedQuery||"").trim().slice(0,500);
  if(!seedQuery)return NextResponse.json({ok:false,error:"SEED_QUERY_REQUIRED"},{status:400});
  const depth=Math.max(1,Math.min(4,Number(body?.depth||1)));
  const maxBranches=Math.max(4,Math.min(10,Number(body?.maxBranches||8)));
  const rootProducts=await catalog(origin,seedQuery);
  const rootTerms=keywords(rootProducts);
  const selectedAxes=AXES.slice((depth-1)*5).concat(AXES.slice(0,(depth-1)*5)).slice(0,maxBranches);
  const branches=await Promise.all(selectedAxes.map(async(axis,index)=>{
   const signal=rootTerms[index%Math.max(1,rootTerms.length)]||"";
   const q=`${seedQuery} ${signal} ${axis.terms}`.replace(/\s+/g," ").trim();
   try{
    const products=await catalog(origin,q);
    const novelty=clamp(68+depth*6+(index%5)*4+(products.length<8?8:0));
    const metrics=score(products,novelty);
    return {id:`${axis.id}-${depth}-${index}`,parent:seedName,depth,name:`${seedName} → ${axis.label}${signal?` · ${signal}`:""}`,query:q,axis:axis.id,axisLabel:axis.label,why:axis.why,signal,products:products.slice(0,10),metrics,strategy:{content:axis.id==="repair"||axis.id==="measure"?"Reveal a hidden problem, then demonstrate the specialist tool.":axis.id==="luxury"?"Lead with the visual difference and craftsmanship, then explain why the premium exists.":"Teach the use case first, then reveal the product ecosystem.",paid:metrics.ticket==="high"?"Education/proof creative → engaged-viewer retargeting → product/world conversion.":"Problem/use-case hook → product collection → YNOT world → retargeting.",ynot:"Keep the YNOT interface constant while swapping this specialist branch into the product world.",next:"If evidence is strong, recurse again from this branch using adjacent ownership problems."}};
   }catch(error){
    return {id:`${axis.id}-${depth}-${index}`,parent:seedName,depth,name:`${seedName} → ${axis.label}`,query:q,axis:axis.id,axisLabel:axis.label,why:axis.why,signal,products:[],metrics:{inventory:0,visual:0,diversity:0,evidence:0,opportunity:0,ticket:"unknown",price:{min:0,median:0,max:0},productCount:0,brandCount:0},error:error instanceof Error?error.message:"BRANCH_FAILED"};
   }
  }));
  const ranked=branches.sort((a,b)=>b.metrics.opportunity-a.metrics.opportunity);
  return NextResponse.json({ok:true,seed:{name:seedName,query:seedQuery,depth,rootProductCount:rootProducts.length,rootTerms},branches:ranked,summary:{tested:branches.length,live:branches.filter(x=>x.metrics.productCount>0).length,highEvidence:branches.filter(x=>x.metrics.evidence>=65).length,best:ranked[0]?.name||null}});
 }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"RECURSIVE_INTELLIGENCE_ERROR"},{status:adminErrorStatus(error)})}
}
