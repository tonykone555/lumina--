import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const DEFAULT_OBJECTS_ENDPOINT="https://tonykone555--ynot-room-objects-room-objects.modal.run";

function modalHeaders():HeadersInit{
  const headers:HeadersInit={};
  const token=String(process.env.MODAL_ROOM_TOKEN||"").trim();
  if(token)headers.Authorization=`Bearer ${token}`;
  return headers;
}

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id:rawId}=await params;
  const id=String(rawId||"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,80);
  if(!id)return NextResponse.json({error:"Missing room id",code:"ROOM_ID_REQUIRED"},{status:400});

  const url=new URL(String(process.env.MODAL_ROOM_OBJECTS_ENDPOINT||DEFAULT_OBJECTS_ENDPOINT).trim());
  url.searchParams.set("id",id);
  if(new URL(request.url).searchParams.get("refresh")==="true")url.searchParams.set("refresh","true");

  try{
    const response=await fetch(url,{headers:modalHeaders(),cache:"no-store",signal:AbortSignal.timeout(120_000)});
    const data=await response.json().catch(()=>({})) as Record<string,unknown>;
    if(!response.ok){
      return NextResponse.json({
        error:String(data?.detail||data?.error||"Furniture detection is not ready."),
        code:response.status===404?"ROOM_OBJECTS_NOT_READY":"ROOM_OBJECTS_FAILED",
        id,
      },{status:response.status===404?404:502,headers:{"Cache-Control":"no-store"}});
    }
    const objects=Array.isArray(data.objects)?data.objects:[];
    return NextResponse.json({
      id,
      status:String(data.status||"complete"),
      sourceView:data.sourceView,
      detector:data.detector,
      objectCount:objects.length,
      objects,
      measurementDisclaimer:data.measurementDisclaimer,
      catalogueMatching:"client-live-catalogue",
    },{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("[ynot-room] furniture detection unavailable",{id,error:error instanceof Error?error.message:"unknown"});
    return NextResponse.json({error:"Furniture detection could not be reached.",code:"ROOM_OBJECTS_UNREACHABLE",id},{status:502,headers:{"Cache-Control":"no-store"}});
  }
}
