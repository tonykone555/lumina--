import {NextRequest,NextResponse} from "next/server";
function cfg(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("SUPABASE_SERVER_NOT_CONFIGURED");return{url:url.replace(/\/$/,""),key}}
function headers(key:string){return{apikey:key,...(key.startsWith("sb_")?{}:{Authorization:"Bearer "+key}),"Content-Type":"application/json",Prefer:"return=representation"}}
async function isAdmin(req:NextRequest){const token=req.cookies.get("ynot-admin-session")?.value;if(!token)return false;const {url,key}=cfg(),pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!pub)return false;const u=await fetch(url+"/auth/v1/user",{headers:{apikey:pub,Authorization:"Bearer "+token}});if(!u.ok)return false;const user=await u.json();const a=await fetch(url+"/rest/v1/ynot_admin_access_requests?user_id=eq."+encodeURIComponent(user.id)+"&status=eq.approved&select=id&limit=1",{headers:headers(key)});return a.ok&&(await a.json()).length>0}
const branchTypes=["ugc_testimonial","problem_solution","aesthetic_showcase","comparison_reviewer","direct_response","native_social"];
export async function POST(req:NextRequest){
 if(!await isAdmin(req))return NextResponse.json({error:"unauthorized"},{status:401});
 const b=await req.json();
 const products=Array.isArray(b.products)?b.products.slice(0,5):[];
 if(!products.length)return NextResponse.json({error:"products_required"},{status:400});
 const branches=Math.max(1,Math.min(6,Number(b.branches_per_product)||5));
 const variants=Math.max(1,Math.min(4,Number(b.variants_per_branch)||2));
 const campaignId=crypto.randomUUID(),createdAt=new Date().toISOString();
 const rows:any[]=[];
 for(const p of products){
   for(let bi=0;bi<branches;bi++){
     const branch=branchTypes[bi%branchTypes.length];
     for(let vi=0;vi<variants;vi++){
       rows.push({
         source_product_ids:[String(p.id)],
         template_key:"grok-campaign",
         aspect_ratio:"9:16",
         hook:"",
         primary_text:"",
         headline:`${p.title||"YNOT product"} · ${branch.replace(/_/g," ")} · ${String.fromCharCode(65+vi)}`,
         cta:"View on YNOT",
         voice_script:"",
         destination_url:null,
         status:"draft",
         payload:{
           campaign_id:campaignId,
           campaign_name:`${String(b.niche||"YNOT")} ${String(b.objective||"ugc")} campaign`,
           niche:String(b.niche||""),
           objective:String(b.objective||"ugc"),
           platforms:Array.isArray(b.platforms)?b.platforms:[],
           branch_type:branch,
           variant_label:String.fromCharCode(65+vi),
           prompt_status:"needs_grok",
           generation_strategy:"image_first_then_video",
           provider:"grok-imagine",
           approval_required:true,
           product:{
             id:String(p.id),title:p.title||"",brand:p.brand||"",description:p.description||"",
             category:p.category||String(b.niche||""),image:p.image||"",images:Array.isArray(p.images)?p.images:[],price:p.price??null,currency:p.currency||"EUR",url:p.url||""
           },
           created_from:"growth-campaign-builder"
         },
         created_at:createdAt,
         updated_at:createdAt
       });
     }
   }
 }
 const {url,key}=cfg();
 const r=await fetch(url+"/rest/v1/ynot_ad_creatives",{method:"POST",headers:headers(key),body:JSON.stringify(rows)});
 const out=await r.json().catch(()=>[]);
 if(!r.ok)return NextResponse.json({error:"campaign_insert_failed",detail:out},{status:500});
 return NextResponse.json({campaign_id:campaignId,creatives_created:Array.isArray(out)?out.length:rows.length,status:"awaiting_grok_prompt_packs"});
}
