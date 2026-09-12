"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BarChart3, Building2, FileText, Radar, Search, Send, Sparkles, Target } from "lucide-react";
import styles from "./view.module.css";

type Tab = "overview"|"competitors"|"intent"|"fixes"|"prospects"|"report"|"outreach";

const competitors = [
  {name:"Clinique Rivoli",share:62},
  {name:"Cabinet Nova",share:48},
  {name:"Smile House",share:35},
  {name:"Your business",share:18,you:true},
];

const queries = [
  {q:"best Invisalign dentist in Lille",who:"Clinique Rivoli · Cabinet Nova",status:"Missed",tone:"missed"},
  {q:"teeth whitening dentist Lille",who:"Clinique Rivoli",status:"Missed",tone:"missed"},
  {q:"cosmetic dentist in Lille",who:"Smile House · Cabinet Nova",status:"High intent",tone:"high"},
  {q:"dentist accepting new patients Lille",who:"Your business · Cabinet Nova",status:"Visible",tone:"visible"},
  {q:"emergency dentist Lille Saturday",who:"Clinique Rivoli",status:"Missed",tone:"missed"},
  {q:"affordable dental implants Lille",who:"Cabinet Nova",status:"High intent",tone:"high"},
];

const fixes = [
  ["Build intent pages","Create dedicated pages for high-value services + city combinations instead of burying them inside generic service pages."],
  ["Strengthen entity clarity","Make location, services, credentials, opening hours and business identity explicit and consistent across the site."],
  ["Add structured data","Use relevant LocalBusiness, Service, Organization, FAQ and review markup where appropriate."],
  ["Improve third-party signals","Prioritize credible directories, profiles, mentions and reviews that reinforce the same business facts."],
  ["Re-test monthly","Track the same buyer-intent questions over time and compare changes against observed competitors."],
];

export default function LuminaView(){
  const [tab,setTab]=useState<Tab>("overview");
  const [business,setBusiness]=useState("Maison Dentaire Lille");
  const [url,setUrl]=useState("https://example.com");
  const [industry,setIndustry]=useState("Dentist");
  const [city,setCity]=useState("Lille");
  const [preview,setPreview]=useState(false);
  const tabs: {id:Tab;label:string}[]=[
    {id:"overview",label:"AI Visibility"},{id:"competitors",label:"Competitors"},{id:"intent",label:"Buyer Intent"},{id:"fixes",label:"Implementation"},{id:"prospects",label:"Prospect Engine"},{id:"report",label:"Report"},{id:"outreach",label:"Outreach"}
  ];
  const outreach=useMemo(()=>`Hi ${business || "there"} — I checked how your business could be represented when people ask AI tools high-intent questions around ${industry.toLowerCase()} services in ${city || "your area"}.\n\nThe preview is designed to show which questions you appear for, which competitors appear instead, and the first website/entity changes worth implementing.\n\nI can send the short report over if useful.`,[business,industry,city]);

  return <main className={styles.shell}>
    <header className={styles.topbar}>
      <div className={styles.brand}><span className={styles.brandMark}>L@</span><span>Lumina View</span></div>
      <Link className={styles.back} href="/"><ArrowLeft size={14}/> Back to Lumina @</Link>
    </header>

    <div className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heroCard}>
          <span className={styles.eyebrow}><Radar size={13}/> AI visibility intelligence</span>
          <h1>See which buyer questions are sending attention to your competitors.</h1>
          <p>Lumina View turns AI visibility into something a business can act on: buyer-intent checks, observed competitors, missed opportunities, exact implementation priorities and a report your team can actually use.</p>
          <div className={styles.heroActions}><button className={styles.primary} onClick={()=>setTab("prospects")}>Create prospect preview</button><button className={styles.secondary} onClick={()=>setTab("report")}>View report format</button></div>
        </div>
        <div className={styles.scoreCard}>
          <div><div className={styles.scoreLabel}>Example AI Visibility Score</div><div className={styles.score}>24<small>/100</small></div></div>
          <div className={styles.scoreMeta}><div className={styles.metric}><b>2/10</b><span>buyer checks visible</span></div><div className={styles.metric}><b>3</b><span>competitors ahead</span></div></div>
        </div>
      </section>

      <nav className={styles.nav}>{tabs.map(t=><button key={t.id} className={tab===t.id?styles.active:""} onClick={()=>setTab(t.id)}>{t.label}</button>)}</nav>

      {tab==="overview"&&<section className={styles.grid}>
        <div className={`${styles.panel} ${styles.span7}`}>
          <div className={styles.panelHead}><div><h2>Share of observed AI visibility</h2><p>Example presentation for queries tested in the report.</p></div><span className={styles.pill}>Example data</span></div>
          <div className={styles.barList}>{competitors.map(c=><div key={c.name} className={`${styles.barRow} ${c.you?styles.you:""}`}><span>{c.name}</span><div className={styles.barTrack}><div className={styles.barFill} style={{width:`${c.share}%`}}/></div><b>{c.share}%</b></div>)}</div>
        </div>
        <div className={`${styles.panel} ${styles.span5}`}>
          <div className={styles.panelHead}><div><h3>Opportunity summary</h3><p>What the business should understand in under 30 seconds.</p></div><Target size={18}/></div>
          <div className={styles.checklist}><div className={styles.check}><span className={styles.checkIcon}>1</span><div><b>8 missed buyer intents</b><p>Several commercial questions surface competitors instead.</p></div></div><div className={styles.check}><span className={styles.checkIcon}>2</span><div><b>3 competitors repeatedly observed</b><p>The report always names competitors only where evidence exists.</p></div></div><div className={styles.check}><span className={styles.checkIcon}>3</span><div><b>5 priority implementation actions</b><p>Content, entity clarity, structured data and supporting signals.</p></div></div></div>
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHead}><div><h2>What Lumina View answers</h2><p>Where you appear, who appears instead, and what to change next.</p></div><BarChart3 size={18}/></div>
          <div className={styles.queryList}>{queries.slice(0,4).map(x=><div className={styles.query} key={x.q}><div><strong>{x.q}</strong><span>{x.who}</span></div><span className={`${styles.status} ${styles[x.tone as "missed"|"visible"|"high"]}`}>{x.status}</span></div>)}</div>
        </div>
      </section>}

      {tab==="competitors"&&<section className={styles.grid}><div className={styles.panel}><div className={styles.panelHead}><div><h2>Competitor intelligence</h2><p>Competitors are shown when they were actually observed in the tested answer set.</p></div><Building2 size={18}/></div><div className={styles.barList}>{competitors.map(c=><div key={c.name} className={`${styles.barRow} ${c.you?styles.you:""}`}><span>{c.name}</span><div className={styles.barTrack}><div className={styles.barFill} style={{width:`${c.share}%`}}/></div><b>{c.share}%</b></div>)}</div><div className={styles.notice}>Production rule: never invent competitor names or imply ranking guarantees. Store the query, platform, date, answer evidence and observed competitor before showing the comparison.</div></div></section>}

      {tab==="intent"&&<section className={styles.grid}><div className={styles.panel}><div className={styles.panelHead}><div><h2>Buyer-intent universe</h2><p>High-value questions become the backbone of the report and monitoring plan.</p></div><Search size={18}/></div><div className={styles.queryList}>{queries.map(x=><div className={styles.query} key={x.q}><div><strong>{x.q}</strong><span>Observed: {x.who}</span></div><span className={`${styles.status} ${styles[x.tone as "missed"|"visible"|"high"]}`}>{x.status}</span></div>)}</div></div></section>}

      {tab==="fixes"&&<section className={styles.grid}><div className={`${styles.panel} ${styles.span7}`}><div className={styles.panelHead}><div><h2>Done-for-you implementation</h2><p>The report should lead naturally into work Lumina can implement for the client.</p></div><Sparkles size={18}/></div><div className={styles.checklist}>{fixes.map((f,i)=><div className={styles.check} key={f[0]}><span className={styles.checkIcon}>{i+1}</span><div><b>{f[0]}</b><p>{f[1]}</p></div></div>)}</div></div><div className={`${styles.panel} ${styles.span5}`}><div className={styles.panelHead}><div><h3>Commercial packaging</h3><p>Simple enough to buy without adding work for the client.</p></div></div><div className={styles.queryList}><div className={styles.query}><div><strong>Free preview</strong><span>5–8 checks · competitors · first opportunities</span></div><b>€0</b></div><div className={styles.query}><div><strong>Full audit</strong><span>20–50 checks · report · roadmap</span></div><b>€249–399</b></div><div className={styles.query}><div><strong>Done for you</strong><span>Priority implementation</span></div><b>€990+</b></div><div className={styles.query}><div><strong>Monitoring</strong><span>Monthly re-checks and competitor movement</span></div><b>€149+/mo</b></div></div></div></section>}

      {tab==="prospects"&&<section className={styles.grid}>
        <div className={`${styles.panel} ${styles.span7}`}><div className={styles.panelHead}><div><h2>Prospect Engine</h2><p>Turn a business into a personalized preview and outreach package.</p></div><span className={styles.pill}>Foundation live</span></div><div className={styles.prospect}><div className={styles.field}><label>Business name</label><input value={business} onChange={e=>setBusiness(e.target.value)}/></div><div className={styles.field}><label>Website</label><input value={url} onChange={e=>setUrl(e.target.value)}/></div><div className={styles.field}><label>Industry</label><select value={industry} onChange={e=>setIndustry(e.target.value)}><option>Dentist</option><option>Driving School</option><option>Estate Agent</option><option>Law Firm</option><option>Restaurant</option><option>Electrician</option><option>Ecommerce Brand</option></select></div><div className={styles.field}><label>City</label><input value={city} onChange={e=>setCity(e.target.value)}/></div><div className={`${styles.field} ${styles.full}`}><button className={styles.primary} onClick={()=>setPreview(true)}>Build preview structure</button></div></div>{preview&&<div className={styles.resultPreview}><small>Prospect preview generated</small><h3>{business}</h3><p>{industry} · {city} · {url}</p><p>Buyer-intent template, report structure and outreach copy are ready. Live competitor names should only populate after connected visibility checks return evidence.</p></div>}<div className={styles.notice}>The website now has the prospect workflow and report engine UI. Automated live checks across ChatGPT, Gemini, Claude, Perplexity and other systems still require their respective provider/search connections before competitor results can be populated automatically.</div></div>
        <div className={`${styles.panel} ${styles.span5}`}><div className={styles.panelHead}><div><h3>Visibility providers</h3><p>Evidence layer required for production.</p></div><Radar size={18}/></div><div className={styles.platforms}><span className={`${styles.platform} ${styles.off}`}>ChatGPT connector</span><span className={`${styles.platform} ${styles.off}`}>Gemini connector</span><span className={`${styles.platform} ${styles.off}`}>Claude connector</span><span className={`${styles.platform} ${styles.off}`}>Perplexity connector</span><span className={styles.platform}>Website audit</span><span className={styles.platform}>Query templates</span><span className={styles.platform}>Report builder</span><span className={styles.platform}>Outreach copy</span></div></div>
      </section>}

      {tab==="report"&&<section className={styles.grid}><div className={`${styles.panel} ${styles.span7}`}><div className={styles.panelHead}><div><h2>Client-facing report</h2><p>Designed to make the competitive gap immediately understandable.</p></div><FileText size={18}/></div><div className={styles.reportCard}><div className={styles.reportCover}><small>LUMINA VIEW · AI VISIBILITY REPORT</small><h3>{business || "Your business"}<br/>vs. the businesses AI is surfacing instead.</h3><small>Buyer intent · competitor visibility · implementation roadmap</small></div></div></div><div className={`${styles.panel} ${styles.span5}`}><div className={styles.panelHead}><div><h3>Report sections</h3><p>Full audit structure.</p></div></div><div className={styles.checklist}>{["AI Visibility Score","Executive summary","20–50 buyer-intent checks","Observed competitors","Answer/source evidence","Share-of-visibility chart","Missed commercial opportunities","Site/entity/schema audit","Recommended pages + FAQs","30-day implementation plan","Monthly tracking baseline"].map((x,i)=><div className={styles.check} key={x}><span className={styles.checkIcon}>{i+1}</span><div><b>{x}</b></div></div>)}</div></div></section>}

      {tab==="outreach"&&<section className={styles.grid}><div className={`${styles.panel} ${styles.span7}`}><div className={styles.panelHead}><div><h2>Personalized outreach</h2><p>Generated from the prospect profile and, in production, observed competitor evidence.</p></div><Send size={18}/></div><div className={styles.outreach}>{outreach}</div><div className={styles.heroActions}><button className={styles.primary}>Copy outreach</button><button className={styles.secondary}>Generate call opener</button></div></div><div className={`${styles.panel} ${styles.span5}`}><div className={styles.panelHead}><div><h3>Best outreach angle</h3><p>Lead with a real visibility gap, not generic “AI SEO”.</p></div><ArrowUpRight size={18}/></div><div className={styles.checklist}><div className={styles.check}><span className={styles.checkIcon}>1</span><div><b>Name the observed competitor</b><p>Only when the evidence supports it.</p></div></div><div className={styles.check}><span className={styles.checkIcon}>2</span><div><b>Show one missed buyer question</b><p>Make the problem concrete and commercially relevant.</p></div></div><div className={styles.check}><span className={styles.checkIcon}>3</span><div><b>Offer the preview</b><p>Then sell implementation rather than homework.</p></div></div></div></div></section>}

      <p className={styles.footerNote}>Lumina View should improve AI-shopping and AI-search readiness; it does not guarantee placement or ranking in third-party AI systems.</p>
    </div>
  </main>
}
