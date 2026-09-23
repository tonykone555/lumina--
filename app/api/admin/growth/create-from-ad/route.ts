// @ts-nocheck
import {NextRequest,NextResponse} from "next/server";
import {adminDb,adminErrorStatus,requireYnotAdmin} from "@/lib/ynot/admin-server";
import {analyseAdForProduct,analyseSourceAd} from "@/lib/intelligence/gemini-ad-creative";
import {scoreCreativeVariants} from "@/lib/intelligence/gemini-creative-score";
import {generateModalAdVariants,modalGrowthImageConfigured} from "@/lib/creators/modal-growth-image";

export const runtime="nodejs";
export const maxDuration=300;

function productImage(product:any){return String(product?.image_url||product?.image||"").trim()}
function productId(product:any){return String(product?.product_id||product?.id||"").trim()}
function hasSource(ad:any){return Boolean(ad?.id||ad?.headline||ad?.title||ad?.body||ad?.imageUrl||ad?.videoUrl||ad?.previewUrl)}

async function saveCreative(input:{ad:any;product:any;analysis:any;direction:any;variants:any[];scores:any[];folderId?:string}){
 const scored=input.variants.map(v=>({...v,score:input.scores.find((s:any)=>Number(s.variantIndex)===Number(v.variantIndex))||null}));
 const best=[...scored].sort((a,b)=>Number(b.score?.overall||0)-Number(a.score?.overall||0))[0];
 const provider="modal-flux2-klein-reference";
 const payload={source:"growth-ad-intelligence",source_ad:input.ad,ad_analysis:input.analysis?.analysis,adaptation:input.analysis?.adaptation,creative_direction:input.direction,generated_variants:scored,provider,folder_id:input.folderId||null,product:{id:productId(input.product),title:input.product?.title,image:productImage(input.product),price:input.product?.price,currency:input.product?.currency,brand:input.product?.brand}};
 let creative:any=null;
 try{const rows=await adminDb("ynot_ad_creatives",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({source_product_ids:[productId(input.product)].filter(Boolean),hook:String(input.direction?.hook||input.analysis?.analysis?.marketing_structure?.hook||"").slice(0,1000),headline:String(input.direction?.name||input.product?.title||"Generated ad concept").slice(0,1000),status:"review",quality_score:Number(best?.score?.overall||0)||null,render_url:best?.url||null,thumbnail_url:best?.url||null,payload,voice_script:null})});creative=rows?.[0]||null}catch(e){console.error("create_from_ad_creative_save",e)}
 if(input.folderId){try{const researchRows=scored.map((v:any)=>({folder_id:input.folderId,kind:"generated-ad",source:"YNOT · Gemini + FLUX.2 Klein",title:`${input.direction?.name||"Creative direction"} · Variant ${v.variantIndex}`,summary:`Original YNOT creative generated from market pattern analysis for ${input.product?.title||"selected product"}.`,image_url:v.url,score:Number(v.score?.overall||0)||null,payload:{creative_id:creative?.id||null,source_ad_id:input.ad?.id||null,product_id:productId(input.product),direction:input.direction,score:v.score,seed:v.seed,provider}}));await adminDb("ynot_growth_research_items",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(researchRows)})}catch(e){console.error("create_from_ad_research_save",e)}}
 return{creative,variants:scored,best};
}

export async function POST(req:NextRequest){
 try{
  await requireYnotAdmin(req);
  const body=await req.json();
  const action=String(body?.action||"analyse-source");
  const ad=body?.ad||{},product=body?.product||{};
  if(action==="analyse-source"){
   if(!hasSource(ad))return NextResponse.json({error:"SOURCE_AD_REQUIRED"},{status:400});
   const sourceAnalysis=await analyseSourceAd({ad,contextAds:Array.isArray(body?.contextAds)?body.contextAds:[]});
   return NextResponse.json({ok:true,stage:"source-analysed",sourceAnalysis});
  }
  if(action==="analyse"){
   if(!hasSource(ad))return NextResponse.json({error:"SOURCE_AD_REQUIRED"},{status:400});
   if(!productId(product)||!productImage(product))return NextResponse.json({error:"PRODUCT_WITH_IMAGE_REQUIRED"},{status:400});
   const analysis=await analyseAdForProduct({ad,product,contextAds:Array.isArray(body?.contextAds)?body.contextAds:[],sourceAnalysis:body?.sourceAnalysis||null});
   return NextResponse.json({ok:true,stage:"adapted",analysis,modalConfigured:modalGrowthImageConfigured()});
  }
  if(action==="generate"){
   if(!productId(product)||!productImage(product))return NextResponse.json({error:"PRODUCT_WITH_IMAGE_REQUIRED"},{status:400});
   if(!body?.analysis||!body?.direction)return NextResponse.json({error:"ANALYSIS_AND_DIRECTION_REQUIRED"},{status:400});
   if(!modalGrowthImageConfigured())return NextResponse.json({error:"MODAL_NOT_CONFIGURED"},{status:503});
   const generated=await generateModalAdVariants({productImageUrl:productImage(product),directions:[body.direction],variantsPerDirection:4});
   const basic=generated.variants.map((v:any)=>({url:v.url,variantIndex:v.variantIndex,seed:v.seed,directionId:v.directionId,prompt:v.prompt}));
   let scores:any[]=[];try{scores=await scoreCreativeVariants({product,direction:body.direction,variants:basic})}catch(e){console.error("create_from_ad_score",e)}
   const saved=await saveCreative({ad,product,analysis:body.analysis,direction:body.direction,variants:basic,scores,folderId:String(body?.folderId||"")||undefined});
   return NextResponse.json({ok:true,stage:"generated",provider:generated.provider,model:generated.model,gpu:generated.gpu,generationSeconds:generated.generationSeconds,requestId:generated.requestId,...saved});
  }
  return NextResponse.json({error:"INVALID_ACTION"},{status:400});
 }catch(e){const m=e instanceof Error?e.message:"CREATE_FROM_AD_FAILED";console.error("create_from_ad",e);return NextResponse.json({error:m},{status:/NOT_CONFIGURED/.test(m)?503:adminErrorStatus(e)})}
}
