import "../growth.css";
import "../growth-light.css";
import "../demand-engine.css";
import "../research-workflow.css";
import GrowthNav from "../GrowthNav";
import CampaignBuilder from "../CampaignBuilder";
import DemandGrowthEngine from "../DemandGrowthEngine";
import ProductDiscoveryEngine from "../ProductDiscoveryEngine";
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

export default async function GrowthAdsPage(){
 const [products,trends,gaps,campaigns,performance]=await Promise.all([
  rows("ynot_ad_product_scores?select=product_id,title,image_url,price,currency,advertability_score,scored_at&order=advertability_score.desc.nullslast&limit=20"),
  rows("ynot_growth_trends?select=id,name,platform,niche,audience,lifecycle,velocity_score,evidence,matched_product_ids,recommendation,status,updated_at&order=velocity_score.desc.nullslast,updated_at.desc&limit=24"),
  rows("ynot_growth_catalog_gaps?select=id,niche,demand_signal,reason,priority_score,source_refs,status,owner,updated_at&order=priority_score.desc.nullslast,updated_at.desc&limit=24"),
  rows("ynot_ad_campaigns?select=id,name,platform,status,daily_budget,currency,created_at&order=created_at.desc&limit=24"),
  rows("ynot_ad_performance?select=platform,impressions,clicks,spend,purchases,revenue,date&order=date.desc&limit=500")
 ]);
 const spend=performance.reduce((n:number,x:any)=>n+Number(x.spend||0),0),revenue=performance.reduce((n:number,x:any)=>n+Number(x.revenue||0),0);
 return <main className="growth"><div className="ambient a"/><div className="ambient b"/>
  <header><div><div className="eyebrow">YNOT / GROWTH OS</div><h1>Ads</h1><p>Research winning patterns, match products, create original variants, build campaigns and learn from performance.</p></div><div className="live"><i/> {campaigns.length} campaigns</div></header>
  <GrowthNav active="ads"/>
  <section className="metrics">
   <Metric label="Campaigns" value={String(campaigns.length)} sub="loaded"/>
   <Metric label="Product candidates" value={String(products.length)} sub="scored for ads"/>
   <Metric label="Spend" value={`€${Math.round(spend).toLocaleString()}`} sub="recorded"/>
   <Metric label="Revenue" value={`€${Math.round(revenue).toLocaleString()}`} sub={spend?`${(revenue/spend).toFixed(2)}× ROAS`:"no spend yet"}/>
  </section>
  <CampaignBuilder/>
  <DemandGrowthEngine trends={trends} gaps={gaps} products={products}/>
  <ResearchLibrary products={products}/>
  <ProductDiscoveryEngine trends={trends} gaps={gaps} scoredProducts={products}/>
 </main>
}

function Metric({label,value,sub}:{label:string;value:string;sub:string}){return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>}
