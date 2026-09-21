import {NextRequest,NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/creators/earn";
import {enrichHostContact} from "@/lib/intelligence/fetchlayer-contacts";

export const runtime="nodejs";

export async function POST(req:NextRequest){
 try{
  await authenticatedUser(req);
  const b=await req.json();
  const hostName=String(b.host_name||b.hostName||"").trim().slice(0,160);
  if(!hostName)return NextResponse.json({error:"HOST_NAME_REQUIRED"},{status:400});
  const result=await enrichHostContact({
   hostName,
   listingTitle:String(b.listing_title||b.listingTitle||"").trim().slice(0,220)||undefined,
   city:String(b.city||"").trim().slice(0,120)||undefined,
   companyHint:String(b.company_hint||b.companyHint||"").trim().slice(0,160)||undefined,
   knownTargets:Array.isArray(b.known_targets)?b.known_targets.map((x:any)=>String(x).slice(0,1200)).slice(0,5):undefined
  });
  return NextResponse.json(result);
 }catch(e){
  const m=e instanceof Error?e.message:"HOST_CONTACT_ENRICHMENT_FAILED";
  return NextResponse.json({error:m},{status:/SIGN_IN|SESSION/.test(m)?401:/FETCHLAYER_NOT_CONFIGURED/.test(m)?503:400});
 }
}
