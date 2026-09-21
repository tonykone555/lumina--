"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,Check,Copy,ExternalLink,Link2,LogIn,Search,Share2,Sparkles,TrendingUp,WalletCards,X} from "lucide-react";
import {authedFetch,readSession} from "@/lib/ynot/supabase-browser";
import CreatorStudio from "./CreatorStudio";
import CreatorAcademy from "./CreatorAcademy";

type Product={id:string;title:string;brand?:string;price?:number|null;supplierPrice?:number|null;currency?:string;image?:string;images?:string[];url?:string;description?:string;category?:string};
type CreatorProduct={id:string;product_id:string;title:string;brand?:string;image_url?:string;product_url?:string;price?:number|null;currency:string;commission_rate:number;commission_cents?:number|null};
type SourceCandidate={productId:string;title:string;url:string;imageUrl?:string|null;landedCost:number;creatorPayout:number;creatorPayoutRate:number;ynotRetainedMargin:number;matchType:"exact"|"equivalent"|"similar";matchConfidence:number;safeToRepresentAsOriginal:boolean;hasClearDelivery?:boolean;eligibleForBoost?:boolean;extraCreatorPayout?:number};
type SourceCheck={baseline?:{creatorPayout:number;creatorPayoutRate:number}|null;boost?:SourceCandidate|null};
type Opportunity={product:Product;catalogueFit:number;economicsFit:number;creatorFit:number;opportunityScore:number;reasons:string[]};
type OpportunitySignal={metaAds:number;tiktokAds:number;advertisers:number;activeAds:number;repeatedAdvertisers:number;adSignalScore:number;evidence:string[]};
type Dashboard={creator:any;stats:{clicks:number;products:number;pending_cents:number;available_cents:number;paid_cents:number};products:CreatorProduct[];commissions:any[];payouts:any[]};
type Tab="overview"|"discover"|"studio"|"links"|"earnings"|"academy";
const interests=["fashion","beauty","fitness","home","tech","pets","food","lifestyle"];
const browse=["fashion finds","beauty tools","fitness accessories","home decor","tech accessories","pet accessories"];

function moneyCents(v:number,currency="EUR"){try{return new Intl.NumberFormat(undefined,{style:"currency",currency,maximumFractionDigits:2}).format((v||0)/100)}catch{return `€${((v||0)/100).toFixed(2)}`}}
function money(v:number,currency="EUR"){try{return new Intl.NumberFormat(undefined,{style:"currency",currency,maximumFractionDigits:2}).format(v||0)}catch{return `€${Number(v||0).toFixed(2)}`}}
function share(productId:string,code:string){return `https://ynotworld.app/p/${encodeURIComponent(productId)}?ref=${encodeURIComponent(code)}`}

export default function CreatorDashboard(){
 const[data,setData]=useState<Dashboard|null>(null),[loading,setLoading]=useState(true),[signedOut,setSignedOut]=useState(false),[tab,setTab]=useState<Tab>("overview");
 const[query,setQuery]=useState(""),[results,setResults]=useState<Product[]>([]),[searching,setSearching]=useState(false),[working,setWorking]=useState<string>(""),[notice,setNotice]=useState("");
 const[sourceEconomics,setSourceEconomics]=useState<Record<string,SourceCheck>>({}),[sourceChecking,setSourceChecking]=useState<string>("");
 const[opportunities,setOpportunities]=useState<Record<string,Opportunity>>({}),[opportunitySignal,setOpportunitySignal]=useState<OpportunitySignal|null>(null),[researching,setResearching]=useState(false);
 const[niches,setNiches]=useState<string[]>([]),[bio,setBio]=useState(""),[onboarding,setOnboarding]=useState(false);

 async function load(){
  setLoading(true);setNotice("");
  if(!readSession()){setSignedOut(true);setLoading(false);return}
  try{
   const r=await authedFetch("/api/earn/me"),j=await r.json().catch(()=>({}));
   if(r.status===401){setSignedOut(true);setData(null);return}
   if(!r.ok)throw new Error(j.error||"Unable to load creator dashboard");
   setData(j);setSignedOut(false);setNiches(j.creator?.niches||[]);setBio(j.creator?.bio||"");setOnboarding(!j.creator?.onboarded_at);
  }catch(e){setNotice(e instanceof Error?e.message:"Unable to load dashboard")}finally{setLoading(false)}
 }
 useEffect(()=>{void load();const changed=()=>setTimeout(()=>void load(),50);window.addEventListener("ynot:auth-changed",changed);return()=>window.removeEventListener("ynot:auth-changed",changed)},[]);
 useEffect(()=>{const next=new URLSearchParams(window.location.search).get("tab") as Tab|null;if(next&&(["overview","discover","studio","links","earnings","academy"] as Tab[]).includes(next))setTab(next)},[]);

 async function saveOnboarding(){
  setWorking("onboarding");setNotice("");
  try{const r=await authedFetch("/api/earn/me",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({niches,bio})}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Unable to save creator profile");setData(j);setOnboarding(false);setNotice("Creator profile activated.")}catch(e){setNotice(e instanceof Error?e.message:"Unable to save")}finally{setWorking("")}
 }
 async function findProducts(term=query){
  const q=term.trim();if(q.length<2)return;setSearching(true);setNotice("");setQuery(q);setTab("discover");
  try{const r=await fetch(`/api/catalog?q=${encodeURIComponent(q)}&source=shopify&country=FR`),j=await r.json();if(!r.ok)throw new Error(j.error||"Search failed");setResults((j.products||[]).slice(0,36));if(!(j.products||[]).length)setNotice("No products found. Try another search.")}catch(e){setNotice(e instanceof Error?e.message:"Search failed")}finally{setSearching(false)}
 }
 async function researchProducts(){
  const q=query.trim();if(q.length<2||!results.length)return;
  setResearching(true);setNotice("");
  try{
   const r=await authedFetch("/api/earn/opportunities",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({niche:q,country:"FR",products:results})});
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(j.error||"Unable to research this niche");
   const map:Record<string,Opportunity>={};for(const x of j.opportunities||[])map[String(x.product?.id||"")]=x;
   setOpportunities(map);setOpportunitySignal(j.signal||null);
  }catch(e){setNotice(e instanceof Error?e.message:"Unable to research this niche")}finally{setResearching(false)}
 }
 async function checkEarning(p:Product){
  if(!p.price||sourceChecking===p.id)return;
  setSourceChecking(p.id);setNotice("");
  try{
   const r=await authedFetch("/api/earn/sourcing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:p.title,brand:p.brand,price:p.price,main_supplier_price:p.supplierPrice,category:p.category,currency:p.currency||"EUR",ship_to:"FR"})});
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(j.error||"Unable to check sourcing");
   setSourceEconomics(s=>({...s,[p.id]:{baseline:j.baseline||null,boost:j.boost||null}}));
   if(!j.boost)setNotice("No verified same-product supplier upgrade found. Your standard YNOT earning stays active.");
  }catch(e){setNotice(e instanceof Error?e.message:"Unable to check sourcing")}finally{setSourceChecking("")}
 }
 async function promote(p:Product){
  setWorking(p.id);setNotice("");
  try{
   const check=sourceEconomics[p.id],source=check?.boost;
   const baseline=check?.baseline?.creatorPayout;
   const payout=source?.creatorPayout||baseline;
   const payload={...p,...(payout?{creator_payout:payout}:{}) ,...(source?{sourcing:source}:{})};
   const r=await authedFetch("/api/earn/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}),j=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(j.error||"Could not add product");await load();setTab("links");setNotice("Product added. Your personal link is ready.");
  }catch(e){setNotice(e instanceof Error?e.message:"Could not add product")}finally{setWorking("")}
 }
 async function removeProduct(id:string){
  setWorking(id);try{const r=await authedFetch(`/api/earn/products?id=${encodeURIComponent(id)}`,{method:"DELETE"}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Could not remove product");await load()}catch(e){setNotice(e instanceof Error?e.message:"Could not remove product")}finally{setWorking("")}
 }
 async function copy(value:string){await navigator.clipboard.writeText(value);setNotice("Link copied.");setTimeout(()=>setNotice(""),1200)}
 async function requestPayout(){
  setWorking("payout");setNotice("");
  try{const r=await authedFetch("/api/earn/payouts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({currency:"EUR"})}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Payout request failed");setData(j.dashboard);setNotice("Payout request created. It is now awaiting processing.")}catch(e){setNotice(e instanceof Error?e.message:"Payout request failed")}finally{setWorking("")}
 }
 function openAuth(){window.dispatchEvent(new CustomEvent("ynot:open-auth",{detail:{mode:"signin"}}))}
 const selectedIds=useMemo(()=>new Set((data?.products||[]).map(p=>p.product_id)),[data]);
 const code=data?.creator?.referral_code||"";
 const rate=Number(data?.creator?.commission_rate||.05);

 if(loading)return <main className="creatorDash creatorCenter"><div className="creatorLoader"/><span>Loading your YNOT creator world…</span></main>;
 if(signedOut)return <main className="creatorDash creatorSignedOut"><nav className="creatorTop"><Link href="/" className="earnBrand">YNOT</Link><Link href="/earn"><ArrowLeft/> Earn with YNOT</Link></nav><section><span className="earnPill">YNOT CREATORS</span><h1>Your creator dashboard is waiting.</h1><p>Sign in with a YNOT account to choose products, create tracking links and see your earnings.</p><button className="earnPrimary" onClick={openAuth}><LogIn/> Sign in to continue</button><button className="creatorCreate" onClick={()=>window.dispatchEvent(new CustomEvent("ynot:open-auth",{detail:{mode:"signup"}}))}>Create a YNOT account</button></section></main>;

 return <main className="creatorDash">
  <header className="creatorTop"><Link href="/" className="earnBrand">YNOT</Link><div className="creatorTopRight"><button className={`creatorStudioPill ${tab==="studio"?"active":""}`} onClick={()=>setTab("studio")}><Sparkles/> Studio</button><Link href="/earn">Earn with YNOT</Link><a href={`/c/${code}`} target="_blank">My storefront <ExternalLink/></a><div className="creatorAvatar">{data?.creator?.avatar_url?<img src={data.creator.avatar_url} alt=""/>:<span>{String(data?.creator?.display_name||"Y")[0]}</span>}</div></div></header>
  <div className="creatorShell">
   <aside className="creatorSide"><div className="creatorIdentity"><small>YNOT CREATOR</small><strong>{data?.creator?.display_name||"Creator"}</strong><span>@{code}</span></div><nav>{(["overview","discover","studio","links","earnings","academy"] as Tab[]).map(x=><button key={x} className={tab===x?"active":""} onClick={()=>setTab(x)}>{x==="overview"?"Overview":x==="discover"?"Find products":x==="studio"?"Creator Studio":x==="links"?"My products & links":x==="earnings"?"Earnings":"Academy"}</button>)}</nav><div className="creatorSideCard"><Sparkles/><b>{Math.round(rate*100)}% base commission</b><span>Current creator rate on eligible attributed order subtotal.</span></div><Link className="creatorBack" href="/"><ArrowLeft/> Back to YNOT shop</Link></aside>
   <section className="creatorMain">
    <div className="creatorHeading"><div><span>CREATOR DASHBOARD</span><h1>{tab==="overview"?"Build your catalogue. Grow your earnings.":tab==="discover"?"Find something worth posting.":tab==="studio"?"Create the content.":tab==="links"?"Your products. Your links.":tab==="earnings"?"Earnings & payouts":"Learn the YNOT creator system."}</h1></div>{tab!=="discover"&&tab!=="studio"&&tab!=="academy"&&<button className="creatorAction" onClick={()=>setTab("discover")}>Find products <Search/></button>}</div>
    {notice&&<div className="creatorNotice">{notice}</div>}

    {onboarding&&<section className="creatorOnboard"><div><span>ONE-MINUTE SETUP</span><h2>What do you actually post about?</h2><p>Pick a few interests. YNOT will use these later to rank products and content opportunities for you.</p></div><div className="creatorInterest">{interests.map(x=><button key={x} className={niches.includes(x)?"active":""} onClick={()=>setNiches(s=>s.includes(x)?s.filter(v=>v!==x):[...s,x].slice(0,8))}>{niches.includes(x)?<Check/>:null}{x}</button>)}</div><textarea value={bio} onChange={e=>setBio(e.target.value)} placeholder="Optional: tell YNOT what your audience likes…"/><button className="creatorAction" disabled={working==="onboarding"||!niches.length} onClick={saveOnboarding}>{working==="onboarding"?"Saving…":"Activate creator profile"} <ArrowRight/></button></section>}

    {tab==="overview"&&<>
      <div className="creatorStats"><article><span>CLICKS</span><strong>{Number(data?.stats.clicks||0).toLocaleString()}</strong><small>tracked visits</small></article><article><span>PENDING</span><strong>{moneyCents(data?.stats.pending_cents||0)}</strong><small>inside hold period</small></article><article><span>AVAILABLE</span><strong>{moneyCents(data?.stats.available_cents||0)}</strong><small>cleared commission</small></article><article><span>PAID</span><strong>{moneyCents(data?.stats.paid_cents||0)}</strong><small>completed payouts</small></article></div>
      <section className="creatorPanel"><div className="creatorPanelHead"><div><span>YOUR CATALOGUE</span><h2>{data?.products.length||0} products ready to promote</h2></div><button onClick={()=>setTab("links")}>View links <ArrowRight/></button></div>{data?.products.length?<div className="creatorMiniProducts">{data.products.slice(0,6).map(p=><article key={p.id}>{p.image_url?<img src={p.image_url} alt=""/>:<div/>}<strong>{p.title}</strong><small>{p.commission_cents?moneyCents(p.commission_cents,p.currency):`${Math.round(p.commission_rate*100)}% commission`}</small></article>)}</div>:<div className="creatorEmpty"><Sparkles/><h3>No products yet</h3><p>Search the YNOT catalogue and choose your first product to promote.</p><button onClick={()=>setTab("discover")}>Find a product</button></div>}</section>
      <div className="creatorTwo"><section className="creatorPanel"><div className="creatorPanelHead"><div><span>GET STARTED</span><h2>Search by your niche</h2></div></div><div className="creatorBrowse">{browse.map(x=><button key={x} onClick={()=>void findProducts(x)}>{x}<ArrowRight/></button>)}</div></section><section className="creatorPanel"><div className="creatorPanelHead"><div><span>YOUR STOREFRONT</span><h2>One link for all your picks</h2></div></div><p className="creatorStoreText">Put this in your bio when you want people to browse everything you recommend.</p><div className="creatorLinkBox"><code>ynotworld.app/c/{code}</code><button onClick={()=>copy(`https://ynotworld.app/c/${code}`)}><Copy/></button></div><a className="creatorOpenStore" href={`/c/${code}`} target="_blank">Open storefront <ExternalLink/></a></section></div>
    </>}

    {tab==="discover"&&<>
      <form className="creatorSearch" onSubmit={e=>{e.preventDefault();void findProducts()}}><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search any product — gym set, sofa, skincare, headphones…"/><button disabled={searching}>{searching?"Searching…":"Search YNOT"}</button></form>{results.length?<div className="creatorResearchBar"><button onClick={()=>void researchProducts()} disabled={researching}><TrendingUp/>{researching?"Researching live ads…":"Research what is working"}</button>{opportunitySignal?<div><b>{opportunitySignal.adSignalScore}/100 demand signal</b><span>{opportunitySignal.activeAds} active ads · {opportunitySignal.advertisers} advertisers · {opportunitySignal.repeatedAdvertisers} repeating advertisers</span></div>:<span>Check Meta + TikTok ad activity against these YNOT products.</span>}</div>:null}
      <div className="creatorBrowse creatorBrowseInline">{browse.map(x=><button key={x} onClick={()=>void findProducts(x)}>{x}</button>)}</div>
      {results.length?<div className="creatorProductGrid">{results.map(p=>{const active=selectedIds.has(String(p.id)),check=sourceEconomics[p.id],boost=check?.boost,baseline=check?.baseline?.creatorPayout,fallbackCommission=Number(p.price||0)*rate,earning=boost?.creatorPayout||baseline||fallbackCommission,opp=opportunities[p.id];return <article key={p.id} className={active?"active":""}><div className="creatorProductImage">{p.image?<img src={p.image} alt=""/>:<span>Y</span>}{active&&<i><Check/> Promoting</i>}{opp&&<em className={`creatorOpportunityBadge ${opp.opportunityScore>=70?"hot":opp.opportunityScore>=50?"good":""}`}>{opp.opportunityScore} opportunity</em>}</div><div className="creatorProductBody"><small>{p.brand||"YNOT"}</small><h3>{p.title}</h3><div className="creatorProductMoney"><span>{p.price!=null?money(Number(p.price),p.currency||"EUR"):"Price varies"}</span><b>{p.price!=null?`Earn ${money(earning,p.currency||"EUR")} / sale`:`${Math.round(rate*100)}% commission`}</b></div>{opp?<div className="creatorOpportunityInfo"><span>Ad signal {opp.creatorFit}</span><span>Catalogue fit {opp.catalogueFit}</span><small>{opp.reasons.slice(0,2).join(" · ")}</small></div>:null}{boost?<small className="creatorSourceEconomics">Boost unlocked · +{money(Number(boost.extraCreatorPayout||0),p.currency||"EUR")} per sale · verified alternate route</small>:check?<small className="creatorSourceEconomics">Standard payout · no verified extra route yet</small>:p.price!=null?<button className="creatorCheckEarning" disabled={sourceChecking===p.id} onClick={()=>void checkEarning(p)}>{sourceChecking===p.id?"Verifying alternatives…":"Check for extra earnings"}</button>:null}<button disabled={active||working===p.id} onClick={()=>void promote(p)}>{active?"Already promoting":working===p.id?"Adding…":"Promote this"} <ArrowRight/></button></div></article>})}</div>:<div className="creatorDiscoverEmpty"><TrendingUp/><h2>Search the YNOT catalogue</h2><p>Pick products you would genuinely make content about. Your link appears as soon as you add one.</p></div>}
    </>}


    {tab==="studio"&&<CreatorStudio products={data?.products||[]}/>} 

    {tab==="academy"&&<CreatorAcademy/>}
    {tab==="links"&&<section className="creatorPanel creatorLinksPanel"><div className="creatorPanelHead"><div><span>MY PRODUCTS</span><h2>{data?.products.length||0} active promotion links</h2></div></div>{data?.products.length?<div className="creatorLinkRows">{data.products.map(p=>{const url=share(p.product_id,code);return <article key={p.id}><div className="creatorLinkProduct">{p.image_url?<img src={p.image_url} alt=""/>:<span>Y</span>}<div><strong>{p.title}</strong><small>{p.brand||"YNOT"} · {p.price!=null?money(Number(p.price),p.currency):"Price varies"} · {p.commission_cents?moneyCents(p.commission_cents,p.currency):`${Math.round(p.commission_rate*100)}%`}</small></div></div><div className="creatorLinkBox"><code>{url.replace("https://","")}</code><button onClick={()=>copy(url)}><Copy/></button><a href={url} target="_blank"><ExternalLink/></a></div><button className="creatorRemove" disabled={working===p.product_id} onClick={()=>void removeProduct(p.product_id)}><X/> Remove</button></article>})}</div>:<div className="creatorEmpty"><Link2/><h3>Your links will appear here</h3><p>Choose a product first.</p><button onClick={()=>setTab("discover")}>Find products</button></div>}</section>}

    {tab==="earnings"&&<>
      <div className="creatorStats creatorStatsThree"><article><span>PENDING</span><strong>{moneyCents(data?.stats.pending_cents||0)}</strong><small>refund / fulfillment hold</small></article><article><span>AVAILABLE</span><strong>{moneyCents(data?.stats.available_cents||0)}</strong><small>eligible for payout request</small></article><article><span>PAID</span><strong>{moneyCents(data?.stats.paid_cents||0)}</strong><small>historical paid commission</small></article></div>
      <section className="creatorPanel payoutPanel"><div><span>PAYOUTS</span><h2>Request your cleared earnings</h2><p>Minimum payout request: €20. Requests are recorded here; automatic bank transfers will use the payout provider once connected.</p></div><button className="creatorAction" disabled={working==="payout"||(data?.stats.available_cents||0)<2000} onClick={requestPayout}><WalletCards/>{working==="payout"?"Requesting…":"Request payout"}</button></section>
      <section className="creatorPanel"><div className="creatorPanelHead"><div><span>COMMISSION HISTORY</span><h2>Attributed orders</h2></div></div>{data?.commissions.length?<div className="creatorCommissionRows">{data.commissions.map((x:any)=><article key={x.id}><div><strong>{moneyCents(Number(x.commission_cents||0),x.currency||"EUR")}</strong><small>{x.product_id||"YNOT order"} · {new Date(x.created_at).toLocaleDateString()}</small></div><span className={`commissionStatus ${x.status}`}>{x.status==="pending"&&x.hold_until&&new Date(x.hold_until).getTime()<=Date.now()?"available":String(x.status).replaceAll("_"," ")}</span></article>)}</div>:<div className="creatorEmpty compact"><WalletCards/><h3>No commission yet</h3><p>Your confirmed attributed sales will appear here.</p></div>}</section>
      {data?.payouts.length?<section className="creatorPanel"><div className="creatorPanelHead"><div><span>PAYOUT REQUESTS</span><h2>History</h2></div></div><div className="creatorCommissionRows">{data.payouts.map((x:any)=><article key={x.id}><div><strong>{moneyCents(Number(x.amount_cents||0),x.currency||"EUR")}</strong><small>{new Date(x.requested_at||x.created_at).toLocaleDateString()}</small></div><span className={`commissionStatus ${x.status}`}>{x.status}</span></article>)}</div></section>:null}
    </>}
   </section>
  </div>
 </main>;
}
