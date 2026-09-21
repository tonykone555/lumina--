import {NextRequest,NextResponse} from "next/server";
import {adminDb,adminErrorStatus,requireYnotAdmin} from "@/lib/ynot/admin-server";

export async function POST(req:NextRequest){
  try{
    await requireYnotAdmin(req);
    const body=await req.json().catch(()=>({}));
    const limit=Math.max(1,Math.min(100,Number(body.limit_per_group||25)));
    const result=await adminDb("rpc/ynot_rebuild_commerce_feed_selection",{
      method:"POST",
      body:JSON.stringify({p_limit_per_group:limit})
    });
    return NextResponse.json({ok:true,result});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"FEED_SELECTION_FAILED"},{status:adminErrorStatus(error)});
  }
}
