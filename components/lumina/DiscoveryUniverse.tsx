"use client";

import {FormEvent,useMemo,useState} from "react";
import {ExternalLink,Search,Sparkles,X} from "lucide-react";

type Profile={id:string;username:string;fullName?:string;profileUrl?:string;profilePictureUrl?:string;followers?:number|null;biography?:string|null;website?:string|null;category?:string|null;sharedParentCount:number;relevanceScore:number;parentUsernames:string[]};
type Response={profiles?:Profile[];uniqueCount?:number;newCount?:number;reusedCount?:number;learnedKeywords?:string[];error?:string};

function fmt(n?:number|null){if(!n)return"";return new Intl.NumberFormat("en",{notation:"compact",maximumFractionDigits:1}).format(n)}

export default function DiscoveryUniverse(){
 const [query,setQuery]=useState("independent swimwear brands");
 const [profiles,setProfiles]=useState<Profile[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [selected,setSelected]=useState<Profile|null>(null);
 const [meta,setMeta]=useState({unique:0,fresh:0,reused:0});
 const rows=useMemo(()=>[profiles.filter((_,i)=>i%3===0),profiles.filter((_,i)=>i%3===1),profiles.filter((_,i)=>i%3===2)],[profiles]);
 async function run(e?:FormEvent){e?.preventDefault();const clean=query.trim();if(clean.length<2)return;setLoading(true);setError("");try{const r=await fetch("/api/instagram/discover",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:clean,target:1000,keywordPages:10,relatedPerSeed:80,seedExpansionLimit:18})});const data:Response=await r.json();if(!r.ok)throw new Error(data.error||"Discovery search failed");setProfiles(data.profiles||[]);setMeta({unique:data.uniqueCount||0,fresh:data.newCount||0,reused:data.reusedCount||0})}catch(err){setError(err instanceof Error?err.message:"Discovery search failed")}finally{setLoading(false)}}
 return <main className="discover-universe">
  <section className="discover-hero">
   <div><small>INSTAGRAM BRAND DISCOVERY</small><h1>Discover brands visually.</h1><p>Search a niche, then branch through related accounts while YNOT remembers every connection.</p></div>
   <form className="discover-search" onSubmit={run}><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try ‘minimal activewear brands’"/><button disabled={loading}>{loading?"Searching…":"Explore"}<Sparkles/></button></form>
   {(meta.unique>0||loading)&&<div className="discover-stats"><span>{meta.unique} unique</span><span>{meta.fresh} new</span><span>{meta.reused} reused</span></div>}
   {error&&<p className="discover-error">{error}</p>}
  </section>
  {profiles.length?<section className="discover-rows">{rows.map((row,rowIndex)=><div className="discover-row" key={rowIndex}><div className="discover-track">{row.map(p=><button className="discover-bubble" key={p.username} onClick={()=>setSelected(p)} title={`@${p.username}`}><span className="discover-bubble-media">{p.profilePictureUrl?<img src={p.profilePictureUrl} alt=""/>:<span>{p.username.slice(0,2).toUpperCase()}</span>}</span><i className="discover-avatar">{p.profilePictureUrl?<img src={p.profilePictureUrl} alt=""/>:p.username.slice(0,1).toUpperCase()}</i>{p.sharedParentCount>1&&<b>{p.sharedParentCount}×</b>}</button>)}</div></div>)}</section>:<section className="discover-empty"><Sparkles/><h2>Your brand universe starts here.</h2><p>Run a niche search to build the first connected profile graph.</p></section>}
  {selected&&<div className="discover-profile-backdrop" onClick={()=>setSelected(null)}><article className="discover-profile-card" onClick={e=>e.stopPropagation()}><button className="discover-profile-close" onClick={()=>setSelected(null)}><X/></button><header>{selected.profilePictureUrl?<img src={selected.profilePictureUrl} alt=""/>:<span>{selected.username.slice(0,1).toUpperCase()}</span>}<div><small>{selected.category||"Instagram profile"}</small><h2>{selected.fullName||`@${selected.username}`}</h2><p>@{selected.username}{selected.followers?` · ${fmt(selected.followers)} followers`:""}</p></div></header>{selected.biography&&<p className="discover-bio">{selected.biography}</p>}<div className="discover-profile-actions">{selected.profileUrl&&<a href={selected.profileUrl} target="_blank" rel="noreferrer">Instagram <ExternalLink/></a>}{selected.website&&<a href={selected.website} target="_blank" rel="noreferrer">Website <ExternalLink/></a>}<button onClick={()=>{setQuery(selected.fullName||selected.username);setSelected(null);setTimeout(()=>void run(),0)}}>Find similar <Sparkles/></button></div><footer><span>{selected.sharedParentCount} related-parent match{selected.sharedParentCount===1?"":"es"}</span><strong>Relevance {Math.round(selected.relevanceScore)}</strong></footer></article></div>}
 </main>;
}
