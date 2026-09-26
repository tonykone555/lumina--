import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const DEFAULT_SCENE_ENDPOINT="https://tonykone555--ynot-room-room-scene.modal.run";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const{id}=await params;
  const safeId=String(id||"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,80);
  if(!safeId)return NextResponse.json({error:"Missing room id"},{status:400});

  const endpoint=String(process.env.MODAL_ROOM_SCENE_ENDPOINT||DEFAULT_SCENE_ENDPOINT).trim();
  const headers:HeadersInit={};
  const token=String(process.env.MODAL_ROOM_TOKEN||"").trim();
  if(token)headers.Authorization=`Bearer ${token}`;

  try{
    const response=await fetch(`${endpoint}?id=${encodeURIComponent(safeId)}`,{
      headers,
      cache:"no-store",
      signal:AbortSignal.timeout(30_000),
    });
    if(!response.ok){
      const detail=await response.text().catch(()=>"");
      return NextResponse.json({error:detail||"Room scene unavailable"},{status:response.status===404?404:502});
    }
    const bytes=await response.arrayBuffer();
    return new Response(bytes,{
      status:200,
      headers:{
        "Content-Type":"model/gltf-binary",
        "Content-Length":String(bytes.byteLength),
        "Cache-Control":"public, max-age=31536000, immutable",
      },
    });
  }catch(error){
    console.error("[ynot-room] scene proxy failed",{id:safeId,error:error instanceof Error?error.message:"unknown"});
    return NextResponse.json({error:"Room scene could not be reached"},{status:502});
  }
}
