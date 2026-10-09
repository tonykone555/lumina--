import {createHash,timingSafeEqual} from "crypto";
import type {NextRequest,NextResponse} from "next/server";

const COOKIE="ynot-marketplace-owner";

function secret(){
 return String(process.env.YNOT_MARKETPLACE_DRAFT_PIN||process.env.YNOT_EBAY_DASHBOARD_PIN||"").trim();
}
function tokenFor(pin:string){
 return createHash("sha256").update(`ynot-marketplace-owner:v1:${pin}`).digest("hex");
}
function safeEqual(a:string,b:string){
 const aa=Buffer.from(a),bb=Buffer.from(b);
 return aa.length===bb.length&&timingSafeEqual(aa,bb);
}

export function marketplaceOwnerConfigured(){return Boolean(secret())}

export function marketplaceOwnerAuthorized(request:NextRequest){
 const expected=secret();
 if(!expected)return false;
 const cookie=String(request.cookies.get(COOKIE)?.value||"");
 return Boolean(cookie&&safeEqual(cookie,tokenFor(expected)));
}

export function verifyMarketplaceOwnerPin(pin:string){
 const expected=secret();
 return Boolean(expected&&pin&&safeEqual(String(pin).trim(),expected));
}

export function setMarketplaceOwnerCookie(response:NextResponse){
 const pin=secret();
 if(!pin)throw new Error("MARKETPLACE_OWNER_PIN_NOT_CONFIGURED");
 response.cookies.set(COOKIE,tokenFor(pin),{
  httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:60*60*12
 });
}

export function clearMarketplaceOwnerCookie(response:NextResponse){
 response.cookies.set(COOKIE,"",{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:0});
}
