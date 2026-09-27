"use client";
import {useEffect,useState} from "react";

const DESCRIPTION=`Sell Through AI is a practical visual playbook for founders, ecommerce sellers, creators and service businesses that want to get their products or services discovered in AI-assisted buying journeys.

Inside the guide:
• AI shopping and ecommerce discovery
• How ChatGPT, Google AI and other assistants surface products and businesses
• Shopify and ecommerce setup paths
• When an MCP integration makes sense
• Product data, SEO and structured information fundamentals
• AI search and product discovery strategies
• Pinterest and other promotion/discovery channels
• Discovery paths for products and services
• Real interface examples and visual breakdowns
• Implementation checklist and 7-day action plan

Useful for ecommerce founders, Shopify sellers, small businesses, marketers, creators and anyone learning how to sell or promote through emerging AI channels.

This is a digital PDF download. No physical item will be shipped.

Need implementation help? Contact us through the platform where you purchased the playbook and we can help assess the best route for your store, product or service.`;

export default function EtsyListingBuilder(){
 const [setup,setSetup]=useState<any>(null),[busy,setBusy]=useState(false),[result,setResult]=useState<any>(null),[error,setError]=useState("");
 useEffect(()=>{fetch("/api/etsy/admin/listing",{cache:"no-store"}).then(r=>r.json()).then(setSetup).catch(()=>setSetup({ok:false}))},[]);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");setResult(null);try{const fd=new FormData(e.currentTarget);const r=await fetch("/api/etsy/admin/listing",{method:"POST",body:fd});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not create Etsy draft");setResult(j)}catch(e:any){setError(e?.message||"Could not create Etsy draft")}finally{setBusy(false)}}
 const tags=(setup?.recommendedTags||[]).join(", ");
 return <section className="etsyCard listingBuilder"><div className="etsyHead"><div><span>SELL THROUGH AI</span><h2>Create Etsy draft</h2></div><div className="etsyStatus connected"><i/>Review first</div></div>
 <p className="etsyCopy">Creates a draft only. Nothing is published until you review it in Etsy.</p>
 {!setup?<div className="etsyMuted">Loading connected shop…</div>:!setup.ok?<div className="etsyError">{setup.error||"Could not load Etsy shop."}</div>:<form onSubmit={submit}>
  <div className="etsyFacts"><div><small>Connected shop</small><strong>{setup.shop?.name}</strong></div><div><small>Suggested category</small><strong>{setup.taxonomy?.path||"Review category"}</strong></div><div><small>Format</small><strong>Digital PDF</strong></div></div>
  <label className="etsyField"><span>Title</span><input name="title" defaultValue="AI Shopping & Ecommerce Playbook for ChatGPT Business and Product Discovery" maxLength={140}/><small>Clear buyer-facing title; broader discovery terms are carried by tags and description.</small></label>
  <label className="etsyField"><span>Description</span><textarea name="description" defaultValue={DESCRIPTION} rows={16}/></label>
  <div className="etsyTwo"><label className="etsyField"><span>Price</span><input name="price" type="number" min="0.2" step="0.01" defaultValue="19.00"/></label><label className="etsyField"><span>Taxonomy ID</span><input name="taxonomyId" type="number" defaultValue={setup.taxonomy?.id||""}/></label></div>
  <label className="etsyField"><span>13 discovery tags</span><textarea name="tags" defaultValue={tags} rows={5}/><small>Uses all 13 Etsy slots with varied buyer-intent phrases. Includes AI shopping, ecommerce, business, Shopify, SEO/product discovery and Pinterest marketing.</small></label>
  <label className="etsyUpload"><span>Playbook PDF</span><input name="pdf" type="file" accept="application/pdf" required/></label>
  <label className="etsyUpload"><span>Listing images — cover first</span><input name="images" type="file" accept="image/png,image/jpeg,image/webp" multiple required/><small>Select the real-example cover/gallery images in the order you want them shown.</small></label>
  <button className="etsyPrimary createDraft" disabled={busy}>{busy?"Creating Etsy draft…":"Create draft for review"}</button>
  {error&&<div className="etsyError">{error}</div>}{result&&<div className="etsySuccess"><strong>Draft created ✓</strong><span>Listing #{result.listingId}</span><span>{result.tags?.join(" · ")}</span></div>}
 </form>}
 </section>
}
