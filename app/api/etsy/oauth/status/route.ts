import {NextResponse} from "next/server";
import {etsyOauthReady,readEtsyConnection} from "@/lib/etsy/oauth";

export const runtime="nodejs";

export async function GET(){
 const connection=await readEtsyConnection();
 return NextResponse.json({
  configured:etsyOauthReady(),
  connected:Boolean(connection?.access_token&&connection?.refresh_token),
  userId:connection?.etsy_user_id||null,
  scope:connection?.scope||null,
  expiresAt:connection?.expires_at||null
 });
}
