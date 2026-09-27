import {NextRequest,NextResponse} from "next/server";
import {etsyOauthReady,getEtsyAccessToken as getStoredEtsyAccessToken,readEtsyConnection} from "@/lib/etsy/oauth";
import {etsyConfigDiagnostics,getEtsyAccessToken,setEtsyTokenCookies,type EtsyTokenPayload} from "@/lib/etsy/auth";
import {verifyEtsyAccount} from "@/lib/etsy/verify";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:NextRequest){
 let connection=null;
 let storageError:string|null=null;
 try{
  connection=await readEtsyConnection();
 }catch(error){
  storageError=error instanceof Error?error.message:"ETSY_OAUTH_STORAGE_READ_FAILED";
 }

 // A successful Etsy callback also stores secure token cookies. Treat those as a
 // valid current-session connection even if persistent Supabase storage is not
 // available yet, instead of incorrectly showing "not connected" immediately
 // after the user authorizes YNOT.
 const cookieAccess=Boolean(request.cookies.get("etsy_access_token")?.value);
 const cookieRefresh=Boolean(request.cookies.get("etsy_refresh_token")?.value);
 let sessionConnected=cookieAccess&&(cookieRefresh||Boolean(request.cookies.get("etsy_token_expires_at")?.value));

 // Also resolve the same token path used by Etsy API calls. This supports an
 // explicitly configured server token without exposing any token value.
 let apiTokenAvailable=false;
 let sessionToken="";
 let refreshed:EtsyTokenPayload|null=null;
 try{
  const token=await getEtsyAccessToken(request);
  sessionToken=token.accessToken;
  refreshed=token.refreshed;
  apiTokenAvailable=Boolean(token.accessToken);
  sessionConnected=sessionConnected||apiTokenAvailable;
 }catch{}

 const persistentConnected=Boolean(connection?.access_token&&connection?.refresh_token);

 // ?verify=1 performs real authenticated Etsy calls (GET /users/me, then the
 // shop) so the admin can confirm the connected account. Only non-secret
 // identifiers are returned.
 let verification:Awaited<ReturnType<typeof verifyEtsyAccount>>|null=null;
 let tokenSource:"stored"|"session"|null=null;
 if(new URL(request.url).searchParams.get("verify")==="1"){
  let accessToken="";
  if(persistentConnected){
   try{accessToken=await getStoredEtsyAccessToken();if(accessToken)tokenSource="stored"}catch{}
  }
  if(!accessToken&&sessionToken){accessToken=sessionToken;tokenSource="session"}
  verification=await verifyEtsyAccount(accessToken);
 }

 const response=NextResponse.json({
  configured:etsyOauthReady(),
  connected:persistentConnected||sessionConnected,
  persistentConnected,
  sessionConnected,
  apiTokenAvailable,
  userId:connection?.etsy_user_id||null,
  scope:connection?.scope||null,
  expiresAt:connection?.expires_at||request.cookies.get("etsy_token_expires_at")?.value||null,
  storageError,
  config:etsyConfigDiagnostics(),
  ...(verification?{tokenSource,verification}:{})
 },{headers:{"Cache-Control":"no-store, no-cache, must-revalidate"}});
 if(refreshed)setEtsyTokenCookies(response,refreshed);
 return response;
}
