"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import {ExternalLink,Heart,Search,Sparkles,X} from "lucide-react";

type Profile={id:string;username:string;fullName?:string;profileUrl?:string;profilePictureUrl?:string;followers?:number|null;biography?:string|null;website?:string|null;category?:string|null;sharedParentCount:number;relevanceScore:number;parentUsernames:string[]};
type Response={profiles?:Profile[];error?:string;uniqueCount?:number;newCount?:number;reusedCount?:number;persistence?:"supabase"|"none";learnedKeywords?:string[]};
type Health={apifyConfigured?:boolean;persistenceConfigured?:boolean};
const SAVED_KEY="ynot-discover-saved-profiles";
const EXAMPLES=["independent swimwear brands","small activewear brands UK","body-confidence fashion brands","minimal premium jewelry brands"];

function fmt(n?:number|null){if(!n)return"";return new Intl.NumberFormat("en",{notation:"compact",maximumFractionDigits:1}).format(n)}
function dedupe(list:Profile[]){const seen=new Set<string>();return list.filter(p=>{const k=p.username.toLowerCase();if(seen.has(k))return false;seen.add(k);return true})}
function savedProfiles():Profile[]{try{const value=JSON.parse(localStorage.getItem(SAVED_KEY)||"[]");return Array.isArray(value)?value:[]}catch{return[]}}
function discoveryTerms(profile:Profile){const source=`${profile.category||""} ${profile.biography||""}`.toLowerCase().replace(/https?:\/\/\S+/g," ").replace(/[^a-z0-9 -]/g," ").split(/\s+/).filter(w=>w.length>3);const stop=new Set(["with","this","that","from","your","official","instagram","shop","store","brand","brands"]);return [...new Set(source.filter(w=>!stop.has(w)))].slice(0,8)}

export default function DiscoveryUniverse(){
 const [profiles,setProfiles]=useState<Profile[]>([]);
 const [loading,setLoading]=useState(false);
 const [selected,setSelected]=useState<Profile|null>(null);
 const [query,setQuery]=useState("");
 const [activeQuery,setActiveQuery]=useState("");
 const [error,setError]=useState("");
 const [stats,setStats]=useState<{unique:number;newCount:number;reused:number}>({unique:0,newCount:0,reused:0});
 const [saved,setSaved]=useState<Set<string>>(new Set());
 const [health,setHealth]=useState<Health>({});
 const rows=useMemo(()=>{
  const ranked=[...profiles].sort((a,b)=>b.relevanceScore-a.relevanceScore);
  return [
   ranked.filter((_,i)=>i%3===0),
   ranked.filter((_,i)=>i%3===1),
   ranked.filter((_,i)=>i%3===2)
  ];
 },[profiles]);

 useEffect(()=>{setSaved(new Set(savedProfiles().map(p=>p.username)));fetch("/api/instagram/discover",{cache:"no-store"}).then(r=>r.json()).then((data:Health)=>setHealth(data)).catch(()=>{})},[]);

 async function runSearch(term:string,options:{seed?:Profile;append?:boolean}={}){
  const clean=term.trim();if(clean.length<2)return;
  setLoading(true);setError("");setActiveQuery(clean);
  try{
   const learned=options.seed?discoveryTerms(options.seed):[];
   const r=await fetch("/api/instagram/discover",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:clean,target:180,keywordPages:3,relatedPerSeed:40,seedExpansionLimit:8,learnedKeywords:learned,seedUsernames:options.seed?[options.seed.username]:[]})});
   const data:Response=await r.json();
   if(!r.ok)throw new Error(data.error||"Instagram discovery is unavailable");
   const incoming=data.profiles||[];
   setProfiles(current=>dedupe(options.append?[...current,...incoming]:incoming));
   setStats({unique:Number(data.uniqueCount||incoming.length),newCount:Number(data.newCount||incoming.length),reused:Number(data.reusedCount||0)});
  }catch(e){setError(e instanceof Error?e.message:"Instagram discovery is unavailable")}finally{setLoading(false)}
 }

 function submit(event:FormEvent){event.preventDefault();void runSearch(query)}
 useEffect(()=>{const onSearch=(event:Event)=>{const term=String((event as CustomEvent<string>).detail||"");setQuery(term);void runSearch(term)};window.addEventListener("discover:search",onSearch);return()=>window.removeEventListener("discover:search",onSearch)},[]);

 function findSimilar(profile:Profile){
  setSelected(null);
  const descriptors=[profile.category,...discoveryTerms(profile).slice(0,5)].filter(Boolean).join(" ")||activeQuery||profile.username;
  setQuery(descriptors);
  void runSearch(descriptors,{seed:profile});
 }
 function expand(){if(activeQuery&&!loading)void runSearch(activeQuery,{append:true})}
 function toggleSave(profile:Profile){const current=savedProfiles();const exists=current.some(p=>p.username===profile.username);const next=exists?current.filter(p=>p.username!==profile.username):[profile,...current];localStorage.setItem(SAVED_KEY,JSON.stringify(next));setSaved(new Set(next.map(p=>p.username)))}
 const displayRows=profiles.length?rows:[Array.from({length:10},(_,i)=>i),Array.from({length:10},(_,i)=>i),Array.from({length:10},(_,i)=>i)];
 const rowNames=["Closest matches","Suggested by seed brands","Fresh + adjacent"];

 return <main className={`discover-universe ${loading?"is-loading":""}`}>
  <section className="discover-hero">
   <small>INSTAGRAM DISCOVERY GRAPH</small>
   <h1>Discover brands through brands.</h1>
   <p>Search a niche, open a profile, then use Find Similar to expand through Instagram’s related-account graph instead of scrolling a flat list.</p>
   <form className="discover-search" onSubmit={submit}><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try: independent swimwear brands, minimal jewelry, activewear UK…"/><button type="submit" disabled={loading}>{loading?"Discovering…":"Discover"}<Sparkles/></button></form>
   <div className="discover-example-row">{EXAMPLES.map(example=><button key={example} onClick={()=>{setQuery(example);void runSearch(example)}}>{example}</button>)}</div>
   <div className="discover-stats"><span>{health.apifyConfigured===false?"Provider needs API key":health.apifyConfigured?"Apify connected":"Checking provider…"}</span><span>{stats.unique?`${stats.unique} profiles`:"Graph-first search"}</span>{stats.newCount>0&&<span>{stats.newCount} new</span>}{stats.reused>0&&<span>{stats.reused} reused</span>}{saved.size>0&&<span>{saved.size} saved</span>}{profiles.length>0&&<button className="discover-expand" onClick={expand} disabled={loading}>Expand graph</button>}</div>
   {error&&<p className="discover-error">{error}</p>}
  </section>
  <section className="discover-rows">{displayRows.map((row,rowIndex)=><div className="discover-row-wrap" key={rowIndex}><div className="discover-row-label"><span>{rowNames[rowIndex]}</span><small>{profiles.length?(row as Profile[]).length:""}</small></div><div className="discover-row"><div className="discover-track">{profiles.length?(row as Profile[]).map((p,index)=><button className="discover-bubble" style={{"--bubble-i":index} as React.CSSProperties} key={p.username} onClick={()=>setSelected(p)} title={`@${p.username}`}><span className="discover-bubble-media">{p.profilePictureUrl?<img src={p.profilePictureUrl} alt=""/>:<span>{p.username.slice(0,2).toUpperCase()}</span>}</span><i className="discover-avatar">{p.profilePictureUrl?<img src={p.profilePictureUrl} alt=""/>:p.username.slice(0,1).toUpperCase()}</i>{p.sharedParentCount>1&&<b>{p.sharedParentCount}×</b>}</button>):(row as number[]).map(i=><span className="discover-bubble discover-bubble-ghost" style={{"--bubble-i":i} as React.CSSProperties} key={`${rowIndex}-${i}`}/>)}</div></div></div>)}</section>
  {selected&&<div className="discover-profile-backdrop" onClick={()=>setSelected(null)}><article className="discover-profile-card" onClick={e=>e.stopPropagation()}><button className="discover-profile-close" onClick={()=>setSelected(null)}><X/></button><header>{selected.profilePictureUrl?<img src={selected.profilePictureUrl} alt=""/>:<span>{selected.username.slice(0,1).toUpperCase()}</span>}<div><small>{selected.category||"Instagram profile"}</small><h2>{selected.fullName||`@${selected.username}`}</h2><p>@{selected.username}{selected.followers?` · ${fmt(selected.followers)} followers`:""}</p></div></header>{selected.biography&&<p className="discover-bio">{selected.biography}</p>}<div className="discover-profile-actions"><button className={saved.has(selected.username)?"discover-save active":"discover-save"} onClick={()=>toggleSave(selected)}><Heart/>{saved.has(selected.username)?"Saved":"Save"}</button>{selected.profileUrl&&<a href={selected.profileUrl} target="_blank" rel="noreferrer">Instagram <ExternalLink/></a>}{selected.website&&<a href={selected.website} target="_blank" rel="noreferrer">Website <ExternalLink/></a>}<button onClick={()=>findSimilar(selected)}>Find similar <Sparkles/></button></div><footer><span>{selected.sharedParentCount} related-parent match{selected.sharedParentCount===1?"":"es"}</span><strong>Relevance {Math.round(selected.relevanceScore)}</strong></footer></article></div>}
 </main>;
}
