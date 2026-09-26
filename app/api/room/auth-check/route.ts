import {NextResponse} from "next/server";
import {getVercelOidcToken} from "@vercel/oidc";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const SUBMIT_ENDPOINT="https://tonykone555--ynot-room-submit-submit-room.modal.run";
const PROJECT="prj_xDNNAY7MBUIbDHLaJkOdPsUz2C7X";
const TEAM="team_9yqHjLzE6wUmudwIHFS4EutR";

export async function GET(){
  const token=await getVercelOidcToken({project:PROJECT,team:TEAM});
  if(!token)return NextResponse.json({ok:false,oidc:false},{status:503});
  const response=await fetch(SUBMIT_ENDPOINT,{
    method:"POST",
    headers:{"X-Vercel-OIDC-Token":token},
    body:new FormData(),
    cache:"no-store",
    signal:AbortSignal.timeout(20_000),
  });
  const data=await response.json().catch(()=>({}));
  // 400 here means Modal accepted the signed identity and reached form validation.
  const authAccepted=response.status===400&&String(data?.detail||"").includes("At least 3 room photos");
  return NextResponse.json({ok:authAccepted,oidc:true,modalStatus:response.status,authAccepted,detail:authAccepted?"identity accepted":"identity rejected"},{status:authAccepted?200:502,headers:{"Cache-Control":"no-store"}});
}
