import {NextResponse} from "next/server";
import {readIndependentEbayToken} from "@/lib/ebay/independent-store";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  const existing=await readIndependentEbayToken();
  return NextResponse.json({storage:"ready",sellerConnected:Boolean(existing?.refresh_token)},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({storage:"unavailable"},{status:503,headers:{"Cache-Control":"no-store"}})}
}
