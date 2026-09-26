import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const MAX_PHOTOS=8;
const MAX_TOTAL_BYTES=14*1024*1024;
const ALLOWED_TYPES=new Set(["image/jpeg","image/png","image/webp"]);

function jsonError(status:number,error:string,code:string,extra:Record<string,unknown>={}){
  return NextResponse.json({error,code,...extra},{status});
}

export async function GET(){
  return NextResponse.json({
    ok:true,
    configured:Boolean(process.env.MODAL_ROOM_ENDPOINT),
    worker:"modal",
    maxPhotos:MAX_PHOTOS,
    accepted:[...ALLOWED_TYPES],
  },{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:Request){
  const endpoint=String(process.env.MODAL_ROOM_ENDPOINT||"").trim();
  if(!endpoint)return jsonError(503,"YNOT Room worker is not connected yet.","ROOM_WORKER_NOT_CONFIGURED");

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
  outbound.set("callbackUrl",new URL("/api/room/jobs/callback",request.url).toString());

  const headers:HeadersInit={"X-YNOT-Room-Request":requestId};
  const token=String(process.env.MODAL_ROOM_TOKEN||"").trim();
  if(token)headers.Authorization=`Bearer ${token}`;

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
    return jsonError(502,String(workerData?.error||workerData?.message||"The room worker rejected the job."),"ROOM_WORKER_REJECTED",{id:requestId});
  }

  return NextResponse.json({
    id:String(workerData?.id||workerData?.jobId||requestId),
    status:String(workerData?.status||"queued"),
    sceneUrl:typeof workerData?.sceneUrl==="string"?workerData.sceneUrl:undefined,
    previewUrl:typeof workerData?.previewUrl==="string"?workerData.previewUrl:undefined,
    message:String(workerData?.message||"Your room has been sent to the YNOT reconstruction worker."),
  },{status:202,headers:{"Cache-Control":"no-store"}});
}
