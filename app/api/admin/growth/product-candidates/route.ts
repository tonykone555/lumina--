import {NextRequest,NextResponse} from "next/server";
function cfg(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("SUPABASE_SERVER_NOT_CONFIGURED");return{url:url.replace(/\/$/,""),key}}
function headers(key:string){return{apikey:key,...(key.startsWith("sb_")?{}:{Authorization:"Bearer "+key}),"Content-Type":"application/json"}}
async function isAdmin(req:NextRequest){const token=req.cookies.get("ynot-admin-session")?.value;if(!token)return false;const {url,key}=cfg(),pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!pub)return false;const u=await fetch(url+"/auth/v1/user",{headers:{apikey:pub,Authorization:"Bearer "+token}});if(!u.ok)return false;const user=await u.json();const a=await fetch(url+"/rest/v1/ynot_admin_access_requests?user_id=eq."+encodeURIComponent(user.id)+"&status=eq.approved&select=id&limit=1",{headers:headers(key)});return a.ok&&(await a.json()).length>0}
function n(v:any){const x=Number(v);return Number.isFinite(x)?x:0}
function contentScore(r:any){
  const visual=n(r.visual_distinctiveness),iq=n(r.image_quality),iv=n(r.image_variety),offer=n(r.offer_clarity),niche=n(r.niche_relevance),proof=n(r.social_proof),ynot=n(r.ynot_signal),meta=n(r.metadata_quality),ad=n(r.advertability_score);
  // Score toward contentability rather than generic popularity. The visual/demo inputs get the most weight.
  const score=(visual*.20)+(iq*.16)+(iv*.12)+(offer*.15)+(niche*.15)+(ynot*.12)+(proof*.05)+(meta*.05);
  return Math.round((score||ad)*10)/10;
}
function reason(r:any){
  const parts:any[]=[
    ["visual",n(r.visual_distinctiveness)],["images",n(r.image_quality)],["offer",n(r.offer_clarity)],
    ["niche",n(r.niche_relevance)],["YNOT",n(r.ynot_signal)]
  ].sort((a,b)=>b[1]-a[1]).slice(0,3);
  return parts.filter(x=>x[1]>0).map(x=>`${x[0]} ${x[1]}`).join(" · ");
}
export async function GET(req:NextRequest){
 if(!await isAdmin(req))return NextResponse.json({error:"unauthorized"},{status:401});
 const niche=(req.nextUrl.searchParams.get("niche")||"").replace(/[^a-z0-9 _-]/gi,"").trim();
 const limit=Math.max(12,Math.min(40,Number(req.nextUrl.searchParams.get("limit")||24)));
 const {url,key}=cfg();
 let path="ynot_ad_product_scores?select=source,product_id,title,product_url,image_url,price,currency,image_quality,image_variety,visual_distinctiveness,offer_clarity,niche_relevance,metadata_quality,social_proof,ynot_signal,advertability_score,metadata,scored_at&order=advertability_score.desc.nullslast&limit="+limit;
 if(niche)path+="&or=(title.ilike.*"+encodeURIComponent(niche)+"*,source.ilike.*"+encodeURIComponent(niche)+"*)";
 const r=await fetch(url+"/rest/v1/"+path,{headers:headers(key),cache:"no-store"});
 const rows=r.ok?await r.json():[];
 const candidates=(Array.isArray(rows)?rows:[]).map((x:any)=>({
   id:String(x.product_id||""),
   title:x.title||"Untitled product",
   brand:x.metadata?.brand||x.metadata?.merchant_name||x.source||"YNOT",
   price:x.price??null,currency:x.currency||"EUR",image:x.image_url||"",
   url:x.product_url||"",description:x.metadata?.description||"",
   category:x.metadata?.category||niche||"other",
   content_score:contentScore(x),
   advertability_score:x.advertability_score??null,
   signals:{visual_distinctiveness:x.visual_distinctiveness,image_quality:x.image_quality,image_variety:x.image_variety,offer_clarity:x.offer_clarity,niche_relevance:x.niche_relevance,ynot_signal:x.ynot_signal,social_proof:x.social_proof},
   why:reason(x)
 })).filter((x:any)=>x.id&&x.image).sort((a:any,b:any)=>b.content_score-a.content_score);
 return NextResponse.json({selection_mode:"ynot_ranked_manual",niche,candidates});
}
