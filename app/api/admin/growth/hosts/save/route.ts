import {NextRequest,NextResponse} from "next/server";
import {requireYnotAdmin,adminDb,adminErrorStatus} from "@/lib/ynot/admin-server";

export const runtime="nodejs";

export async function POST(req:NextRequest){
 try{
  const admin=await requireYnotAdmin(req);
  const b=await req.json(),p=b.property||{},a=b.analysis||{},contact=b.contact?.bestContact||null;
  const id=String(p.id||"").trim();if(!id)return NextResponse.json({error:"PROPERTY_ID_REQUIRED"},{status:400});
  const products=Array.isArray(b.matchedProducts)?b.matchedProducts.slice(0,8):[];
  const matched=products.map((x:any)=>({id:String(x.id||""),title:String(x.title||""),brand:String(x.brand||""),image:String(x.image||""),price:x.price,currency:x.currency||"EUR",ynot_url:x.id?"/p/"+encodeURIComponent(String(x.id))+"?src=host-report":null,merchant_url:x.url||null,category:x.category||null}));
  const hero=a?.heroOpportunity||{};
  const hostName=String(p?.host?.name||"Host");
  const title=String(p.title||"property");
  const location=String(p.location||"").trim();
  const draft="Hi "+hostName+" — we came across your "+(location?location+" ":"")+ "property and picked out a few upgrades that fit the space particularly well. "+(hero?.category?"One standout was "+String(hero.category).toLowerCase()+" for the "+String(hero.room||"property").toLowerCase()+". ":"")+"I put the product options and prices together so you can look through them whenever you want. Happy to send the short upgrade report if useful.";
  const payload={
   external_key:"airbnb:"+id,kind:"airbnb_host",platform:"airbnb",handle:null,display_name:hostName,
   profile_url:String(p.url||""),source_post_url:String(p.url||""),niche:"premium property upgrades",country:null,
   followers:null,engagement:null,intent_strength:Number(b.qualificationScore||0),creator_fit:null,
   summary:"Premium Airbnb prospect: "+title,reason:String(hero?.reason||a?.styleSummary||"High-value property with relevant upgrade opportunities."),
   source_quote:null,budget_min:null,budget_max:null,budget_currency:String(p.currency||"EUR"),
   intent_tags:["airbnb","high-ticket","property-upgrade",String(a?.propertyTier||"premium")],
   constraints:{contact_email:contact?.email||null,contact_confidence:contact?.confidence||null,contact_source:contact?.sourceUrl||null,nightly_price:p.nightlyPrice||null,rating:p.rating||null,review_count:p.reviewCount||null,hero_opportunity:hero||null,analysis:a},
   personalization_context:String(a?.outreachAngle||a?.styleSummary||""),
   matched_product_ids:matched.map((x:any)=>x.id).filter(Boolean),matched_products:matched,
   draft_message:draft,channel:contact?.email?"email":"manual research",status:"ready",owner:"ARROW",outreach_approved:false,
   next_action:contact?.email?"Review upgrade recommendations and approve the email draft.":"Find a public business contact before outreach.",updated_at:new Date().toISOString()
  };
  const rows=await adminDb("ynot_growth_opportunities?on_conflict=external_key",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify([payload])});
  const saved=rows?.[0]||payload;
  const acts=await adminDb("ynot_growth_activity",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({opportunity_id:saved.id,event_type:"host_analysis_saved",actor:admin.profile.display_name||admin.profile.email||"admin",detail:{airbnb_id:id,hero_opportunity:hero?.category||null,contact_email:contact?.email||null,matched_products:matched.length}})});
  return NextResponse.json({ok:true,opportunity:saved,activity:acts?.[0]||null});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"HOST_SAVE_FAILED"},{status:adminErrorStatus(e)});}
}