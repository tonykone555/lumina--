import Link from "next/link";
import "./growth.css";
import CreativeActions from "./CreativeActions";

export const dynamic = "force-dynamic";

async function adminData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { creatives: [], performance: [], campaigns: [], products: [] };
  const base = url.replace(/\/$/, "");
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async (path: string) => {
    const r = await fetch(`${base}/rest/v1/${path}`, { headers, cache: "no-store" });
    return r.ok ? r.json() : [];
  };
  const [creatives, performance, campaigns, products] = await Promise.all([
    get("ynot_ad_creatives?select=id,source_product_ids,hook,headline,status,quality_score,render_url,thumbnail_url,payload,voice_script,created_at&order=created_at.desc&limit=12"),
    get("ynot_ad_performance?select=platform,impressions,clicks,spend,saves,product_opens,add_to_bag,purchases,revenue,date&order=date.desc&limit=500"),
    get("ynot_ad_campaigns?select=id,name,platform,status,daily_budget,currency,created_at&order=created_at.desc&limit=12"),
    get("ynot_ad_product_scores?select=product_id,title,image_url,price,currency,advertability_score,scored_at&order=advertability_score.desc.nullslast&limit=8"),
  ]);
  return { creatives, performance, campaigns, products };
}

function n(v: unknown) { return Number(v || 0); }
function money(v: number) { return new Intl.NumberFormat("en", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v); }

export default async function GrowthAdminPage() {
  const { creatives, performance, campaigns, products } = await adminData();
  const totals = performance.reduce((a: any, r: any) => ({
    impressions: a.impressions + n(r.impressions), clicks: a.clicks + n(r.clicks),
    spend: a.spend + n(r.spend), purchases: a.purchases + n(r.purchases), revenue: a.revenue + n(r.revenue),
  }), { impressions: 0, clicks: 0, spend: 0, purchases: 0, revenue: 0 });
  const ctr = totals.impressions ? (totals.clicks / totals.impressions * 100).toFixed(2) : "—";
  const roas = totals.spend ? (totals.revenue / totals.spend).toFixed(2) : "—";

  return <main className="growth">
    <div className="ambient a"/><div className="ambient b"/>
    <header><div><div className="eyebrow">YNOT / PRIVATE CONTROL ROOM</div><h1>Growth Intelligence</h1><p>Products → creative hypotheses → approval → distribution → evidence.</p></div><div className="live"><i/> Approval gated</div></header>
    <section className="metrics">
      <Metric label="Creative hypotheses" value={String(creatives.length)} sub="latest loaded"/>
      <Metric label="Impressions" value={totals.impressions.toLocaleString()} sub="recorded evidence"/>
      <Metric label="CTR" value={ctr==="—"?"—":ctr+"%"} sub={totals.clicks.toLocaleString()+" clicks"}/>
      <Metric label="Revenue" value={money(totals.revenue)} sub={money(totals.spend)+" spend"}/>
      <Metric label="ROAS" value={roas==="—"?"—":roas+"×"} sub={totals.purchases+" purchases"}/>
    </section>
    <div className="grid">
      <section className="panel wide"><div className="panelHead"><div><span>CREATIVE QUEUE</span><h2>Review before anything moves</h2></div><b>{creatives.filter((c:any)=>c.status==="review").length} waiting</b></div>
        <div className="rows">{creatives.length ? creatives.map((c:any)=><article className="row" key={c.id}><div className="thumb">{c.thumbnail_url?<img src={c.thumbnail_url} alt=""/>:<span>Y</span>}</div><div className="grow"><strong>{c.headline||c.hook||"Untitled creative"}</strong><small>{c.hook||"No hook yet"}</small></div><em className={"status "+c.status}>{c.status||"draft"}</em><CreativeActions id={c.id} status={c.status||"review"}/></article>) : <Empty text="No creative hypotheses yet. Grok can save the first one through YNOT MCP."/ >}</div>
      </section>
      <section className="panel"><div className="panelHead"><div><span>PIPELINE</span><h2>Safety state</h2></div></div>
        <div className="flow"><Flow n="01" t="Research" d="Catalogue + opportunity signals"/><Flow n="02" t="Creative" d="Grok saves structured hypothesis"/><Flow n="03" t="Review" d="Human approval required"/><Flow n="04" t="Generate" d="Asset generation after approval"/><Flow n="05" t="Distribute" d="TryPost draft / schedule"/><Flow n="06" t="Learn" d="Performance returns to YNOT"/></div>
      </section>
      <section className="panel"><div className="panelHead"><div><span>OPPORTUNITIES</span><h2>Product intelligence</h2></div></div>
        <div className="products">{products.length?products.map((p:any)=><div className="product" key={p.product_id}>{p.image_url?<img src={p.image_url} alt=""/>:<div className="ph"/>}<div><strong>{p.title}</strong><small>{p.currency||""} {p.price??"—"}</small></div><b>{p.advertability_score??"—"}</b></div>):<Empty text="No scored products yet."/ >}</div>
      </section>
      <section className="panel"><div className="panelHead"><div><span>CAMPAIGNS</span><h2>Distribution</h2></div></div>
        <div className="rows">{campaigns.length?campaigns.map((c:any)=><article className="campaign" key={c.id}><div><strong>{c.name}</strong><small>{c.platform} · {c.currency||"EUR"} {c.daily_budget||0}/day</small></div><em className={"status "+c.status}>{c.status}</em></article>):<Empty text="No campaigns connected yet."/ >}</div>
      </section>
    </div>
    <footer><span>YNOT Growth OS</span><span>Creative approval is live. Video generation remains gated until a provider is connected.</span><Link href="/">Back to YNOT</Link></footer>
  </main>;
}

function Metric({label,value,sub}:{label:string,value:string,sub:string}){return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>}
function Flow({n,t,d}:{n:string,t:string,d:string}){return <div className="flowRow"><b>{n}</b><div><strong>{t}</strong><small>{d}</small></div></div>}
function Empty({text}:{text:string}){return <div className="empty">{text}</div>}
