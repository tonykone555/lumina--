import "../growth.css";
import "../growth-light.css";
import "../research-workflow.css";
import GrowthNav from "../GrowthNav";
import ResearchLibrary from "../ResearchLibrary";

export const dynamic="force-dynamic";

async function rows(path:string){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL;
 const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return[];
 const headers:any={apikey:key};if(!key.startsWith("sb_"))headers.Authorization="Bearer "+key;
 const r=await fetch(url.replace(/\/$/,"")+"/rest/v1/"+path,{headers,cache:"no-store"});
 return r.ok?r.json():[];
}
function assetUrl(a:any){return a.url||a.asset_url||a.render_url||a.storage_url||a.public_url||a.file_url||""}
function mediaType(a:any,u:string){return String(a.media_type||a.asset_type||a.type||(/\.mp4|\.mov|\.webm/i.test(u)?"video":"image")).toLowerCase()}

export default async function GrowthLibraryPage(){
 const [assets,products]=await Promise.all([
  rows("ynot_generated_assets?select=*&order=created_at.desc&limit=120"),
  rows("ynot_ad_product_scores?select=product_id,title,image_url,price,currency,advertability_score,scored_at&order=advertability_score.desc.nullslast&limit=20")
 ]);
 return <main className="growth"><div className="ambient a"/><div className="ambient b"/>
  <header><div><div className="eyebrow">YNOT / GROWTH OS</div><h1>Library</h1><p>The shared memory layer for reusable videos, images, ad references, research and product-linked creative material.</p></div><div className="live"><i/> {assets.length} generated assets</div></header>
  <GrowthNav active="library"/>
  <section className="grid growthOsOverview">
   <div className="panel growthOsCard"><div className="panelHead"><div><span>MEDIA</span><h2>Reusable assets</h2></div><b>{assets.length}</b></div><p>Generated and imported media can be reused by Content, Ads and Outreach instead of living in separate silos.</p></div>
   <div className="panel growthOsCard"><div className="panelHead"><div><span>RESEARCH</span><h2>Ad intelligence</h2></div><b>Saved</b></div><p>Saved ad references, source creatives and create-from-ad research stay available here for future campaigns.</p></div>
  </section>
  <section className="panel wide"><div className="panelHead"><div><span>MEDIA LIBRARY</span><h2>Latest reusable assets</h2></div><b>{assets.length}</b></div>
   <div className="assetGrid">{assets.length?assets.map((a:any)=>{const u=assetUrl(a),kind=mediaType(a,u);return <article className="assetCard" key={a.id}><div className="assetMedia">{u?(kind.includes("video")?<video src={u} controls preload="metadata"/>:<img src={u} alt=""/>):<div className="assetMissing">Asset URL pending</div>}</div><div className="assetBody"><div className="assetTop"><span>{kind.includes("video")?"VIDEO":"STILL"}</span><em className={"status "+(a.review_status||a.status||"ready")}>{a.review_status||a.status||"ready"}</em></div><h3>{a.title||a.name||"YNOT asset"}</h3><p>{a.source||a.provider||"Growth asset"}</p></div></article>}):<div className="assetEmpty">No reusable media assets yet.</div>}</div>
  </section>
  <ResearchLibrary products={products}/>
 </main>
}
