import {NextRequest,NextResponse} from "next/server";
import {requireYnotAdmin} from "@/lib/ynot/admin-server";
export const runtime="nodejs";
export async function POST(req:NextRequest){await requireYnotAdmin(req);return NextResponse.json({ok:true})}
