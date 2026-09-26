import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const DEFAULT_STRUCTURE_ENDPOINT="https://tonykone555--ynot-room-structure-room-model.modal.run";

function headers():HeadersInit{
  const result:HeadersInit={};
  const token=String(process.env.MODAL_ROOM_TOKEN||"").trim();
  if(token)result.Authorization=`Bearer ${token}`;
  return result;
}

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const safeId=String(id||"").trim();
  if(!safeId)return NextResponse.json({error:"Missing room id",code:"ROOM_ID_REQUIRED"},{status:400});

  const requestUrl=new URL(request.url);
  const refresh=requestUrl.searchParams.get("refresh")==="true";
  const endpoint=String(process.env.MODAL_ROOM_STRUCTURE_ENDPOINT||DEFAULT_STRUCTURE_ENDPOINT).trim();
  const url=new URL(endpoint);
  url.searchParams.set("id",safeId);
  if(refresh)url.searchParams.set("refresh","true");

  try{
    const response=await fetch(url,{headers:headers(),cache:"no-store",signal:AbortSignal.timeout(30_000)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      return NextResponse.json({
        error:String(data?.detail||data?.error||"Could not build room structure model."),
        code:"ROOM_MODEL_UNAVAILABLE",
        id:safeId,
      },{status:response.status===404?404:502});
    }
    return NextResponse.json(data,{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("[ynot-room] structure model lookup failed",{id:safeId,error:error instanceof Error?error.message:"unknown"});
    return NextResponse.json({error:"The room structure service could not be reached.",code:"ROOM_MODEL_UNREACHABLE",id:safeId},{status:502});
  }
}
