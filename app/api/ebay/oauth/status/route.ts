import {NextRequest,NextResponse} from "next/server";
import {ebayConfigDiagnostics} from "@/lib/ebay/auth";
import {ebayOauthReady,readEbayConnection} from "@/lib/ebay/oauth";
import {getEbayReadiness} from "@/lib/ebay/client";
import {requireYnotAdmin,adminErrorStatus} from "@/lib/ynot/admin-server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:NextRequest){
 try{await requireYnotAdmin(request)}
 catch(error){return NextResponse.json({error:error instanceof Error?error.message:"OWNER_ACCESS_REQUIRED"},{status:adminErrorStatus(error)})}
 let connection=null,storageError:string|null=null;
 try{connection=await readEbayConnection()}
 catch(error){storageError=error instanceof Error?error.message:"EBAY_OAUTH_STORAGE_READ_FAILED"}
 let readiness=null,verificationError:string|null=null;
 if(connection&&new URL(request.url).searchParams.get("verify")==="1"){
  try{readiness=await getEbayReadiness()}
  catch(error){verificationError=error instanceof Error?error.message:"EBAY_VERIFY_FAILED"}
 }
 return NextResponse.json({
  configured:ebayOauthReady(),
  connected:Boolean(connection?.refresh_token),
  expiresAt:connection?.expires_at||null,
  refreshTokenExpiresAt:connection?.refresh_token_expires_at||null,
  scope:connection?.scope||null,
  storageError,verificationError,readiness,config:ebayConfigDiagnostics()
 },{headers:{"Cache-Control":"no-store, no-cache, must-revalidate"}});
}
