import {NextRequest,NextResponse} from "next/server";
import {authenticatedUser,creatorDashboard,ensureCreator,rest} from "@/lib/creators/earn";

export const runtime="nodejs";

export async function GET(req:NextRequest){
  try{
    const u=await authenticatedUser(req),creator=await ensureCreator(u);
    return NextResponse.json(await creatorDashboard(creator));
  }catch(e){const m=e instanceof Error?e.message:"CREATOR_UNAVAILABLE";return NextResponse.json({error:m},{status:/SIGN_IN|SESSION/.test(m)?401:400})}
}
export async function POST(req:NextRequest){
  try{
    const u=await authenticatedUser(req),creator=await ensureCreator(u),body=await req.json().catch(()=>({}));
    const niches=Array.isArray(body.niches)?body.niches.map((x:any)=>String(x).toLowerCase().replace(/[^a-z0-9 -]/g,"").slice(0,40)).filter(Boolean).slice(0,8):creator.niches||[];
    const bio=typeof body.bio==="string"?body.bio.trim().slice(0,300):creator.bio;
    const socialLinks=body.social_links&&typeof body.social_links==="object"?Object.fromEntries(Object.entries(body.social_links).slice(0,8).map(([k,v])=>[String(k).slice(0,30),String(v||"").slice(0,300)])):creator.social_links||{};
    const rows=await rest(`ynot_creators?id=eq.${creator.id}`,{method:"PATCH",body:JSON.stringify({niches,bio,social_links:socialLinks,status:"active",onboarded_at:creator.onboarded_at||new Date().toISOString(),updated_at:new Date().toISOString()})});
    return NextResponse.json(await creatorDashboard(rows?.[0]||creator));
  }catch(e){const m=e instanceof Error?e.message:"CREATOR_UPDATE_FAILED";return NextResponse.json({error:m},{status:/SIGN_IN|SESSION/.test(m)?401:400})}
}
