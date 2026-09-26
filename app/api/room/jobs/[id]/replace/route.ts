import {NextResponse} from "next/server";
import {getVercelOidcToken} from "@vercel/oidc";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const REPLACE_ENDPOINT="https://tonykone555--ynot-product-3d-set-replacement.modal.run";
const VERCEL_PROJECT="prj_xDNNAY7MBUIbDHLaJkOdPsUz2C7X";
const VERCEL_TEAM="team_9yqHjLzE6wUmudwIHFS4EutR";

async function headers(){
  const result:HeadersInit={"Content-Type":"application/json"};
  const shared=String(process.env.MODAL_ROOM_TOKEN||"").trim();
  if(shared)result.Authorization=`Bearer ${shared}`;
  try{
    const oidc=String(await getVercelOidcToken({project:VERCEL_PROJECT,team:VERCEL_TEAM})||"").trim();
    if(oidc)result["X-Vercel-OIDC-Token"]=oidc;
  }catch{}
  return result;
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id:rawId}=await params;
  const roomId=String(rawId||"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,80);
  if(!roomId)return NextResponse.json({error:"Missing room id",code:"ROOM_ID_REQUIRED"},{status:400});
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  const objectId=String(body?.objectId||"").trim().slice(0,100);
  const productId=String(body?.productId||"").trim().slice(0,300);
  if(!objectId||!productId)return NextResponse.json({error:"objectId and productId are required",code:"ROOM_REPLACEMENT_INPUT_REQUIRED"},{status:400});
  const auth=await headers();
  if(!("X-Vercel-OIDC-Token" in auth)&&!("Authorization" in auth))return NextResponse.json({error:"Secure replacement identity is unavailable",code:"ROOM_REPLACEMENT_AUTH_NOT_CONFIGURED"},{status:503});
  try{
    const response=await fetch(REPLACE_ENDPOINT,{method:"POST",headers:auth,body:JSON.stringify({roomId,objectId,productId}),cache:"no-store",signal:AbortSignal.timeout(25_000)});
    const data=await response.json().catch(()=>({})) as Record<string,unknown>;
    if(!response.ok)return NextResponse.json({error:String(data.detail||data.error||"Could not place product in room"),code:"ROOM_REPLACEMENT_FAILED"},{status:response.status===409?409:502});
    const replacement=(data.replacement&&typeof data.replacement==="object"?data.replacement:{}) as Record<string,unknown>;
    return NextResponse.json({ok:true,roomId,replacement:{...replacement,assetUrl:`/api/room/product-assets/file?productId=${encodeURIComponent(productId)}`}},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("[ynot-room] replacement failed",error);
    return NextResponse.json({error:"Replacement worker could not be reached",code:"ROOM_REPLACEMENT_UNREACHABLE"},{status:502});
  }
}