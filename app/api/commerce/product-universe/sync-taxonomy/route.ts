import {NextRequest,NextResponse} from "next/server";
import {syncShopifyTaxonomy} from "@/lib/commerce/product-universe";

export const runtime="nodejs";
export const maxDuration=300;

function authorized(req:NextRequest){
  if(req.headers.get("x-vercel-cron")==="1")return true;
  const admin=process.env.YNOT_ADMIN_SECRET;
  if(admin&&req.headers.get("x-ynot-admin-secret")===admin)return true;
  const secret=process.env.CRON_SECRET;
  if(secret&&req.headers.get("authorization")===`Bearer ${secret}`)return true;
  return process.env.NODE_ENV!=="production";
}

export async function GET(req:NextRequest){
  if(!authorized(req))return NextResponse.json({error:"UNAUTHORIZED"},{status:401});
  try{
    const result=await syncShopifyTaxonomy();
    return NextResponse.json({ok:true,...result});
  }catch(error:any){
    console.error("YNOT taxonomy sync failed",error);
    return NextResponse.json({ok:false,error:String(error?.message||error)},{status:500});
  }
}
