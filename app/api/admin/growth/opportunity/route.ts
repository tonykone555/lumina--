import {NextRequest,NextResponse} from "next/server";
import {adminDb,adminErrorStatus,requireYnotAdmin} from "@/lib/ynot/admin-server";

export const runtime="nodejs";

export async function POST(req:NextRequest){
  try{
    const admin=await requireYnotAdmin(req);
    const body=await req.json();
    const id=String(body?.id||"");
    const action=String(body?.action||"");
    if(!id) return NextResponse.json({error:"Missing id"},{status:400});

    const rows=await adminDb("ynot_growth_opportunities?id=eq."+encodeURIComponent(id)+"&select=*&limit=1");
    const current=rows?.[0];
    if(!current) return NextResponse.json({error:"Opportunity not found"},{status:404});

    let patch:any={updated_at:new Date().toISOString()};
    let eventType="";
    let detail:any={};

    if(action==="approve"){
      if(!current.draft_message) return NextResponse.json({error:"No draft message to approve"},{status:400});
      patch.outreach_approved=true;
      patch.status=current.status==="new"||current.status==="qualified"?"ready":current.status;
      patch.owner="ARROW";
      eventType="outreach_approved";
      detail={channel:current.channel||null,draft_message:current.draft_message};
    }else if(action==="revoke"){
      patch.outreach_approved=false;
      eventType="outreach_approval_revoked";
      detail={channel:current.channel||null};
    }else if(action==="mark_sent"){
      if(!current.outreach_approved) return NextResponse.json({error:"Approval required before marking sent"},{status:409});
      patch.status="contacted";
      patch.contacted_at=new Date().toISOString();
      patch.owner="ARROW";
      eventType="outreach_sent";
      detail={channel:current.channel||null,message:current.draft_message||null,source_post_url:current.source_post_url||null,profile_url:current.profile_url||null};
    }else{
      return NextResponse.json({error:"Unknown action"},{status:400});
    }

    const updated=await adminDb("ynot_growth_opportunities?id=eq."+encodeURIComponent(id),{
      method:"PATCH",
      headers:{Prefer:"return=representation"},
      body:JSON.stringify(patch)
    });
    const activityRows=await adminDb("ynot_growth_activity",{
      method:"POST",
      headers:{Prefer:"return=representation"},
      body:JSON.stringify({
        opportunity_id:id,
        event_type:eventType,
        actor:admin.profile.display_name||admin.profile.email||"admin",
        detail
      })
    });
    return NextResponse.json({ok:true,opportunity:updated?.[0]||null,activity:activityRows?.[0]||null});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"GROWTH_OPPORTUNITY_UPDATE_FAILED"},{status:adminErrorStatus(error)});
  }
}
