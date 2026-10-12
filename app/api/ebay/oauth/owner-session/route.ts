import {NextRequest,NextResponse} from "next/server";
import {createHmac,timingSafeEqual} from "node:crypto";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const COOKIE="ynot_ebay_connect_session";
const TTL=600;
function key(){return process.env.YNOT_EBAY_DASHBOARD_PIN||""}
function signature(value:string){return createHmac("sha256",key()).update(value).digest("hex")}
export function validSession(req:NextRequest){
 const pin=key();const value=req.cookies.get(COOKIE)?.value||"";
 if(!pin||!value)return false;
 const [expiry,mac]=value.split(".");
 if(!expiry||!mac||!/^\\d+$/.test(expiry)||Number(expiry)<Date.now())return false;
 const actual=signature(expiry);
 return mac.length===actual.length&&timingSafeEqual(Buffer.from(mac),Buffer.from(actual));
}
export async function POST(req:NextRequest){
 const origin=req.headers.get("origin");
 if(!origin||new URL(origin).host!==req.nextUrl.host)return NextResponse.json({error:"INVALID_ORIGIN"},{status:403});
 const body=await req.json().catch(()=>({}));
 const expected=key();const supplied=String(body.pin||"");
 if(!expected||!supplied||supplied.length!==expected.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return NextResponse.json({error:"INVALID_OWNER_PIN"},{status:401});
 const expiry=String(Date.now()+TTL*1000);
 const response=NextResponse.json({ok:true});
 response.cookies.set(COOKIE,`${expiry}.${signature(expiry)}`,{httpOnly:true,secure:true,sameSite:"lax",path:"/api/ebay/oauth",maxAge:TTL});
 return response;
}
