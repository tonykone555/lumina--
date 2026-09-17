import {NextRequest,NextResponse} from "next/server";
import {adminDb,adminErrorStatus,requireYnotAdmin} from "@/lib/ynot/admin-server";
import {optionalAiJson,productReasoning,combinationCandidates,RESEARCH_AXES,type CatalogueProduct} from "@/lib/ynot/commercial-intelligence";

export const runtime="nodejs";
export const maxDuration=60;

type AgentResult={key:string;name:string;phase:number;usedAi:boolean;output:any};

async function catalogue(origin:string,q:string,limit=36){
 const u=new URL("/api/catalog",origin);
 u.searchParams.set("q",q);u.searchParams.set("source","shopify");u.searchParams.set("limit",String(limit));
 const r=await fetch(u,{cache:"no-store"});const d=await r.json().catch(()=>({}));
 const rows:(CatalogueProduct[])=(Array.isArray(d?.products)?d.products:[]).filter((p:CatalogueProduct)=>p?.id&&p?.title&&p?.image&&p?.url&&p.url!=="#");
 return Array.from(new Map(rows.map(p=>[`${String(p.title).toLowerCase()}|${String(p.brand||"").toLowerCase()}`,p])).values());
}

function sampleProducts(products:CatalogueProduct[]){return products.slice(0,14).map(p=>({id:p.id,title:p.title,brand:p.brand,price:p.price,currency:p.currency,tags:p.tags,imageCount:[p.image,...(p.images||[])].filter(Boolean).length}))}

async function persistOutput(runId:string,nodeId:string,result:AgentResult){
 await adminDb("ynot_intelligence_agent_outputs",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({run_id:runId,market_node_id:nodeId,agent_key:result.key,agent_name:result.name,phase:result.phase,used_ai:result.usedAi,output:result.output})});
}

export async function POST(req:NextRequest){
 try{
  const admin=await requireYnotAdmin(req);const body=await req.json().catch(()=>({}));const action=String(body?.action||"run");
  if(action==="history"){
   const nodeId=String(body?.nodeId||"");
   const runs=await adminDb(`ynot_intelligence_agent_runs?market_node_id=eq.${encodeURIComponent(nodeId)}&select=*&order=created_at.desc&limit=8`);
   const runId=runs?.[0]?.id;const outputs=runId?await adminDb(`ynot_intelligence_agent_outputs?run_id=eq.${runId}&select=*&order=phase.asc,created_at.asc`):[];
   return NextResponse.json({ok:true,runs:runs||[],outputs:outputs||[]});
  }
  const nodeId=String(body?.nodeId||"");if(!nodeId)return NextResponse.json({ok:false,error:"NODE_ID_REQUIRED"},{status:400});
  const nodes=await adminDb(`ynot_market_nodes?id=eq.${encodeURIComponent(nodeId)}&select=*&limit=1`);const node=nodes?.[0];if(!node)return NextResponse.json({ok:false,error:"NODE_NOT_FOUND"},{status:404});
  const products=await catalogue(req.nextUrl.origin,node.query||node.name,42);const deterministic=products.slice(0,20).map(p=>({...p,intelligence:productReasoning(p,node.name)}));
  const combos=combinationCandidates(deterministic,node.name);
  const evidence={node:{name:node.name,query:node.query,nodeType:node.node_type,status:node.status,depth:node.depth,scores:{opportunity:node.opportunity_score,evidence:node.evidence_score,discovery:node.discovery_score,conversion:node.conversion_score,organic:node.organic_score,ynot:node.ynot_fit_score,crossSell:node.cross_sell_score,highTicket:node.high_ticket_score,repeat:node.repeat_purchase_score},productCount:node.product_count,merchantCount:node.merchant_count,price:{min:node.price_min,median:node.price_median,max:node.price_max},archetypes:node.archetypes,audience:node.audience},products:sampleProducts(products),deterministicProductSignals:deterministic.slice(0,10).map((p:any)=>({title:p.title,why:p.intelligence.why,archetypes:p.intelligence.archetypes,advertability:p.intelligence.advertabilityScore,novelty:p.intelligence.noveltyScore,audience:p.intelligence.audience})),combinationSignals:combos.slice(0,5).map(c=>({name:c.name,type:c.type,logic:c.logic,score:c.score,products:c.products.map(p=>p.title)}))};

  const runRows=await adminDb("ynot_intelligence_agent_runs",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({market_node_id:nodeId,created_by:admin.profile.id,status:"running",model:String(process.env.YNOT_INTELLIGENCE_MODEL||"configured-default"),used_ai:false,input_snapshot:evidence,final_decision:{}})});const run=runRows?.[0];if(!run)throw new Error("COUNCIL_RUN_CREATE_FAILED");

  const phase1Specs=[
   {key:"explorer",name:"Explorer Agent",system:"You are YNOT's Explorer Agent. Return JSON only. Using only the supplied catalogue evidence, identify non-obvious adjacent commercial pathways and micro-niches worth testing. Make unusual but defensible connections across accessories, ownership problems, professional workflows, before/during/after use, premium versions, accessibility, maintenance, safety, automation and complementary markets. Do not claim demand or performance that is not in the evidence.",fallback:{mission:"find adjacent commercial pathways",adjacentPaths:RESEARCH_AXES.slice(0,10).map(a=>({name:`${node.name} → ${a[1]}`,query:`${node.query||node.name} ${a[2]}`,why:a[2]})),surprises:[],confidence:"evidence-led"}},
   {key:"market_analyst",name:"Market Analyst",system:"You are YNOT's Market Analyst. Return JSON only. Evaluate the commercial structure of the niche from supplied evidence: customer archetypes, price architecture, purchase motivations, content potential, direct-response potential, ecosystem depth, high-ticket and repeat-purchase paths. Separate observed evidence from hypotheses.",fallback:{marketShape:{archetypes:node.archetypes||[],audiences:node.audience||[],price: evidence.node.price,productCount:products.length},strengths:["catalogue-backed product set"],weaknesses:products.length<8?["thin catalogue sample"]:[],hypotheses:["test discovery and conversion lanes separately"]}},
   {key:"product_analyst",name:"Product Analyst",system:"You are YNOT's Product Analyst. Return JSON only. From the supplied real catalogue products, identify representative hero products, overlooked products, high-ticket anchors, low-ticket entry products, and products with strong reveal/demo potential. Explain why each matters without inventing attributes not provided.",fallback:{heroProducts:deterministic.slice(0,4).map((p:any)=>({id:p.id,title:p.title,why:p.intelligence.why,score:p.intelligence.advertabilityScore})),overlooked:deterministic.slice(4,8).map((p:any)=>({id:p.id,title:p.title,why:p.intelligence.why})),selectionLogic:"visual quality + specific problem/use case + catalogue evidence"}},
   {key:"graph_builder",name:"Graph Builder",system:"You are YNOT's Graph Builder. Return JSON only. Build semantic relationships among the supplied products, audiences, problems and adjacent micro-niches. Use relation types such as complements, used_before, used_after, protects, powers, measures, maintains, upgrades, alternative, professional_version, accessible_version, same_audience and same_moment. Only infer relationships that are plausible from the supplied names/tags and label uncertain ones as hypotheses.",fallback:{relationships:deterministic.slice(0,8).flatMap((p:any,i:number)=>i<7?[{from:p.title,to:deterministic[i+1]?.title,type:"same_audience",confidence:55}]:[]),marketLinks:[]}},
   {key:"bundle_analyst",name:"Bundle Analyst",system:"You are YNOT's Bundle Analyst. Return JSON only. Build useful product combinations from supplied products. A combination must share an audience, moment, task, setup, or before/during/after journey. Include starter, professional, hero-plus-essentials, high-ticket-plus-add-ons and discovery collections where supported. Never create random bundles.",fallback:{combinations:combos.slice(0,5).map(c=>({name:c.name,type:c.type,logic:c.logic,score:c.score,products:c.products.map(p=>({id:p.id,title:p.title}))}))}}
  ];

  const phase1=await Promise.all(phase1Specs.map(async spec=>{const r=await optionalAiJson(spec.system,evidence,spec.fallback);return {key:spec.key,name:spec.name,phase:1,usedAi:r.usedAi,output:r.value} as AgentResult}));
  for(const r of phase1)await persistOutput(run.id,nodeId,r);

  const critiqueInput={evidence,agentOutputs:Object.fromEntries(phase1.map(r=>[r.key,r.output]))};
  const skepticFallback={verdict:Number(node.evidence_score||0)>=55?"proceed_with_test":"hold_for_more_evidence",risks:[products.length<6?"Low live product depth":null,Number(node.merchant_count||0)<3?"Merchant diversity is weak":null,Number(node.evidence_score||0)<50?"Evidence score is below validation threshold":null].filter(Boolean),questions:["Is this niche truly distinct from already-explored markets?","Are enough merchants represented?","Are the products visually strong enough for creative testing?"],whatWouldDisprove:["catalogue branches repeatedly return irrelevant products","merchant diversity stays very low","creative assets are too weak to explain the use case"]};
  const skepticAi=await optionalAiJson("You are YNOT's Skeptic Agent. Return JSON only. Try to disprove the opportunity. Challenge novelty, catalogue relevance, merchant diversity, price viability, audience size assumptions, bundle coherence, creative viability and whether adjacent niches are actually distinct. Do not be agreeable. Distinguish missing evidence from actual negative evidence.",critiqueInput,skepticFallback);
  const skeptic:AgentResult={key:"skeptic",name:"Skeptic Agent",phase:2,usedAi:skepticAi.usedAi,output:skepticAi.value};await persistOutput(run.id,nodeId,skeptic);

  const judgeInput={...critiqueInput,skeptic:skeptic.output};
  const evidenceScore=Number(node.evidence_score||0),opportunity=Number(node.opportunity_score||0);const deterministicDecision=evidenceScore>=65&&opportunity>=65?"promote":evidenceScore>=42?"test":"hold";
  const judgeFallback={decision:deterministicDecision,confidence:Math.round(Math.min(95,45+evidenceScore*.35+Number(node.merchant_count||0)*2)),why:`Decision is gated by catalogue evidence (${Math.round(evidenceScore)}) and opportunity score (${Math.round(opportunity)}).`,nextActions:deterministicDecision==="promote"?["analyze products","build combinations","generate creative tests","expand strongest child branch"]:deterministicDecision==="test"?["run a small creative test","expand one or two evidence-rich branches","collect stronger catalogue evidence"]:["do not promote yet","search adjacent queries","re-evaluate after stronger evidence"],approvedPaths:[],rejectedClaims:["No historical ad performance is assumed until campaign data exists."]};
  const judgeAi=await optionalAiJson("You are YNOT's Evidence Judge. Return JSON only. Make the final research decision using catalogue evidence plus all agent outputs and the Skeptic critique. Allowed decisions: promote, test, hold, reject. Never treat model predictions as historical performance. Explain the evidence threshold, identify which hypotheses are worth testing, and specify next actions.",judgeInput,judgeFallback);
  const judge:AgentResult={key:"evidence_judge",name:"Evidence Judge",phase:3,usedAi:judgeAi.usedAi,output:judgeAi.value};await persistOutput(run.id,nodeId,judge);

  const all=[...phase1,skeptic,judge];const usedAi=all.some(x=>x.usedAi);
  await adminDb(`ynot_intelligence_agent_runs?id=eq.${run.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"completed",used_ai:usedAi,final_decision:judge.output})});
  await adminDb("ynot_intelligence_decisions",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({market_node_id:nodeId,decision_type:"multi_agent_council",decision:String(judge.output?.decision||deterministicDecision),confidence:Number(judge.output?.confidence||0),rationale:judge.output,inputs:{runId:run.id,usedAi,agentKeys:all.map(x=>x.key)}})}).catch(()=>null);
  return NextResponse.json({ok:true,run:{...run,status:"completed",used_ai:usedAi,final_decision:judge.output},agents:all,decision:judge.output,usedAi});
 }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"AGENT_COUNCIL_ERROR"},{status:adminErrorStatus(error)})}
}
