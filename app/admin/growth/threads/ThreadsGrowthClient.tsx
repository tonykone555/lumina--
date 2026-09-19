"use client";

import { useEffect, useMemo, useState } from "react";

type Post = {
  id: string;
  text?: string;
  username?: string;
  permalink?: string;
  timestamp?: string;
  media_url?: string;
  relevance?: number;
  suggested_reply?: string;
  product?: { id:string; title:string; price?:number; currency?:string; image?:string; url:string } | null;
};

export default function ThreadsGrowthClient() {
  const [query,setQuery]=useState("AI shopping");
  const [searchType,setSearchType]=useState<"TOP"|"RECENT">("RECENT");
  const [results,setResults]=useState<Post[]>([]);
  const [queue,setQueue]=useState<any[]>([]);
  const [watchlists,setWatchlists]=useState<any[]>([]);
  const [settings,setSettings]=useState<any>(null);
  const [scheduled,setScheduled]=useState<any[]>([]);
  const [busy,setBusy]=useState<string>("");
  const [composer,setComposer]=useState({text:"",media_type:"TEXT",media_url:"",scheduled_for:""});
  const [error,setError]=useState("");

  async function json(url:string, init?:RequestInit){
    const r=await fetch(url,{...init,headers:{"Content-Type":"application/json",...(init?.headers||{})}});
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data?.error||`Request failed (${r.status})`);
    return data;
  }

  async function load(){
    try{
      const [d,s]=await Promise.all([
        json("/api/admin/growth/threads/data"),
        json("/api/admin/growth/threads/schedule")
      ]);
      setQueue(d.queue||[]); setWatchlists(d.watchlists||[]); setSettings(d.settings||null); setScheduled(s.posts||[]);
    }catch(e:any){setError(e.message)}
  }

  useEffect(()=>{load()},[]);

  async function search(){
    setBusy("search");setError("");
    try{
      const d=await json(`/api/admin/growth/threads/search?q=${encodeURIComponent(query)}&type=${searchType}&limit=24`);
      setResults(d.results||[]);
    }catch(e:any){setError(e.message)}finally{setBusy("")}
  }

  async function analyse(post:Post){
    setBusy(post.id);setError("");
    try{
      const d=await json("/api/admin/growth/threads/search",{method:"POST",body:JSON.stringify({text:post.text||"",country:"FR"})});
      setResults(r=>r.map(x=>x.id===post.id?{...x,product:d.product,suggested_reply:d.suggested_reply}:x));
    }catch(e:any){setError(e.message)}finally{setBusy("")}
  }

  async function reply(post:Post){
    const text=post.suggested_reply||"";
    if(!text)return analyse(post);
    setBusy(post.id);setError("");
    try{
      await json("/api/admin/growth/threads/reply",{method:"POST",body:JSON.stringify({thread_id:post.id,text,image_url:post.product?.image||""})});
      setResults(r=>r.filter(x=>x.id!==post.id)); await load();
    }catch(e:any){setError(e.message)}finally{setBusy("")}
  }

  async function addWatchlist(){
    if(!query.trim())return;
    setBusy("watch"); setError("");
    try{
      await json("/api/admin/growth/threads/data",{method:"POST",body:JSON.stringify({action:"watchlist",query,search_type:searchType,min_relevance:75,auto_reply:false,max_replies_per_run:2})});
      await load();
    }catch(e:any){setError(e.message)}finally{setBusy("")}
  }

  async function updateSettings(patch:any){
    setBusy("settings");setError("");
    try{
      const d=await json("/api/admin/growth/threads/data",{method:"POST",body:JSON.stringify({action:"settings",...patch})});
      setSettings(d.settings);
    }catch(e:any){setError(e.message)}finally{setBusy("")}
  }

  async function runAutomation(){
    setBusy("auto");setError("");
    try{await json("/api/admin/growth/threads/auto/run"); await load()}catch(e:any){setError(e.message)}finally{setBusy("")}
  }

  async function publishNow(){
    setBusy("publish");setError("");
    try{
      await json("/api/admin/growth/threads/publish",{method:"POST",body:JSON.stringify(composer)});
      setComposer({text:"",media_type:"TEXT",media_url:"",scheduled_for:""}); await load();
    }catch(e:any){setError(e.message)}finally{setBusy("")}
  }

  async function schedulePost(){
    setBusy("schedule");setError("");
    try{
      await json("/api/admin/growth/threads/schedule",{method:"POST",body:JSON.stringify(composer)});
      setComposer({text:"",media_type:"TEXT",media_url:"",scheduled_for:""}); await load();
    }catch(e:any){setError(e.message)}finally{setBusy("")}
  }

  const activeWatchlists=useMemo(()=>watchlists.filter((w:any)=>w.enabled).length,[watchlists]);

  return <div className="threadsAdmin">
    {error && <div className="threadError">{error}<button onClick={()=>setError("")}>×</button></div>}

    <section className="threadHero panel">
      <div><span>THREADS GROWTH</span><h2>Find conversations. Match products. Reply naturally.</h2><p>Search public Threads, analyse buying intent, attach the closest YNOT catalogue product and keep everything inside one queue.</p></div>
      <div className="threadHealth"><i/><div><strong>{settings?.auto_reply_enabled?"Autopilot on":"Approval mode"}</strong><small>{activeWatchlists} active watchlists</small></div></div>
    </section>

    <div className="threadGrid">
      <section className="panel threadDiscover">
        <div className="panelHead"><div><span>DISCOVER</span><h2>Relevant public posts</h2></div><b>{results.length} results</b></div>
        <div className="threadSearch">
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")search()}} placeholder="Search Threads..." />
          <select value={searchType} onChange={e=>setSearchType(e.target.value as any)}><option value="RECENT">Recent</option><option value="TOP">Top</option></select>
          <button onClick={search} disabled={busy==="search"}>{busy==="search"?"Searching…":"Search"}</button>
          <button className="soft" onClick={addWatchlist} disabled={busy==="watch"}>+ Watch</button>
        </div>
        <div className="threadCards">
          {results.length?results.map(post=><article className="threadCard" key={post.id}>
            <div className="threadCardTop"><div><strong>@{post.username||"threads"}</strong><small>{post.timestamp?new Date(post.timestamp).toLocaleString():""}</small></div><em>{post.relevance??0}% match</em></div>
            <p>{post.text||"No text"}</p>
            {post.product&&<div className="threadProduct">{post.product.image?<img src={post.product.image} alt=""/>:<div/>}<span><strong>{post.product.title}</strong><small>{post.product.currency} {post.product.price??""}</small></span></div>}
            {post.suggested_reply&&<div className="replyDraft"><span>Suggested reply</span><p>{post.suggested_reply}</p></div>}
            <div className="threadActions">
              {post.permalink&&<a href={post.permalink} target="_blank" rel="noreferrer">Open</a>}
              <button className="soft" onClick={()=>analyse(post)} disabled={busy===post.id}>Analyse + product</button>
              <button onClick={()=>reply(post)} disabled={busy===post.id||!post.suggested_reply}>{post.product?.image?"Reply + product":"Reply"}</button>
            </div>
          </article>):<div className="empty">Search a topic to pull live Threads conversations.</div>}
        </div>
      </section>

      <aside className="threadSide">
        <section className="panel">
          <div className="panelHead"><div><span>AUTOPILOT</span><h2>Bounded automation</h2></div></div>
          <div className="settingRows">
            <label><span>Auto replies<small>Only high-relevance watchlist matches</small></span><input type="checkbox" checked={!!settings?.auto_reply_enabled} onChange={e=>updateSettings({auto_reply_enabled:e.target.checked})}/></label>
            <label><span>Attach catalogue<small>Image + YNOT product link when matched</small></span><input type="checkbox" checked={settings?.attach_catalog!==false} onChange={e=>updateSettings({attach_catalog:e.target.checked})}/></label>
            <label><span>Scheduled auto posts<small>Publish due queued posts automatically</small></span><input type="checkbox" checked={!!settings?.auto_post_enabled} onChange={e=>updateSettings({auto_post_enabled:e.target.checked})}/></label>
          </div>
          <button className="runAuto" onClick={runAutomation} disabled={busy==="auto"}>{busy==="auto"?"Running…":"Run scan now"}</button>
          <p className="guardrail">Default guardrails: high relevance, max {settings?.max_auto_replies_per_day??5} automatic replies/day, sensitive topics excluded.</p>
        </section>

        <section className="panel">
          <div className="panelHead"><div><span>WATCHLISTS</span><h2>Topics YNOT monitors</h2></div></div>
          <div className="watchRows">{watchlists.length?watchlists.map((w:any)=><div className="watch" key={w.id}><div><strong>{w.query}</strong><small>{w.search_type} · ≥{w.min_relevance}%</small></div><em>{w.auto_reply?"AUTO":"QUEUE"}</em></div>):<div className="empty small">Save a search to start monitoring it.</div>}</div>
        </section>
      </aside>
    </div>

    <div className="threadGrid lower">
      <section className="panel">
        <div className="panelHead"><div><span>CONVERSATIONS</span><h2>Reply queue</h2></div><b>{queue.filter((q:any)=>q.status==="queued").length} waiting</b></div>
        <div className="conversationRows">{queue.length?queue.map((q:any)=><div className="conversation" key={q.id}>
          <div className="conversationText"><strong>@{q.username||"threads"}</strong><p>{q.thread_text}</p><small>{q.source_query||"discovery"} · {q.relevance}% · {q.status}</small></div>
          {q.image_url&&<img src={q.image_url} alt=""/>}
        </div>):<div className="empty">No queued conversations yet.</div>}</div>
      </section>

      <section className="panel composer">
        <div className="panelHead"><div><span>PUBLISHING</span><h2>Post to YNOT Threads</h2></div></div>
        <textarea value={composer.text} onChange={e=>setComposer({...composer,text:e.target.value})} placeholder="Write the post…"/>
        <div className="composerRow">
          <select value={composer.media_type} onChange={e=>setComposer({...composer,media_type:e.target.value})}><option>TEXT</option><option>IMAGE</option><option>VIDEO</option></select>
          <input value={composer.media_url} onChange={e=>setComposer({...composer,media_url:e.target.value})} placeholder="Public image/video URL (optional)" />
        </div>
        <div className="composerRow"><input type="datetime-local" value={composer.scheduled_for} onChange={e=>setComposer({...composer,scheduled_for:e.target.value})}/><button className="soft" onClick={schedulePost} disabled={busy==="schedule"}>Schedule</button><button onClick={publishNow} disabled={busy==="publish"}>Publish now</button></div>
        <div className="scheduledList">{scheduled.slice(0,6).map((p:any)=><div key={p.id}><strong>{p.status}</strong><span>{p.text||p.media_type}</span><small>{p.scheduled_for?new Date(p.scheduled_for).toLocaleString():"draft"}</small></div>)}</div>
      </section>
    </div>
  </div>;
}
