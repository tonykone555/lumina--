import Link from "next/link";
import "../growth.css";
import CreativeActions from "../CreativeActions";
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

export default async function ApprovalQueue(){
 const creatives=await rows("ynot_ad_creatives?status=in.(draft,review,approved)&select=id,source_product_ids,hook,headline,status,quality_score,thumbnail_url,payload,voice_script,created_at&order=created_at.desc&limit=180");
 const assets=await rows("ynot_generated_assets?select=*&order=created_at.desc&limit=120");
 const reviewAssets=assets.filter((a:any)=>!a.review_status||["pending","needs_changes"].includes(String(a.review_status)));
 return <main className="growth"><div className="ambient a"/><div className="ambient b"/>
  <header><div><div className="eyebrow">YNOT / GROWTH</div><h1>Prompt Packs & Approval</h1><p>Every campaign branch appears here immediately. You can see what is waiting for Grok, review completed prompt packs, then approve stills and videos.</p></div><div className="live"><i/> Human gated</div></header>
  <nav className="growthTabs"><Link href="/admin/growth">Overview</Link><Link href="/admin/growth/content">Content</Link><Link className="active" href="/admin/growth/queue">Prompt Packs</Link><Link href="/admin/growth/threads">Threads</Link></nav>
  <div className="queueLayout">
   <section className="panel wide"><div className="panelHead"><div><span>CREATIVE PROMPTS</span><h2>{creatives.length} campaign branches</h2></div></div>
    <div className="rows">{creatives.length?creatives.map((c:any)=>{const p=c.payload||{};return <article className="queueCreative" key={c.id}>
      <div className="queueThumb">{p.product?.image?<img src={p.product.image} alt=""/>:c.thumbnail_url?<img src={c.thumbnail_url} alt=""/>:<span>Y</span>}</div>
      <div className="queueMain"><div className="queueTitle"><strong>{c.headline||c.hook||p.product?.title||"Creative branch"}</strong><em className={"status "+c.status}>{p.prompt_status==="needs_grok"?"WAITING FOR GROK":c.status}</em></div>
      <small>{p.branch_type?String(p.branch_type).replace(/_/g," "):"branch"}{p.variant_label?` · Variant ${p.variant_label}`:""}{p.prompt_status?` · ${String(p.prompt_status).replace(/_/g," ")}`:""}</small>
      {p.image_prompt&&<details><summary>Image prompt</summary><p>{p.image_prompt}</p></details>}
      {p.video_prompt&&<details><summary>Video prompt</summary><p>{p.video_prompt}</p></details>}
      {c.voice_script&&<details><summary>Script</summary><p>{c.voice_script}</p></details>}
      </div><CreativeActions id={c.id} status={c.status}/>
    </article>}):<div className="empty">No creative branches waiting.</div>}</div>
   </section>
   <section className="panel"><div className="panelHead"><div><span>RETURNED MEDIA</span><h2>Needs review</h2></div><b>{reviewAssets.length}</b></div>
    <div className="reviewAssetList">{reviewAssets.length?reviewAssets.map((a:any)=>{const u=assetUrl(a);return <article className="reviewAsset" key={a.id}>{u&&(/\.mp4|\.mov|\.webm/i.test(u)?<video src={u} controls preload="metadata"/>:<img src={u} alt=""/>)}<div><strong>{a.asset_type||a.media_type||"Generated asset"}</strong><small>{a.review_status||a.status||"pending review"}</small></div></article>}):<div className="empty compact">No returned assets need review.</div>}</div>
   </section>
  </div>
  <footer><span>YNOT Growth OS</span><span>Approval remains the gate between prompt → generation → distribution.</span><Link href="/admin/growth">Back to Growth</Link></footer>
 </main>
}
