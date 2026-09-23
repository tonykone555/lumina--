import Link from "next/link";
import "./growth.css";
import "./demand-engine.css";
import "./growth-light.css";
import "./research-workflow.css";
import CreativeActions from "./CreativeActions";
import GrowthInbox from "./GrowthInbox";
import CampaignBuilder from "./CampaignBuilder";
import GrowthHosts from "./GrowthHosts";
import GrowthSocialIntel from "./GrowthSocialIntel";
import DemandGrowthEngine from "./DemandGrowthEngine";
import ProductDiscoveryEngine from "./ProductDiscoveryEngine";
import GrowthThemeToggle from "./GrowthThemeToggle";
import ResearchLibrary from "./ResearchLibrary";

export const dynamic = "force-dynamic";

async function adminData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { creatives: [], performance: [], campaigns: [], products: [], opportunities: [], trends: [], gaps: [], activities: [] };
  const base = url.replace(/\/$/, "");
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async (path: string) => {
    const r = await fetch(`${base}/rest/v1/${path}`, { headers, cache: "no-store" });
    return r.ok ? r.json() : [];
  };
  const [creatives, performance, campaigns, products, opportunities, trends, gaps, activities] = await Promise.all([
    get("ynot_ad_creatives?select=id,source_product_ids,hook,headline,status,quality_score,render_url,thumbnail_url,payload,voice_script,created_at&order=created_at.desc&limit=12"),
    get("ynot_ad_performance?select=platform,impressions,clicks,spend,saves,product_opens,add_to_bag,purchases,revenue,date&order=date.desc&limit=500"),
    get("ynot_ad_campaigns?select=id,name,platform,status,daily_budget,currency,created_at&order=created_at.desc&limit=12"),
    get("ynot_ad_product_scores?select=product_id,title,image_url,price,currency,advertability_score,scored_at&order=advertability_score.desc.nullslast&limit=8"),
    get("ynot_growth_opportunities?select=id,external_key,kind,platform,handle,display_name,profile_url,source_post_url,niche,country,followers,engagement,intent_strength,creator_fit,summary,reason,source_quote,budget_min,budget_max,budget_currency,intent_tags,constraints,personalization_context,matched_product_ids,matched_products,draft_message,channel,status,owner,outreach_approved,contacted_at,next_action,updated_at&order=updated_at.desc&limit=120"),
    get("ynot_growth_trends?select=id,name,platform,niche,audience,lifecycle,velocity_score,evidence,matched_product_ids,recommendation,status,updated_at&order=velocity_score.desc.nullslast,updated_at.desc&limit=16"),
    get("ynot_growth_catalog_gaps?select=id,niche,demand_signal,reason,priority_score,source_refs,status,owner,updated_at&order=priority_score.desc.nullslast,updated_at.desc&limit=16"),
    get("ynot_growth_activity?select=id,opportunity_id,event_type,actor,detail,created_at&order=created_at.desc&limit=1000"),
  ]);
  return { creatives, performance, campaigns, products, opportunities, trends, gaps, activities };
}

function n(v: unknown) { return Number(v || 0); }
function money(v: number) { return new Intl.NumberFormat("en", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v); }

export default async function GrowthAdminPage() {
  const { creatives, performance, campaigns, products, opportunities, trends, gaps, activities } = await adminData();
  const totals = performance.reduce((a: any, r: any) => ({
    impressions: a.impressions + n(r.impressions), clicks: a.clicks + n(r.clicks),
    spend: a.spend + n(r.spend), purchases: a.purchases + n(r.purchases), revenue: a.revenue + n(r.revenue),
  }), { impressions: 0, clicks: 0, spend: 0, purchases: 0, revenue: 0 });
  const ctr = totals.impressions ? (totals.clicks / totals.impressions * 100).toFixed(2) : "—";
  const roas = totals.spend ? (totals.revenue / totals.spend).toFixed(2) : "—";

  return <main className="growth">
    <div className="ambient a"/><div className="ambient b"/>
    <header><div><div className="eyebrow">YNOT / PRIVATE CONTROL ROOM</div><h1>Growth Intelligence</h1><p>Products → demand → creative hypotheses → approval → distribution → evidence.</p></div><div className="growthHeaderActions"><GrowthThemeToggle/><div className="live"><i/> Approval gated</div></div></header>
    <nav className="growthTabs"><Link className="active" href="/admin/growth">Overview</Link><a href="#demand-radar">Demand + Ads</a><a href="#research-library">Folders</a><a href="#product-discovery">Products</a><a href="#social-intelligence">Social</a><a href="#hosts">Hosts</a><Link href="/admin/growth/content">Content</Link><Link href="/admin/growth/queue">Prompt Packs</Link><Link href="/admin/growth/threads">Threads</Link></nav>
    <CampaignBuilder/>
    <DemandGrowthEngine trends={trends} gaps={gaps} products={products}/>
    <ResearchLibrary products={products}/>
    <ProductDiscoveryEngine trends={trends} gaps={gaps} scoredProducts={products}/>
    <GrowthSocialIntel/>
    <GrowthHosts/>
    <section className="metrics">
      <Metric label="Creative hypotheses" value={String(creatives.length)} sub="latest loaded"/>
      <Metric label="Impressions" value={totals.impressions.toLocaleString()} sub="recorded evidence"/>
      <Metric label="CTR" value={ctr==="—"?"—":ctr+"%"} sub={totals.clicks.toLocaleString()+" clicks"}/>
      <Metric label="Revenue" value={money(totals.revenue)} sub={money(totals.spend)+" spend"}/>
      <Metric label="ROAS" value={roas==="—"?"—":roas+"×"} sub={totals.purchases+" purchases"}/>
    </section>
    <GrowthInbox initialOpportunities={opportunities} initialActivities={activities}/>
    <div className="grid">
      <section className="panel wide"><div className="panelHead"><div><span>CREATIVE QUEUE</span><h2>Review before anything moves</h2></div><b>{creatives.filter((c:any)=>c.status==="review").length} waiting</b></div>
        <div className="rows">{creatives.length ? creatives.map((c:any)=><article className="row" key={c.id}><div className="thumb">{c.thumbnail_url?<img src={c.thumbnail_url} alt=""/>:<span>Y</span>}</div><div className="grow"><strong>{c.headline||c.hook||"Untitled creative"}</strong><small>{c.hook||"No hook yet"}</small></div><em className={"status "+c.status}>{c.status||"draft"}</em><CreativeActions id={c.id} status={c.status||"review"}/></article>) : <Empty text="No creative hypotheses yet. Grok can save the first one through YNOT MCP."/ >}</div>
      </section>
      <section className="panel"><div className="panelHead"><div><span>PIPELINE</span><h2>Safety state</h2></div></div>
        <div className="flow"><Flow n="01" t="Research" d="Want Graph + ad libraries + product discovery"/><Flow n="02" t="Creative" d="Create original hooks and content packs"/><Flow n="03" t="Review" d="Human approval required"/><Flow n="04" t="Generate" d="Image / video asset generation"/><Flow n="05" t="Distribute" d="TryPost draft / schedule"/><Flow n="06" t="Learn" d="Performance returns to YNOT"/></div>
      </section>
      <section className="panel"><div className="panelHead"><div><span>OPPORTUNITIES</span><h2>Product intelligence</h2></div></div>
        <div className="products">{products.length?products.map((p:any)=><div className="product" key={p.product_id}>{p.image_url?<img src={p.image_url} alt=""/>:<div className="ph"/>}<div><strong>{p.title}</strong><small>{p.currency||""} {p.price??"—"}</small></div><b>{p.advertability_score??"—"}</b></div>):<Empty text="No scored products yet."/ >}</div>
      </section>
      <section className="panel"><div className="panelHead"><div><span>CAMPAIGNS</span><h2>Distribution</h2></div></div>
        <div className="campaigns">{campaigns.length?campaigns.map((c:any)=><div className="campaign" key={c.id}><div><strong>{c.name}</strong><small>{c.platform} · {c.currency||"EUR"} {c.daily_budget||0}/day</small></div><em className={"status "+c.status}>{c.status}</em></div>):<Empty text="No paid campaign queued."/ >}</div>
      </section>
    </div>
  </main>;
}

function Metric({label,value,sub}:{label:string;value:string;sub:string}){return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>}
function Flow({n,t,d}:{n:string;t:string;d:string}){return <div className="flowStep"><i>{n}</i><div><strong>{t}</strong><small>{d}</small></div></div>}
function Empty({text}:{text:string}){return <div className="empty">{text}</div>}
