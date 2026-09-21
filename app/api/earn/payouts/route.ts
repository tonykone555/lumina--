import {NextRequest,NextResponse} from "next/server";
import {authenticatedUser,creatorDashboard,ensureCreator,rest} from "@/lib/creators/earn";

export const runtime="nodejs";

export async function POST(req:NextRequest){
 try{
  const u=await authenticatedUser(req),c=await ensureCreator(u),body=await req.json().catch(()=>({})),currency=String(body.currency||"EUR").toUpperCase().replace(/[^A-Z]/g,"").slice(0,3)||"EUR";
  const rows=await rest("rpc/ynot_request_creator_payout",{method:"POST",body:JSON.stringify({p_creator:c.id,p_currency:currency})});
  return NextResponse.json({ok:true,payout:rows?.[0]||null,dashboard:await creatorDashboard(c)});
 }catch(e){
  const m=e instanceof Error?e.message:"PAYOUT_REQUEST_FAILED";
  const minimum=/MINIMUM_PAYOUT_NOT_REACHED/.test(m);
  return NextResponse.json({error:minimum?"You need at least €20 in cleared earnings before requesting a payout.":m},{status:minimum?409:/SIGN_IN|SESSION/.test(m)?401:400});
 }
}
