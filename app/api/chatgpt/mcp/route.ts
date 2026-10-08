import {dispatchMcp} from "@/app/api/mcp/route";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export const GET=(request:Request)=>dispatchMcp(request,"/api/chatgpt");
export const POST=(request:Request)=>dispatchMcp(request,"/api/chatgpt");
export const DELETE=(request:Request)=>dispatchMcp(request,"/api/chatgpt");
