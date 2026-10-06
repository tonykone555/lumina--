import {NextRequest,NextResponse} from "next/server";
import {getEbayReadiness} from "@/lib/ebay/client";
import {requireYnotAdmin,adminErrorStatus} from "@/lib/ynot/admin-server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:NextRequest){
 try{
  await requireYnotAdmin(request);
  return NextResponse.json(await getEbayReadiness(),{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const status=adminErrorStatus(error);
  return NextResponse.json({error:error instanceof Error?error.message:"EBAY_READINESS_FAILED"},{status:status===500?400:status});
 }
}
