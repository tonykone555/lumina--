import {NextRequest,NextResponse} from "next/server";
import {requireYnotAdmin,adminErrorStatus} from "@/lib/ynot/admin-server";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 try{await requireYnotAdmin(req);return NextResponse.json({admin:true},{headers:{"Cache-Control":"no-store"}})}
 catch(e){return NextResponse.json({admin:false},{status:adminErrorStatus(e),headers:{"Cache-Control":"no-store"}})}
}