import {cookies} from "next/headers";
import {NextRequest,NextResponse} from "next/server";
import crypto from "node:crypto";
import {claimReferrer,circleReady,dashboard,ensureProfile} from "@/lib/circle/server";
export const runtime="nodejs";
const COOKIE="ynot-circle-id";
async function identity(){const jar=await cookies();const current=jar.get(COOKIE)?.value;if(current&&/^[0-9a-f-]{36}$/i.test(current))return{id:current,fresh:false};return{id:crypto.randomUUID(),fresh:true}}
export async function POST(req:NextRequest){try{if(!circleReady())return NextResponse.json({error:"CIRCLE_NOT_CONFIGURED"},{status:503});const who=await identity();await ensureProfile(who.id);const body=await req.json().catch(()=>({})) as {invite?:string};let joined=false;if(body.invite){const result=await claimReferrer(who.id,body.invite);joined=Boolean(result)}const data=await dashboard(who.id);const response=NextResponse.json({...data,joined});if(who.fresh)response.cookies.set(COOKIE,who.id,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*24*365*3});return response}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"CIRCLE_UNAVAILABLE"},{status:400})}}
export async function GET(){try{if(!circleReady())return NextResponse.json({error:"CIRCLE_NOT_CONFIGURED"},{status:503});const who=await identity();await ensureProfile(who.id);const data=await dashboard(who.id);const response=NextResponse.json(data);if(who.fresh)response.cookies.set(COOKIE,who.id,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*24*365*3});return response}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"CIRCLE_UNAVAILABLE"},{status:400})}}
