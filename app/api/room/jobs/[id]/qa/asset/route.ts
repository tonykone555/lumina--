import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const DEFAULT_QA_ASSET_ENDPOINT="https://tonykone555--ynot-room-qa-room-qa-asset.modal.run";
const ALLOWED_KINDS=new Set(["render","heatmap","edges"]);

function modalHeaders():HeadersInit{
  const headers:HeadersInit={};
  const token=String(process.env.MODAL_ROOM_TOKEN||"").trim();
  if(token)headers.Authorization=`Bearer ${token}`;
  return headers;
}

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const safeId=String(id||"").trim();
  const requestUrl=new URL(request.url);
  const view=String(requestUrl.searchParams.get("view")||"").trim();
  const kind=String(requestUrl.searchParams.get("kind")||"").trim().toLowerCase();
  if(!safeId||!view||!ALLOWED_KINDS.has(kind)){
    return NextResponse.json({error:"Invalid QA evidence request",code:"ROOM_QA_ASSET_INVALID"},{status:400});
  }

  const endpoint=String(process.env.MODAL_ROOM_QA_ASSET_ENDPOINT||DEFAULT_QA_ASSET_ENDPOINT).trim();
  const url=new URL(endpoint);
  url.searchParams.set("id",safeId);
  url.searchParams.set("view",view);
  url.searchParams.set("kind",kind);

  try{
    const response=await fetch(url,{headers:modalHeaders(),cache:"no-store",signal:AbortSignal.timeout(30_000)});
    if(!response.ok){
      return NextResponse.json({error:"QA evidence image is not available.",code:"ROOM_QA_ASSET_UNAVAILABLE",id:safeId},{status:response.status===404?404:502});
    }
    const bytes=await response.arrayBuffer();
    return new NextResponse(bytes,{
      status:200,
      headers:{
        "Content-Type":"image/jpeg",
        "Content-Disposition":`inline; filename="ynot-room-${safeId}-${view}-${kind}.jpg"`,
        "Cache-Control":"private, max-age=3600",
      },
    });
  }catch(error){
    console.error("[ynot-room] QA asset proxy failed",{id:safeId,view,kind,error:error instanceof Error?error.message:"unknown"});
    return NextResponse.json({error:"The QA evidence service could not be reached.",code:"ROOM_QA_ASSET_UNREACHABLE",id:safeId},{status:502});
  }
}
