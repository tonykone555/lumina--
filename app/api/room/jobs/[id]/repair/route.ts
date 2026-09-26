import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const DEFAULT_REPAIR_ENDPOINT="https://tonykone555--ynot-room-repair-room-repair.modal.run";

function modalHeaders():HeadersInit{
  const headers:HeadersInit={};
  const token=String(process.env.MODAL_ROOM_TOKEN||"").trim();
  if(token)headers.Authorization=`Bearer ${token}`;
  return headers;
}

export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const safeId=String(id||"").trim();
  if(!safeId)return NextResponse.json({error:"Missing room id",code:"ROOM_ID_REQUIRED"},{status:400});

  const endpoint=String(process.env.MODAL_ROOM_REPAIR_ENDPOINT||DEFAULT_REPAIR_ENDPOINT).trim();
  const url=new URL(endpoint);
  url.searchParams.set("id",safeId);
  try{
    const response=await fetch(url,{method:"POST",headers:modalHeaders(),cache:"no-store",signal:AbortSignal.timeout(250_000)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      return NextResponse.json({error:String(data?.detail||data?.error||"Room repair failed."),code:"ROOM_REPAIR_FAILED",id:safeId},{status:response.status===409?409:502});
    }
    return NextResponse.json(data,{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("[ynot-room] repair service failed",{id:safeId,error:error instanceof Error?error.message:"unknown"});
    return NextResponse.json({error:"The room repair service could not be reached.",code:"ROOM_REPAIR_UNREACHABLE",id:safeId},{status:502});
  }
}
