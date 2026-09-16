"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import {Player} from "@remotion/player";
import {ThingsIFoundAd} from "@/components/lumina/ad-factory/ThingsIFoundAd";
import {SingleProductPremiumAd,UgcDiscoveryAd,CollectionEditAd,DigitalAiCourseAd} from "@/components/lumina/ad-factory/AdTemplateSuite";
import {authedFetch,readSession} from "@/lib/ynot/supabase-browser";
import styles from "./ads.module.css";

type Product={id:string;title:string;brand?:string;price?:number|null;currency?:string;image?:string;images?:string[];url?:string;tags?:string[];source?:string};
type Overview={niches:{total:number;active:number;draft:number};creatives:{total:number;draft:number;approved:number;rendered:number};jobs:{total:number;queued:number;running:number;failed:number};campaigns:{total:number;draft:number;active:number};recentCreatives:any[];recentJobs:any[];recentCampaigns:any[]};

const TEMPLATES=["things-i-found","single-product-premium","ugc-discovery","collection-edit","digital-ai-course-demo"];
const FORMATS=["9:16","4:5","1:1"];
const PREVIEW_COMPONENTS:Record<string,any>={"things-i-found":ThingsIFoundAd,"single-product-premium":SingleProductPremiumAd,"ugc-discovery":UgcDiscoveryAd,"collection-edit":CollectionEditAd,"digital-ai-course-demo":DigitalAiCourseAd};
function dimensions(format:string){if(format==="1:1")return{width:1080,height:1080};if(format==="4:5")return{width:1080,height:1350};return{width:1080,height:1920}}

function productScore(p:Product){
 const images=[p.image,...(p.images||[])].filter(Boolean);let score=0;
 score+=Math.min(24,images.length*5);
 if((p.image||"").startsWith("https://"))score+=10;
 if((p.title||"").length>=12)score+=10;
 if((p.tags||[]).length>=3)score+=10;
 if(Number(p.price)>0)score+=10;
 if(p.url&&p.url!=="#")score+=10;
 if(p.brand)score+=8;
 score+=Math.min(18,Math.max(0,18-(p.title||"").length/12));
 return Math.max(0,Math.min(100,Math.round(score)));
}

export default function AdFactoryPage(){
 const[access,setAccess]=useState<"loading"|"ok"|"signin"|"forbidden"|"error">("loading");
 const[owner,setOwner]=useState("YNOT Owner");
 const[overview,setOverview]=useState<Overview|null>(null);
 const[query,setQuery]=useState("trending products");
 const[products,setProducts]=useState<Product[]>([]);
 const[selected,setSelected]=useState<Product[]>([]);
 const[searching,setSearching]=useState(false);
 const[templateKey,setTemplateKey]=useState(TEMPLATES[0]);
 const[format,setFormat]=useState(FORMATS[0]);
 const[hook,setHook]=useState("Things I found on YNOT that are actually worth seeing");
 const[headline,setHeadline]=useState("Discover the edit on YNOT");
 const[busy,setBusy]=useState(false);
 const[notice,setNotice]=useState("");
 const[requesting,setRequesting]=useState(false);
 const[accessNotice,setAccessNotice]=useState("");
 const previewSize=dimensions(format);const PreviewComponent=PREVIEW_COMPONENTS[templateKey]||ThingsIFoundAd;

 async function loadOverview(){
  if(!readSession()){setAccess("signin");return}
  const response=await authedFetch("/api/admin/ads");
  const data=await response.json().catch(()=>({}));
  if(response.status===401){setAccess("signin");return}
  if(response.status===403){setAccess("forbidden");return}
  if(!response.ok){setAccess("error");return}
  setOwner(data?.owner?.name||"YNOT Owner");setOverview(data.overview);setAccess("ok");
 }
 useEffect(()=>{void loadOverview()},[]);

 async function requestOwnerAccess(){setRequesting(true);setAccessNotice("");try{const response=await authedFetch("/api/admin/ads/request-access",{method:"POST"});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data?.error||"REQUEST_FAILED");setAccessNotice("Owner activation request recorded. Tell ChatGPT you clicked it so this exact signed-in account can be approved.")}catch(error){setAccessNotice(error instanceof Error?error.message:"Request failed")}finally{setRequesting(false)}}

 async function searchProducts(event?:FormEvent){event?.preventDefault();if(access!=="ok")return;setSearching(true);setNotice("");
  try{const params=new URLSearchParams({q:query.trim()||"trending products",source:"shopify",limit:"36"});const response=await fetch(`/api/catalog?${params}`);const data=await response.json().catch(()=>({}));const found=Array.isArray(data?.products)?data.products:[];setProducts(found.slice(0,36));if(!found.length)setNotice("No live products came back for that query. Try a broader niche.")}
  catch{setNotice("Catalogue search failed. Try again.")}finally{setSearching(false)}
 }

 function toggleProduct(product:Product){setSelected(current=>current.some(p=>p.id===product.id)?current.filter(p=>p.id!==product.id):[...current,product].slice(-8))}

 async function createDraft(queue=false){if(!selected.length)return;setBusy(true);setNotice("");
  try{
   const response=await authedFetch("/api/admin/ads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create_creative",productIds:selected.map(p=>p.id),products:selected,templateKey,aspectRatio:format,hook,headline,cta:"Shop on YNOT",primaryText:`${hook}. Explore this curated YNOT selection.`})});
   const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data?.error||"CREATE_FAILED");
   if(queue&&data?.creative?.id){const queued=await authedFetch("/api/admin/ads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"queue_render",creativeId:data.creative.id,aspectRatio:format})});if(!queued.ok)throw new Error("QUEUE_FAILED")}
   setNotice(queue?"Creative saved and added to the Remotion render queue.":"Creative draft saved to the Ad Factory.");await loadOverview();
  }catch(error){setNotice(error instanceof Error?error.message:"Unable to create creative")}finally{setBusy(false)}
 }

 const scored=useMemo(()=>products.map(product=>({product,score:productScore(product)})).sort((a,b)=>b.score-a.score),[products]);

 if(access!=="ok")return <main className={styles.shell}><div className={styles.locked}><div className={styles.brand}>YNOT / OWNER</div><h1>{access==="loading"?"Opening Ad Factory…":access==="signin"?"Sign in required":access==="forbidden"?"Owner access locked":"Ad Factory unavailable"}</h1><p>{access==="signin"?"Sign in to YNOT with your owner account, then return to this private dashboard.":access==="forbidden"?"The dashboard and all ad actions are server-protected. Your signed-in account has not yet been assigned the owner/admin role.":access==="error"?"The private admin API could not be loaded.":"Checking your private YNOT owner access."}</p>{access==="forbidden"&&<><div className={styles.code}>Security state: authenticated ✓ · owner role required</div><button className={styles.buttonGreen} style={{marginTop:14}} disabled={requesting} onClick={()=>void requestOwnerAccess()}>{requesting?"Requesting…":"Request owner activation"}</button>{accessNotice&&<div className={styles.notice}>{accessNotice}</div>}</>}<p><a href="/" style={{color:"#9be995"}}>Return to YNOT</a></p></div></main>;

 return <main className={styles.shell}><div className={styles.wrap}>
  <header className={styles.top}><div><div className={styles.brand}>YNOT / PRIVATE OWNER SYSTEM</div><h1 className={styles.title}>Ad Factory</h1><div className={styles.sub}>Turn the live catalogue into scored, niche-specific paid and organic creatives. Product accuracy stays locked to the source imagery while templates, hooks and formats scale around it.</div></div><div className={styles.badge}>{owner} · owner access</div></header>
  <section className={styles.grid4}><div className={styles.metric}><b>{overview?.niches.total||0}</b><span>Niches</span></div><div className={styles.metric}><b>{overview?.creatives.total||0}</b><span>Creatives</span></div><div className={styles.metric}><b>{overview?.jobs.queued||0}</b><span>Queued renders</span></div><div className={styles.metric}><b>{overview?.campaigns.active||0}</b><span>Live campaigns</span></div></section>
  <div className={styles.layout}>
   <section className={styles.panel}><h2>Catalogue intelligence</h2><div className={styles.muted}>Search Shopify inventory, rank products automatically, then choose up to eight items for one creative concept.</div>
    <form className={styles.searchRow} onSubmit={searchProducts}><input className={styles.input} value={query} onChange={e=>setQuery(e.target.value)} placeholder="e.g. Pilates women under €50"/><button className={styles.button} disabled={searching}>{searching?"Scanning…":"Find products"}</button></form>
    <div className={styles.products}>{scored.length?scored.map(({product,score})=>{const active=selected.some(p=>p.id===product.id);return <button type="button" key={`${product.source||"shopify"}-${product.id}`} className={`${styles.card} ${active?styles.cardSelected:""}`} onClick={()=>toggleProduct(product)}><div className={styles.image}>{product.image?<img src={product.image} alt=""/>:null}</div><div className={styles.cardBody}><div className={styles.cardTitle}>{product.title}</div><div className={styles.price}>{product.currency||"EUR"} {Number(product.price||0).toFixed(2)}</div><div className={styles.score}><i style={{width:`${score}%`}}/></div><div className={styles.tiny}>Advertability {score}/100</div></div></button>}):<div className={styles.empty}>Search a niche to load products.</div>}</div>
    <div className={styles.selectedBar}><div><b>{selected.length}</b> products selected <span className={styles.muted}>· strongest imagery first</span></div>{selected.length>0&&<button className={styles.buttonGhost} onClick={()=>setSelected([])}>Clear</button>}</div>
   </section>
   <aside className={styles.panel}><h2>Creative brief</h2><div className={styles.muted}>This is the first controlled-generation layer. Each draft keeps the exact product IDs and creative lineage.</div>{notice&&<div className={styles.notice}>{notice}</div>}
    <div className={styles.formGrid}><label className={styles.label}>Template</label><select className={styles.select} value={templateKey} onChange={e=>setTemplateKey(e.target.value)}>{TEMPLATES.map(x=><option key={x}>{x}</option>)}</select>
     <div className={styles.row2}><div><div className={styles.label}>Format</div><select className={styles.select} value={format} onChange={e=>setFormat(e.target.value)}>{FORMATS.map(x=><option key={x}>{x}</option>)}</select></div><div><div className={styles.label}>Products</div><div style={{paddingTop:12,fontWeight:800}}>{selected.length}/8</div></div></div>
     <label className={styles.label}>Hook</label><textarea className={styles.textarea} value={hook} onChange={e=>setHook(e.target.value)}/><label className={styles.label}>Headline</label><input className={styles.input} value={headline} onChange={e=>setHeadline(e.target.value)}/>
     {selected.length>0&&<div className={styles.preview}><div className={styles.previewLabel}>Live Remotion preview · {templateKey} · 12s</div><Player component={PreviewComponent} durationInFrames={360} fps={30} compositionWidth={previewSize.width} compositionHeight={previewSize.height} inputProps={{products:selected,hook,headline,cta:"Shop the edit on YNOT"}} controls loop style={{width:"100%",aspectRatio:`${previewSize.width}/${previewSize.height}`,borderRadius:14,overflow:"hidden"}}/></div>}
     <button className={styles.button} disabled={busy||!selected.length} onClick={()=>void createDraft(false)}>{busy?"Saving…":"Save creative draft"}</button><button className={styles.buttonGreen} disabled={busy||!selected.length} onClick={()=>void createDraft(true)}>Save + queue Remotion render</button>
    </div>
    <div className={styles.queue}><h2>Render queue</h2>{overview?.recentJobs?.length?overview.recentJobs.slice(0,7).map(job=><div className={styles.queueItem} key={job.id}><span>{job.job_type}</span><span className={styles.status}>{job.status}</span></div>):<div className={styles.muted}>No jobs queued yet.</div>}</div>
   </aside>
  </div>
 </div></main>
}
