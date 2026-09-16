import {NextRequest,NextResponse} from "next/server";
import {adminDb,adminErrorStatus,requireYnotUser} from "@/lib/ynot/admin-server";

export const runtime="nodejs";

export async function POST(req:NextRequest){
 try{
  const context=await requireYnotUser(req);
  const rows=await adminDb("ynot_admin_access_requests?on_conflict=user_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify({user_id:context.profile.id,auth_user_id:context.authUser.id,status:context.profile.is_admin?"approved":"pending",requested_at:new Date().toISOString()})});
  return NextResponse.json({ok:true,status:context.profile.is_admin?"approved":"pending",requestId:rows?.[0]?.id||null});
 }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"REQUEST_FAILED"},{status:adminErrorStatus(error)})}
}
