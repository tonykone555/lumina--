import {NextResponse} from "next/server";
import {deleteEtsyConnection} from "@/lib/etsy/oauth";

export const runtime="nodejs";

export async function POST(){
 await deleteEtsyConnection();
 const response=NextResponse.json({disconnected:true});
 for(const name of ["etsy_access_token","etsy_refresh_token","etsy_token_expires_at","etsy_oauth_state","etsy_oauth_verifier"]){
  response.cookies.set(name,"",{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:0});
 }
 return response;
}
