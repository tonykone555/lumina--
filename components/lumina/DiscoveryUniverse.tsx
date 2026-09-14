"use client";

import {useEffect,useMemo,useState} from "react";
import {ExternalLink,Sparkles,X} from "lucide-react";

type Profile={id:string;username:string;fullName?:string;profileUrl?:string;profilePictureUrl?:string;followers?:number|null;biography?:string|null;website?:string|null;category?:string|null;sharedParentCount:number;relevanceScore:number;parentUsernames:string[]};
type Response={profiles?:Profile[];error?:string};

function fmt(n?:number|null){if(!n)return"";return new Intl.NumberFormat("en",{notation:"compact",maximumFractionDigits:1}).format(n)}

export default function DiscoveryUniverse(){
 const [profiles,setProfiles]=useState<Profile[]>([]);
 const [loading,setLoading]=useState(false);
 const [selected,setSelected]=useState<Profile|null>(null);
 const rows=useMemo(()=>[profiles.filter((_,i)=>i%3===0),profiles.filter((_,i)=>i%3===1),profiles.filter((_,i)=>i%3===2)],[profiles]);
 async function search(term:string){const clean=term.trim();if(clean.length<2)return;setLoading(true);try{const r=await fetch("/api/instagram/discover",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:clean,target:1000,keywordPages:10,relatedPerSeed:80,seedExpansionLimit:18})});const data:Response=await r.json();if(r.ok)setProfiles(data.profiles||[])}finally{setLoading(false)}}
 useEffect(()=>{const onSearch=(event:Event)=>{const term=String((event as CustomEvent<string>).detail||"");void search(term)};window.addEventListener("discover:search",onSearch);return()=>window.removeEventListener("discover:search",onSearch)},[]);
 function findSimilar(profile:Profile){setSelected(null);void search(profile.fullName||profile.username)}
 const displayRows=profiles.length?rows:[Array.from({length:10},(_,i)=>i),Array.from({length:10},(_,i)=>i),Array.from({length:10},(_,i)=>i)];
 return <main className={`discover-universe ${loading?"is-loading":""}`}>
  <section className="discover-rows">{displayRows.map((row,rowIndex)=><div className="discover-row" key={rowIndex}><div className="discover-track">{profiles.length?(row as Profile[]).map((p,index)=><button className="discover-bubble" style={{"--bubble-i":index} as React.CSSProperties} key={p.username} onClick={()=>setSelected(p)} title={`@${p.username}`}><span className="discover-bubble-media">{p.profilePictureUrl?<img src={p.profilePictureUrl} alt=""/>:<span>{p.username.slice(0,2).toUpperCase()}</span>}</span><i className="discover-avatar">{p.profilePictureUrl?<img src={p.profilePictureUrl} alt=""/>:p.username.slice(0,1).toUpperCase()}</i>{p.sharedParentCount>1&&<b>{p.sharedParentCount}×</b>}</button>):(row as number[]).map(i=><span className="discover-bubble discover-bubble-ghost" style={{"--bubble-i":i} as React.CSSProperties} key={`${rowIndex}-${i}`}/>)}</div></div>)}</section>
  {selected&&<div className="discover-profile-backdrop" onClick={()=>setSelected(null)}><article className="discover-profile-card" onClick={e=>e.stopPropagation()}><button className="discover-profile-close" onClick={()=>setSelected(null)}><X/></button><header>{selected.profilePictureUrl?<img src={selected.profilePictureUrl} alt=""/>:<span>{selected.username.slice(0,1).toUpperCase()}</span>}<div><small>{selected.category||"Instagram profile"}</small><h2>{selected.fullName||`@${selected.username}`}</h2><p>@{selected.username}{selected.followers?` · ${fmt(selected.followers)} followers`:""}</p></div></header>{selected.biography&&<p className="discover-bio">{selected.biography}</p>}<div className="discover-profile-actions">{selected.profileUrl&&<a href={selected.profileUrl} target="_blank" rel="noreferrer">Instagram <ExternalLink/></a>}{selected.website&&<a href={selected.website} target="_blank" rel="noreferrer">Website <ExternalLink/></a>}<button onClick={()=>findSimilar(selected)}>Find similar <Sparkles/></button></div><footer><span>{selected.sharedParentCount} related-parent match{selected.sharedParentCount===1?"":"es"}</span><strong>Relevance {Math.round(selected.relevanceScore)}</strong></footer></article></div>}
 </main>;
}
