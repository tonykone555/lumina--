import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const BUCKET = "YNOT FEED";
function auth(r:NextRequest) {
 const key=process.env.YNOT_MCP_TOKEN;
 return Boolean(key && r.headers.get("authorization")==="Bearer "+key);
}
export async function GET(r:NextRequest) {
 if(!auth(r)) return NextResponse.json({error:"unauthorized"},{status:401});
 return NextResponse.json({policy:{"album-covers":2,"electric":1},message:"Storage cleanup requires an audited list of active image references before any deletion."});
}
