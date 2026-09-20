import Link from "next/link";
import "../growth.css";
export const dynamic="force-dynamic";

async function rows(path:string){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL;
 const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return[];
 const h:any={apikey:key};if(!key.startsWith("sb_"))h.Authorization="Bearer "+key;
 const r=await fetch(url.replace(/\/$/,"")+"/rest/v1/"+path,{headers:h,cache:"no-store"});
 return r.ok?r.json():[];
}
function assetUrl(a:any){return a.url||a.asset_url||a.render_url||a.storage_url||a.public_url||a.file_url||""}
function mediaType(a:any,u:string){return String(a.media_type||a.asset_type||a.type||(/\.mp4|\.mov|\.webm/i.test(u)?"video":"image")).toLowerCase()}

export default async function GrowthContentPage(){
 const assets=await rows("ynot_generated_assets?select=*&order=created_at.desc&limit=160");
 const jobs=await rows("ynot_generation_jobs?select=*&order=created_at.desc&limit=160");
 const creativeIds=[...new Set(assets.map((a:any)=>a.creative_id).filter(Boolean))];
 const creatives=creativeIds.length?await rows(`ynot_ad_creatives?id=in.(${creativeIds.join(",")})&select=id,headline,hook,source_product_ids,payload,status`):[];
 const cm=new Map(creatives.map((c:any)=>[c.id,c]));
 return <main className="growth"><div className="ambient a"/><div className="ambient b"/>
  <header><div><div className="eyebrow">YNOT / GROWTH</div><h1>Content Library</h1><p>Every still and video returned from Grok generation, tied back to its product and campaign.</p></div><div className="live"><i/> {assets.length} assets</div></header>
  <nav className="growthTabs"><Link href="/admin/growth">Overview</Link><Link className="active" href="/admin/growth/content">Content</Link><Link href="/admin/growth/queue">Approval Queue</Link><Link href="/admin/growth/threads">Threads</Link></nav>
  <section className="assetGrid">{assets.length?assets.map((a:any)=>{
    const u=assetUrl(a),c:any=cm.get(a.creative_id),kind=mediaType(a,u),p=c?.payload||{};
    return <article className="assetCard" key={a.id}>
      <div className="assetMedia">{u?(kind.includes("video")?<video src={u} controls preload="metadata"/>:<img src={u} alt=""/>):<div className="assetMissing">Asset URL pending</div>}</div>
      <div className="assetBody"><div className="assetTop"><span>{kind.includes("video")?"VIDEO":"STILL"}</span><em className={"status "+(a.review_status||a.status||"ready")}>{a.review_status||a.status||"ready"}</em></div>
      <h3>{c?.headline||c?.hook||"Generated creative"}</h3>
      <p>{p.branch_type?String(p.branch_type).replace(/_/g," "):"creative"}{p.variant_label?` · Variant ${p.variant_label}`:""}{p.niche?` · ${p.niche}`:""}</p>
      <div className="assetMeta"><span>Grok Imagine</span><span>{p.generation_strategy||"image-first"}</span></div>
      {p.product?.title&&<div className="assetProduct">{p.product.image&&<img src={p.product.image} alt=""/>}<div><strong>{p.product.title}</strong><small>{p.product.brand||c?.source_product_ids?.[0]}</small></div></div>}
      </div>
    </article>}):<div className="assetEmpty">No generated assets have returned yet. As Grok completes image/video jobs they will appear here automatically.</div>}</section>
  <footer><span>YNOT Growth OS</span><span>{jobs.length} recent generation jobs linked</span><Link href="/admin/growth">Back to Growth</Link></footer>
 </main>
}
