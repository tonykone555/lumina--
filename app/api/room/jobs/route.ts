import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const MAX_PHOTOS=8;
const MAX_TOTAL_BYTES=14*1024*1024;
const ALLOWED_TYPES=new Set(["image/jpeg","image/png","image/webp"]);
const DEFAULT_SUBMIT_ENDPOINT="https://tonykone555--ynot-room-submit-room.modal.run";
const DEFAULT_STATUS_ENDPOINT="https://tonykone555--ynot-room-room-status.modal.run";

function jsonError(status:number,error:string,code:string,extra:Record<string,unknown>={}){
  return NextResponse.json({error,code,...extra},{status});
}

function modalHeaders():HeadersInit{
  const headers:HeadersInit={};
  const token=String(process.env.MODAL_ROOM_TOKEN||"").trim();
  if(token)headers.Authorization=`Bearer ${token}`;
  return headers;
}

export async function GET(request:Request){
  const url=new URL(request.url);
  const id=String(url.searchParams.get("id")||"").trim();
  const statusEndpoint=String(process.env.MODAL_ROOM_STATUS_ENDPOINT||DEFAULT_STATUS_ENDPOINT).trim();

  if(!id){
    return NextResponse.json({
      ok:true,
      configured:true,
      worker:"modal",
      maxPhotos:MAX_PHOTOS,
      accepted:[...ALLOWED_TYPES],
    },{headers:{"Cache-Control":"no-store"}});
  }

  try{
    const response=await fetch(`${statusEndpoint}?id=${encodeURIComponent(id)}`,{
      headers:modalHeaders(),
      cache:"no-store",
      signal:AbortSignal.timeout(12_000),
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)return jsonError(response.status===404?404:502,String(data?.detail||data?.error||"Could not read room status."),"ROOM_STATUS_UNAVAILABLE",{id});
    return NextResponse.json(data,{headers:{"Cache-Control":"no-store"}});
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
  for(const photo of photos){
    totalBytes+=photo.size;
    if(!ALLOWED_TYPES.has(photo.type))return jsonError(415,`Unsupported image type: ${photo.type||"unknown"}.`,"UNSUPPORTED_IMAGE_TYPE");
  }
  if(totalBytes>MAX_TOTAL_BYTES)return jsonError(413,"The prepared room photos are too large. Try fewer photos or lower-resolution images.","ROOM_UPLOAD_TOO_LARGE");

  const style=String(incoming.get("style")||"modern").slice(0,40);
  const roomType=String(incoming.get("roomType")||"living_room").slice(0,40);
  const rawBudget=String(incoming.get("budget")||"").replace(/[^0-9]/g,"").slice(0,9);
  const requestId=crypto.randomUUID();

  const outbound=new FormData();
  photos.forEach((photo,index)=>outbound.append("photos",photo,photo.name||`room-${index+1}.jpg`));
  outbound.set("requestId",requestId);
  outbound.set("style",style);
  outbound.set("roomType",roomType);
  if(rawBudget)outbound.set("budget",rawBudget);
  outbound.set("source","ynot-room-web");

  const headers:HeadersInit={...modalHeaders(),"X-YNOT-Room-Request":requestId};

  let workerResponse:Response;
  try{
    workerResponse=await fetch(endpoint,{method:"POST",headers,body:outbound,cache:"no-store",signal:AbortSignal.timeout(25_000)});
  }catch(error){
    console.error("[ynot-room] worker handoff failed",{requestId,error:error instanceof Error?error.message:"unknown"});
    return jsonError(502,"The room worker could not be reached.","ROOM_WORKER_UNREACHABLE",{id:requestId});
  }

  const contentType=workerResponse.headers.get("content-type")||"";
  const workerData=contentType.includes("application/json")?await workerResponse.json().catch(()=>({})):{};
  if(!workerResponse.ok){
    console.error("[ynot-room] worker rejected job",{requestId,status:workerResponse.status,workerCode:workerData?.code});
    return jsonError(502,String(workerData?.detail||workerData?.error||workerData?.message||"The room worker rejected the job."),"ROOM_WORKER_REJECTED",{id:requestId});
  }

  return NextResponse.json({
    id:String(workerData?.id||workerData?.jobId||requestId),
    status:String(workerData?.status||"queued"),
    stage:String(workerData?.stage||"accepted"),
    sceneUrl:typeof workerData?.sceneUrl==="string"?workerData.sceneUrl:undefined,
    previewUrl:typeof workerData?.previewUrl==="string"?workerData.previewUrl:undefined,
    message:String(workerData?.message||"Your room has been sent to the YNOT reconstruction worker."),
  },{status:202,headers:{"Cache-Control":"no-store"}});
}
