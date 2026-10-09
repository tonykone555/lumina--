import {NextRequest,NextResponse} from "next/server";
import {ebayConfigDiagnostics} from "@/lib/ebay/auth";
import {ebayOauthReady,readEbayConnection} from "@/lib/ebay/oauth";
import {ensureEbaySellingPolicyManagement,getEbayReadiness} from "@/lib/ebay/client";
import {requireYnotAdmin,adminErrorStatus} from "@/lib/ynot/admin-server";
import {marketplaceOwnerAuthorized} from "@/lib/ynot/marketplace-owner";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:NextRequest){
 if(!marketplaceOwnerAuthorized(request)){
  try{await requireYnotAdmin(request)}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"OWNER_ACCESS_REQUIRED"},{status:adminErrorStatus(error)})}
 }
 let connection=null,storageError:string|null=null;
 try{connection=await readEbayConnection()}
 catch(error){storageError=error instanceof Error?error.message:"EBAY_OAUTH_STORAGE_READ_FAILED"}
 const sessionConnected=Boolean(request.cookies.get("ebay_access_token")?.value||request.cookies.get("ebay_refresh_token")?.value);
 let readiness=null,verificationError:string|null=null;
 if((connection||sessionConnected)&&new URL(request.url).searchParams.get("verify")==="1"){
  try{await ensureEbaySellingPolicyManagement();readiness=await getEbayReadiness()}
  catch(error){verificationError=error instanceof Error?error.message:"EBAY_VERIFY_FAILED"}
 }
 return NextResponse.json({
  configured:ebayOauthReady(),
  connected:Boolean(connection?.refresh_token)||sessionConnected,
  persistentConnected:Boolean(connection?.refresh_token),
  sessionConnected,
  expiresAt:connection?.expires_at||null,
  refreshTokenExpiresAt:connection?.refresh_token_expires_at||null,
  scope:connection?.scope||null,
  storageError,verificationError,readiness,config:ebayConfigDiagnostics()
 },{headers:{"Cache-Control":"no-store, no-cache, must-revalidate"}});
}
