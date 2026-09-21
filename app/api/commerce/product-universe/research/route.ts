import {NextRequest,NextResponse} from "next/server";
import {researchProductUniverse} from "@/lib/commerce/product-research";

export const runtime="nodejs";
export const maxDuration=300;

function authorized(req:NextRequest){
  if(req.headers.get("x-vercel-cron")==="1")return true;
  const admin=process.env.YNOT_ADMIN_SECRET;
  if(admin&&req.headers.get("x-ynot-admin-secret")===admin)return true;
  const cron=process.env.CRON_SECRET;
  if(cron&&req.headers.get("authorization")===`Bearer ${cron}`)return true;
  return process.env.NODE_ENV!=="production";
}

async function run(req:NextRequest,body:any={}){
  if(!authorized(req))return NextResponse.json({error:"UNAUTHORIZED"},{status:401});
  try{
    const result=await researchProductUniverse({
      limit:Number(body?.limit??req.nextUrl.searchParams.get("limit")??12),
      country:String(body?.country??req.nextUrl.searchParams.get("country")??"US")
    });
    return NextResponse.json({ok:true,...result});
  }catch(error:any){
    console.error("YNOT product universe research failed",error);
    return NextResponse.json({ok:false,error:String(error?.message||error)},{status:500});
  }
}

export async function GET(req:NextRequest){
  return run(req);
}
export async function POST(req:NextRequest){
  const body=await req.json().catch(()=>({}));
  return run(req,body);
}
