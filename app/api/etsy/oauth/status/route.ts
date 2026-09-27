import {NextRequest,NextResponse} from "next/server";
import {etsyOauthReady,readEtsyConnection} from "@/lib/etsy/oauth";
import {getEtsyAccessToken} from "@/lib/etsy/auth";

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
 try{
  const token=await getEtsyAccessToken(request);
  apiTokenAvailable=Boolean(token.accessToken);
  sessionConnected=sessionConnected||apiTokenAvailable;
 }catch{}

 const persistentConnected=Boolean(connection?.access_token&&connection?.refresh_token);
 return NextResponse.json({
  configured:etsyOauthReady(),
  connected:persistentConnected||sessionConnected,
  persistentConnected,
  sessionConnected,
  apiTokenAvailable,
  userId:connection?.etsy_user_id||null,
  scope:connection?.scope||null,
  expiresAt:connection?.expires_at||request.cookies.get("etsy_token_expires_at")?.value||null,
  storageError
 },{headers:{"Cache-Control":"no-store, no-cache, must-revalidate"}});
}
