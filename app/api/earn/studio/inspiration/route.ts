import {NextRequest,NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/creators/earn";
import {searchPinterestInspiration} from "@/lib/creators/pinterest";

export const runtime="nodejs";
export const maxDuration=120;

export async function GET(req:NextRequest){
 try{
  await authenticatedUser(req);
  const q=String(req.nextUrl.searchParams.get("q")||"").trim();
  const kind=String(req.nextUrl.searchParams.get("kind")||"avatar");
  if(q.length<2)return NextResponse.json({items:[]});
  const suffix=kind==="background"?" aesthetic background interior scene vertical social video":" realistic creator portrait fashion model full body";
  const items=await searchPinterestInspiration(q+suffix,24);
  return NextResponse.json({items,provider:"pinterest-apify"});
 }catch(e){
  const m=e instanceof Error?e.message:"PINTEREST_INSPIRATION_FAILED";
  return NextResponse.json({error:m},{status:/SIGN_IN|SESSION/.test(m)?401:/NOT_CONFIGURED/.test(m)?503:400});
 }
}
