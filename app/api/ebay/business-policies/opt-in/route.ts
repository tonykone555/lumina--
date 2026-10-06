import {NextRequest,NextResponse} from "next/server";
import {ensureEbaySellingPolicyManagement,getEbayReadiness} from "@/lib/ebay/client";
import {requireYnotAdmin,adminErrorStatus} from "@/lib/ynot/admin-server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request:NextRequest){
 try{
  await requireYnotAdmin(request);
  const program=await ensureEbaySellingPolicyManagement();
  const readiness=await getEbayReadiness();
  return NextResponse.json({ok:true,program,readiness},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const status=adminErrorStatus(error);
  return NextResponse.json({error:error instanceof Error?error.message:"EBAY_POLICY_OPT_IN_FAILED"},{status:status===500?400:status});
 }
}
