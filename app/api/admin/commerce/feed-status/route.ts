import {NextRequest,NextResponse} from "next/server";
import {adminDb,adminErrorStatus,requireYnotAdmin} from "@/lib/ynot/admin-server";

export async function GET(req:NextRequest){
  try{
    await requireYnotAdmin(req);
    const rows=await adminDb("ynot_catalog_products?active=eq.true&select=ynot_id,commerce_status,quality_score,category,country&limit=10000");
    const summary:any={total:rows.length,status:{},categories:{},countries:{},score_bands:{ready_90_plus:0,good_82_89:0,review_72_81:0,weak_under_72:0}};
    for(const p of rows){
      summary.status[p.commerce_status]=(summary.status[p.commerce_status]||0)+1;
      summary.categories[p.category]=(summary.categories[p.category]||0)+1;
      summary.countries[p.country]=(summary.countries[p.country]||0)+1;
      const s=Number(p.quality_score||0);
      if(s>=90)summary.score_bands.ready_90_plus++;
      else if(s>=82)summary.score_bands.good_82_89++;
      else if(s>=72)summary.score_bands.review_72_81++;
      else summary.score_bands.weak_under_72++;
    }
    return NextResponse.json(summary);
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"FEED_STATUS_FAILED"},{status:adminErrorStatus(error)});
  }
}
