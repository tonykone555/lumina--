import {NextRequest,NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {EBAY_OWNER_COOKIE,EBAY_OWNER_TTL,ownerPin,ownerSignature} from "@/lib/ebay/owner-session";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 const origin=req.headers.get("origin");
 if(!origin||new URL(origin).host!==req.nextUrl.host)return NextResponse.json({error:"INVALID_ORIGIN"},{status:403});
 const body=await req.json().catch(()=>({}));
 const expected=ownerPin(),supplied=String(body.pin||"");
 if(!expected||!supplied||supplied.length!==expected.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return NextResponse.json({error:"INVALID_OWNER_PIN"},{status:401});
 const expiry=String(Date.now()+EBAY_OWNER_TTL*1000),response=NextResponse.json({ok:true});
 response.cookies.set(EBAY_OWNER_COOKIE,`${expiry}.${ownerSignature(expiry)}`,{httpOnly:true,secure:true,sameSite:"lax",path:"/api/ebay/oauth",maxAge:EBAY_OWNER_TTL});
 return response;
}
