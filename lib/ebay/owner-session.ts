import {NextRequest} from "next/server";
import {createHmac,timingSafeEqual} from "node:crypto";
export const EBAY_OWNER_COOKIE="ynot_ebay_connect_session";
export const EBAY_OWNER_TTL=600;
export function ownerPin(){return process.env.YNOT_EBAY_DASHBOARD_PIN||""}
export function ownerSignature(v:string){return createHmac("sha256",ownerPin()).update(v).digest("hex")}
export function validEbayOwnerSession(req:NextRequest){
 const pin=ownerPin(),value=req.cookies.get(EBAY_OWNER_COOKIE)?.value||"";
 if(!pin||!value)return false;
 const [expiry,mac]=value.split(".");
 if(!expiry||!mac||!/^\d+$/.test(expiry)||Number(expiry)<Date.now())return false;
 const actual=ownerSignature(expiry);
 return mac.length===actual.length&&timingSafeEqual(Buffer.from(mac),Buffer.from(actual));
}
