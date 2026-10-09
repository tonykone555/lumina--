import {NextRequest,NextResponse} from "next/server";
import {
 marketplaceOwnerAuthorized,marketplaceOwnerConfigured,verifyMarketplaceOwnerPin,
 setMarketplaceOwnerCookie,clearMarketplaceOwnerCookie
} from "@/lib/ynot/marketplace-owner";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:NextRequest){
 return NextResponse.json({
  configured:marketplaceOwnerConfigured(),
  ownerAccess:marketplaceOwnerAuthorized(request)
 },{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:NextRequest){
 const body=await request.json().catch(()=>({}));
 const pin=String(body?.pin||"").trim();
 if(!verifyMarketplaceOwnerPin(pin))return NextResponse.json({ownerAccess:false,error:"INVALID_PIN"},{status:401});
 const response=NextResponse.json({ownerAccess:true});
 setMarketplaceOwnerCookie(response);
 return response;
}

export async function DELETE(){
 const response=NextResponse.json({ownerAccess:false});
 clearMarketplaceOwnerCookie(response);
 return response;
}
