import {NextRequest,NextResponse} from "next/server";
import {adminDb,adminErrorStatus,requireYnotAdmin} from "@/lib/ynot/admin-server";
import {enrichCatalogProduct} from "@/lib/commerce/feed-enrichment";

export const runtime="nodejs";
export const maxDuration=120;

export async function POST(req:NextRequest){
  try{
    await requireYnotAdmin(req);
    const body=await req.json().catch(()=>({}));
    const limit=Math.max(1,Math.min(1000,Number(body.limit||250)));
    const status=String(body.status||"needs_enrichment");
    const rows=await adminDb(`ynot_catalog_products?active=eq.true&commerce_status=eq.${encodeURIComponent(status)}&select=*&order=routing_score.desc&limit=${limit}`);
    const now=new Date().toISOString();
    const updates=(rows||[]).map((p:any)=>({
      ynot_id:p.ynot_id,
      ...enrichCatalogProduct(p),
      enrichment_version:"v1",
      enriched_at:now,
      verified_at:null,
      updated_at:now
    }));
    if(updates.length){
      await adminDb("ynot_catalog_products?on_conflict=ynot_id",{
        method:"POST",
        headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
        body:JSON.stringify(updates)
      });
    }
    return NextResponse.json({ok:true,processed:updates.length});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"ENRICH_FAILED"},{status:adminErrorStatus(error)});
  }
}
