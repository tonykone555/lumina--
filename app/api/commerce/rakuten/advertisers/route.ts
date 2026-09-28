import { NextRequest, NextResponse } from "next/server";
import { listRakutenAdvertisers, listRakutenPartnerships, rakutenConfigured } from "@/lib/commerce/rakuten";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!rakutenConfigured()) return NextResponse.json({ ok:false,error:"RAKUTEN_NOT_CONFIGURED" },{status:503});
    const { searchParams }=new URL(request.url);
    const q=searchParams.get("q")?.trim()||undefined;
    const includePartnerships=searchParams.get("partnerships")!=="0";
    const advertisers=await listRakutenAdvertisers(q);
    let partnerships:any[]=[];
    if(includePartnerships){
      // Pull all partnership pages (Rakuten allows up to 200/page), with a conservative cap.
      for(let page=1;page<=25;page++){
        const result=await listRakutenPartnerships({page,limit:200});
        partnerships.push(...result.advertisers);
        if(result.advertisers.length<200) break;
      }
    }
    const byId=new Map(partnerships.map(p=>[p.id,p]));
    const merged=advertisers.map(a=>{const p=byId.get(a.id);return p?{...a,...p}:a;});
    return NextResponse.json({ok:true,source:"rakuten",total:merged.length,partnershipCount:partnerships.length,advertisers:merged});
  }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"RAKUTEN_ADVERTISERS_FAILED"},{status:502});}
}
