import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const MAX_PHOTOS=8;
const MAX_TOTAL_BYTES=14*1024*1024;
const ALLOWED_TYPES=new Set(["image/jpeg","image/png","image/webp"]);
const DEFAULT_SUBMIT_ENDPOINT="https://tonykone555--ynot-room-submit-submit-room.modal.run";
const DEFAULT_STATUS_ENDPOINT="https://tonykone555--ynot-room-room-status.modal.run";
const DEFAULT_QA_ENDPOINT="https://tonykone555--ynot-room-qa-room-qa.modal.run";
const DEFAULT_AUTOPILOT_ENDPOINT="https://tonykone555--ynot-room-autopilot-schedule-repair.modal.run";

function jsonError(status:number,error:string,code:string,extra:Record<string,unknown>={}){
  return NextResponse.json({error,code,...extra},{status});
}

function modalHeaders():HeadersInit{
  const headers:HeadersInit={};
  const token=String(process.env.MODAL_ROOM_TOKEN||"").trim();
  if(token)headers.Authorization=`Bearer ${token}`;
  return headers;
}

function submitHeaders(requestId:string):HeadersInit{
  const headers:HeadersInit={...modalHeaders(),"X-YNOT-Room-Request":requestId};
  const oidc=String(process.env.VERCEL_OIDC_TOKEN||"").trim();
  if(oidc)headers["X-Vercel-OIDC-Token"]=oidc;
  return headers;
}

function numeric(value:unknown){
  const parsed=Number(value);
  return Number.isFinite(parsed)?parsed:0;
}

function recoveryInProgress(repair?:Record<string,unknown>|null){
  const status=String(repair?.status||"");
  return status==="repair_queued"||status==="repair_already_queued"||status==="high_detail_in_progress";
}

function safeViewReports(id:string,value:unknown){
  if(!Array.isArray(value))return [];
  return value.map(item=>{
    const report=(item&&typeof item==="object"?item:{}) as Record<string,unknown>;
    const viewKey=String(report.viewKey||"").trim();
    if(!viewKey)return report;
    const base=`/api/room/jobs/${encodeURIComponent(id)}/qa/asset?view=${encodeURIComponent(viewKey)}`;
    return {...report,assets:{render:`${base}&kind=render`,heatmap:`${base}&kind=heatmap`,edges:`${base}&kind=edges`}};
  });
}

function buildQualityGate(data:Record<string,unknown>,qa?:Record<string,unknown>|null,repair?:Record<string,unknown>|null){
  const status=String(data.status||"");
  const photoCount=numeric(data.photoCount);
  const fusedViewCount=numeric(data.fusedViewCount);
  const hasScene=typeof data.sceneUrl==="string"&&Boolean(data.sceneUrl);
  const coverageRatio=qa?numeric(qa.referenceCoverage):(photoCount>0?Math.min(1,fusedViewCount/photoCount):0);
  const reconstructionPass=status==="ready"&&hasScene;
  const coveragePass=qa?coverageRatio>=.67:(photoCount>=3&&fusedViewCount===photoCount);
  const qaComplete=String(qa?.status||"")==="complete";
  const blockers=Array.isArray(qa?.blockers)?qa.blockers:[];
  const cameraPass=qaComplete&&numeric(qa?.matchedCameraCount)>=Math.min(3,Math.max(1,photoCount));
  const qaCanPublish=qaComplete&&qa?.canPublish===true;
  const repairStatus=String(repair?.status||"");

  return {
    contract:"ynot-home-wizard-v1",
    releaseStatus:qaComplete?String(qa?.releaseStatus||"review_required"):reconstructionPass?"draft":"processing",
    canPublish:qaCanPublish,
    evidence:{uploadedViews:photoCount,alignedViews:fusedViewCount,matchedCameraCount:qaComplete?numeric(qa?.matchedCameraCount):0,coverageRatio:Number(coverageRatio.toFixed(3)),blockerCount:blockers.length},
    repair:{status:repairStatus||(!qaCanPublish&&qaComplete?"pending":"not_needed"),automatic:true},
    checks:{
      reconstruction:{status:reconstructionPass?"pass":"pending",detail:reconstructionPass?"A browser-loadable GLB was generated.":"3D reconstruction is still running."},
      referenceCoverage:{status:coveragePass?"pass":reconstructionPass?"review":"pending",detail:coveragePass?"Reference coverage meets the QA threshold.":reconstructionPass?"Reference coverage is below the QA threshold.":"Reference coverage will be measured after reconstruction."},
      matchedCameraValidation:{status:cameraPass?(blockers.length?"review":"pass"):qaComplete?"review":"pending",detail:qaComplete?`${numeric(qa?.matchedCameraCount)} recovered camera views were rendered and compared with their references.`:"Matched-camera render comparison has not completed yet."},
      physicalLogic:{status:"pending",detail:"Support, mounting, intersections, holes and impossible geometry are reserved for the object-aware physical-logic contract extension."},
      defectAudit:{status:qaComplete?(blockers.length?"review":"pass"):"pending",detail:qaComplete?`${blockers.length} visual blocker${blockers.length===1?"":"s"} detected.`:"Visual blocker classification has not completed yet."},
    },
    releaseRule:"Matched-camera QA and automatic repair must clear critical and major visual blockers before v1 publishability. Object-aware physical-logic validation is a later contract extension.",
  };
}

function browserSafeStatus(data:Record<string,unknown>,id:string,qa?:Record<string,unknown>|null,repair?:Record<string,unknown>|null){
  const baseSafe={...data,...(typeof data.sceneUrl==="string"&&data.sceneUrl?{sceneUrl:`/api/room/jobs/${encodeURIComponent(id)}/scene`}:{})};
  const recovering=qa?.canPublish!==true&&recoveryInProgress(repair);
  const safe=recovering?{
    ...baseSafe,
    status:"processing",
    stage:String(repair?.status||"")==="high_detail_in_progress"?"high_detail_reconstruction":"qa_repair",
    message:String(repair?.status||"")==="high_detail_in_progress"?"YNOT Room is rebuilding this room with the high-detail model.":"YNOT Room is automatically repairing the reconstruction against the reference photos.",
  }:baseSafe;
  const qualityGate=buildQualityGate(data,qa,repair);
  if(!qa)return {...safe,releaseStatus:qualityGate.releaseStatus,repair,qualityGate};
  return {
    ...safe,
    referenceCoverage:numeric(qa.referenceCoverage),
    matchedCameraCount:numeric(qa.matchedCameraCount),
    matchedViews:Array.isArray(qa.matchedViews)?qa.matchedViews:[],
    qa:{status:String(qa.status||"complete"),version:numeric(qa.version),averageScore:numeric(qa.averageScore),viewReports:safeViewReports(id,qa.viewReports),blockers:Array.isArray(qa.blockers)?qa.blockers:[],canPublish:qa.canPublish===true},
    repair:repair||undefined,
    releaseStatus:String(qa.releaseStatus||qualityGate.releaseStatus),
    qualityGate,
  };
}

async function readQa(id:string){
  const endpoint=String(process.env.MODAL_ROOM_QA_ENDPOINT||DEFAULT_QA_ENDPOINT).trim();
  const url=new URL(endpoint);url.searchParams.set("id",id);
  try{
    const response=await fetch(url,{headers:modalHeaders(),cache:"no-store",signal:AbortSignal.timeout(40_000)});
    if(!response.ok)return null;
    return await response.json().catch(()=>null) as Record<string,unknown>|null;
  }catch(error){
    console.warn("[ynot-room] matched-camera QA not ready",{id,error:error instanceof Error?error.message:"unknown"});
    return null;
  }
}

async function runAutopilot(id:string,qa:Record<string,unknown>|null){
  if(!qa||String(qa.status||"")!=="complete"||qa.canPublish===true)return null;
  const endpoint=String(process.env.MODAL_ROOM_AUTOPILOT_ENDPOINT||DEFAULT_AUTOPILOT_ENDPOINT).trim();
  const url=new URL(endpoint);url.searchParams.set("id",id);
  try{
    const response=await fetch(url,{method:"POST",headers:modalHeaders(),cache:"no-store",signal:AbortSignal.timeout(20_000)});
    if(!response.ok)return {status:"autopilot_unavailable"};
    return await response.json().catch(()=>({status:"autopilot_unknown"})) as Record<string,unknown>;
  }catch(error){
    console.warn("[ynot-room] autopilot scheduling failed",{id,error:error instanceof Error?error.message:"unknown"});
    return {status:"autopilot_unreachable"};
  }
}

export async function GET(request:Request){
  const url=new URL(request.url);
  const id=String(url.searchParams.get("id")||"").trim();
  const statusEndpoint=String(process.env.MODAL_ROOM_STATUS_ENDPOINT||DEFAULT_STATUS_ENDPOINT).trim();
  if(!id)return NextResponse.json({ok:true,configured:true,worker:"modal",qualityContract:"ynot-home-wizard-v1",qa:"matched-camera-v2",autoRepair:true,submitAuth:{vercelOidc:Boolean(process.env.VERCEL_OIDC_TOKEN),sharedSecret:Boolean(process.env.MODAL_ROOM_TOKEN)},maxPhotos:MAX_PHOTOS,accepted:[...ALLOWED_TYPES]},{headers:{"Cache-Control":"no-store"}});

  try{
    const response=await fetch(`${statusEndpoint}?id=${encodeURIComponent(id)}`,{headers:modalHeaders(),cache:"no-store",signal:AbortSignal.timeout(12_000)});
    const data=await response.json().catch(()=>({})) as Record<string,unknown>;
    if(!response.ok)return jsonError(response.status===404?404:502,String(data?.detail||data?.error||"Could not read room status."),"ROOM_STATUS_UNAVAILABLE",{id});
    const ready=String(data.status||"")==="ready"&&typeof data.sceneUrl==="string"&&Boolean(data.sceneUrl);
    const qa=ready?await readQa(id):null;
    const repair=ready?await runAutopilot(id,qa):null;
    return NextResponse.json(browserSafeStatus(data,id,qa,repair),{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("[ynot-room] status lookup failed",{id,error:error instanceof Error?error.message:"unknown"});
    return jsonError(502,"The room worker status endpoint could not be reached.","ROOM_STATUS_UNREACHABLE",{id});
  }
}

export async function POST(request:Request){
  const endpoint=String(process.env.MODAL_ROOM_ENDPOINT||DEFAULT_SUBMIT_ENDPOINT).trim();
  let incoming:FormData;
  try{incoming=await request.formData()}catch{return jsonError(400,"Invalid room upload.","INVALID_FORM_DATA")}
  const photos=incoming.getAll("photos").filter((value):value is File=>value instanceof File);
  if(photos.length<3)return jsonError(400,"Add at least 3 room photos.","NOT_ENOUGH_PHOTOS");
  if(photos.length>MAX_PHOTOS)return jsonError(400,`A room job can contain at most ${MAX_PHOTOS} photos.`,"TOO_MANY_PHOTOS");
  let totalBytes=0;
  for(const photo of photos){totalBytes+=photo.size;if(!ALLOWED_TYPES.has(photo.type))return jsonError(415,`Unsupported image type: ${photo.type||"unknown"}.`,"UNSUPPORTED_IMAGE_TYPE")}
  if(totalBytes>MAX_TOTAL_BYTES)return jsonError(413,"The prepared room photos are too large. Try fewer photos or lower-resolution images.","ROOM_UPLOAD_TOO_LARGE");

  const style=String(incoming.get("style")||"modern").slice(0,40);
  const roomType=String(incoming.get("roomType")||"living_room").slice(0,40);
  const rawBudget=String(incoming.get("budget")||"").replace(/[^0-9]/g,"").slice(0,9);
  const requestId=crypto.randomUUID();
  const outbound=new FormData();
  photos.forEach((photo,index)=>outbound.append("photos",photo,photo.name||`room-${index+1}.jpg`));
  outbound.set("requestId",requestId);outbound.set("style",style);outbound.set("roomType",roomType);if(rawBudget)outbound.set("budget",rawBudget);outbound.set("source","ynot-room-web");
  const headers=submitHeaders(requestId);
  if(!("X-Vercel-OIDC-Token" in headers)&&!("Authorization" in headers))return jsonError(503,"Secure Room worker identity is not configured for this deployment.","ROOM_WORKER_AUTH_NOT_CONFIGURED",{id:requestId});

  let workerResponse:Response;
  try{workerResponse=await fetch(endpoint,{method:"POST",headers,body:outbound,cache:"no-store",signal:AbortSignal.timeout(25_000)})}
  catch(error){console.error("[ynot-room] worker handoff failed",{requestId,error:error instanceof Error?error.message:"unknown"});return jsonError(502,"The room worker could not be reached.","ROOM_WORKER_UNREACHABLE",{id:requestId})}
  const contentType=workerResponse.headers.get("content-type")||"";
  const workerData=(contentType.includes("application/json")?await workerResponse.json().catch(()=>({})): {}) as Record<string,unknown>;
  if(!workerResponse.ok)return jsonError(workerResponse.status===401?502:502,String(workerData?.detail||workerData?.error||workerData?.message||"The room worker rejected the job."),workerResponse.status===401?"ROOM_WORKER_AUTH_REJECTED":"ROOM_WORKER_REJECTED",{id:requestId});
  const jobId=String(workerData?.id||workerData?.jobId||requestId);
  return NextResponse.json({id:jobId,status:String(workerData?.status||"queued"),stage:String(workerData?.stage||"accepted"),releaseStatus:"processing",sceneUrl:typeof workerData?.sceneUrl==="string"&&workerData.sceneUrl?`/api/room/jobs/${encodeURIComponent(jobId)}/scene`:undefined,previewUrl:typeof workerData?.previewUrl==="string"?workerData.previewUrl:undefined,message:String(workerData?.message||"Your room has been sent to the YNOT reconstruction worker.")},{status:202,headers:{"Cache-Control":"no-store"}});
}
