"use client";

import {useMemo,useState} from "react";
import {authedFetch,readSession} from "@/lib/ynot/supabase-browser";
import styles from "./intelligence.module.css";

type ScanResult={probe:any;products:any[];metrics:any;strategy:any;error?:string};
type Lens="gems"|"broad"|"conversion"|"ynot"|"high"|"low";

export default function IntelligencePage(){
 const[access,setAccess]=useState(readSession()?"ready":"signin");
 const[running,setRunning]=useState(false);const[progress,setProgress]=useState(0);const[results,setResults]=useState<ScanResult[]>([]);const[lens,setLens]=useState<Lens>("gems");const[notice,setNotice]=useState("");const[query,setQuery]=useState("");const[expanded,setExpanded]=useState<string|null>(null);

 async function api(payload:any){const r=await authedFetch("/api/admin/ads/intelligence",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const d=await r.json().catch(()=>({}));if(r.status===401){setAccess("signin");throw new Error("Sign in required")}if(r.status===403){setAccess("forbidden");throw new Error("Owner access required")}if(!r.ok)throw new Error(d?.error||"INTELLIGENCE_FAILED");return d}

 async function runScan(mode:"quick"|"deep"="deep"){
  setRunning(true);setProgress(0);setNotice("");setResults([]);
  try{
   const batches=mode==="deep"?8:3;const all:ScanResult[]=[];
   for(let batch=0;batch<batches;batch++){
    const data=await api({action:"scan",batch,size:6,country:"France"});
    all.push(...(data.results||[]));setResults([...all]);setProgress(Math.round(((batch+1)/batches)*100));
    if(!data.hasMore)break;
   }
   const live=all.filter(x=>x.metrics?.productCount>0);const top=[...live].sort((a,b)=>(b.metrics?.gem||0)-(a.metrics?.gem||0)).slice(0,40);
   await api({action:"save",mode,country:"France",opportunities:top.map(x=>({name:x.probe.name,query:x.probe.query,vertical:x.probe.vertical,audience:x.strategy.audience,metrics:x.metrics,strategy:x.strategy})),sampleCount:live.reduce((n,x)=>n+(x.metrics?.productCount||0),0),probeCount:all.length,summary:{liveProbes:live.length,topGem:top[0]?.probe?.name||null,highTicket:live.filter(x=>x.metrics?.ticket==="high").length}}).catch(()=>null);
   setNotice(`Deep scan complete: ${all.length} micro-markets tested against live catalogue results.`)
  }catch(e){setNotice(e instanceof Error?e.message:"Scan failed")}finally{setRunning(false)}
 }

 async function sendToFactory(item:ScanResult){
  setNotice("");try{const r=await authedFetch("/api/admin/ads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create_niche",name:item.probe.name,category:item.probe.vertical,query:item.probe.query,status:"active",attributes:[item.metrics.ticket,item.probe.intent,"intelligence-lab"]})});if(!r.ok)throw new Error("Could not save niche");setNotice(`${item.probe.name} is now saved as an active YNOT niche. Open Ad Factory → Create Ads to build the first test.`)}catch(e){setNotice(e instanceof Error?e.message:"Unable to save niche")}
 }

 const filtered=useMemo(()=>{
  let rows=results.filter(x=>x.metrics?.productCount>0);
  if(query.trim()){const q=query.toLowerCase();rows=rows.filter(x=>`${x.probe.name} ${x.probe.vertical} ${x.probe.audience}`.toLowerCase().includes(q))}
  const value=(x:ScanResult)=>lens==="broad"?x.metrics.broad:lens==="conversion"?x.metrics.conversion:lens==="ynot"?x.metrics.ynot:x.metrics.gem;
  if(lens==="high")rows=rows.filter(x=>x.metrics.ticket==="high");if(lens==="low")rows=rows.filter(x=>x.metrics.ticket==="low");
  return [...rows].sort((a,b)=>value(b)-value(a));
 },[results,lens,query]);
 const liveResults=results.filter(x=>x.metrics?.productCount>0);const skuCount=liveResults.reduce((n,x)=>n+(x.metrics?.productCount||0),0);const verticals=new Set(liveResults.map(x=>x.probe.vertical)).size;const topScore=filtered[0]?.metrics?.[lens==="broad"?"broad":lens==="conversion"?"conversion":lens==="ynot"?"ynot":"gem"]||0;

 if(access!=="ready")return <main className={styles.shell}><div className={styles.lock}><div className={styles.kicker}>YNOT / DEEP INTELLIGENCE</div><h1>{access==="signin"?"Sign in required":"Owner access required"}</h1><p>Open this lab from the approved YNOT owner account.</p><a href="/admin/ads">Back to Ad Factory</a></div></main>;

 return <main className={styles.shell}><div className={styles.wrap}>
  <header className={styles.hero}><div><div className={styles.kicker}>YNOT / DEEP CATALOGUE INTELLIGENCE</div><h1>Find the markets nobody remembered to look for.</h1><p>This lab probes dozens of micro-niches against the live Shopify catalogue, measures real inventory quality, price bands and product depth, then models organic reach, conversion fit and YNOT-brand potential. Scores are opportunity models until real campaign data replaces them.</p></div><div className={styles.heroActions}><button disabled={running} onClick={()=>void runScan("deep")}>{running?`Scanning ${progress}%`:"Run deep scan"}</button><button className={styles.secondary} disabled={running} onClick={()=>void runScan("quick")}>Quick scan</button></div></header>

  {running&&<div className={styles.progress}><i style={{width:`${progress}%`}}/><span>{progress}% · probing catalogue clusters, price bands and audience lanes</span></div>}
  {notice&&<div className={styles.notice}>{notice}</div>}

  <section className={styles.metrics}><div><b>{results.length}</b><span>micro-markets probed</span></div><div><b>{skuCount}</b><span>live product samples</span></div><div><b>{verticals}</b><span>vertical groups</span></div><div><b>{topScore}</b><span>top active score</span></div></section>

  <section className={styles.control}><div className={styles.lenses}>{([['gems','Hidden gems'],['broad','Broad reach'],['conversion','Conversion'],['ynot','YNOT lens'],['high','High ticket'],['low','Low ticket']] as [Lens,string][]).map(([k,label])=><button key={k} className={lens===k?styles.active:""} onClick={()=>setLens(k)}>{label}</button>)}</div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filter audience, niche or vertical…"/></section>

  {!results.length&&!running&&<section className={styles.empty}><b>Deep Scan is ready.</b><p>It will test up to 48 distinct micro-markets in one run rather than relying only on obvious categories. The system only elevates a niche when live catalogue evidence exists.</p><div className={styles.method}><span>Catalogue depth</span><span>Image quality</span><span>Brand diversity</span><span>Price structure</span><span>Novelty</span><span>Organic potential</span><span>Conversion potential</span><span>YNOT fit</span></div></section>}

  <section className={styles.grid}>{filtered.map((item,index)=>{const m=item.metrics;const open=expanded===item.probe.name;return <article className={styles.card} key={item.probe.name}>
   <div className={styles.rank}>#{index+1}</div><div className={styles.cardHead}><div><small>{item.probe.vertical} · {m.ticket} ticket</small><h2>{item.probe.name}</h2></div><div className={styles.gem}>{m.gem}</div></div>
   <p className={styles.audience}>{item.strategy.audience}</p>
   <div className={styles.scoreGrid}><div><b>{m.broad}</b><span>Reach</span></div><div><b>{m.conversion}</b><span>Convert</span></div><div><b>{m.ynot}</b><span>YNOT</span></div><div><b>{m.evidence}</b><span>Evidence</span></div></div>
   <div className={styles.evidence}><span>{m.productCount} live products</span><span>{m.brandCount} brands</span><span>median {m.priceSpread?.median||0}</span><span>visual {m.visual}/100</span></div>
   <div className={styles.thumbs}>{(item.products||[]).slice(0,5).map((p:any)=><div key={p.id}>{p.image?<img src={p.image} alt=""/>:null}</div>)}</div>
   <button className={styles.expand} onClick={()=>setExpanded(open?null:item.probe.name)}>{open?"Hide field brief":"Open field brief"}</button>
   {open&&<div className={styles.brief}><div><b>Audience</b><p>{item.strategy.audience}</p></div><div><b>Organic entry</b><p>{item.strategy.organic}</p></div><div><b>Paid structure</b><p>{item.strategy.paid}</p></div><div><b>YNOT play</b><p>{item.strategy.ynot}</p></div><div><b>First test</b><p>{item.strategy.firstTest}</p></div><div><b>Search footprint</b><p>{item.probe.query}</p></div></div>}
   <div className={styles.actions}><button onClick={()=>void sendToFactory(item)}>Promote to active niche</button><a href={`/admin/ads?intelligence=${encodeURIComponent(item.probe.name)}`}>Open Ad Factory</a></div>
  </article>})}</section>
 </div></main>
}
