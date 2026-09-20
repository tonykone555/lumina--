"use client";

import {useMemo,useState} from "react";

type Opportunity={
  id:string; external_key:string; kind:string; platform:string; handle?:string|null; display_name?:string|null;
  profile_url?:string|null; source_post_url?:string|null; niche?:string|null; country?:string|null;
  followers?:number|null; engagement?:number|null; intent_strength?:number|null; creator_fit?:number|null;
  summary?:string|null; reason?:string|null; matched_product_ids?:string[]; matched_products?:any[];
  draft_message?:string|null; channel?:string|null; status:string; owner:string; outreach_approved?:boolean;
  contacted_at?:string|null; next_action?:string|null; updated_at?:string|null;
};
type Activity={id:number;opportunity_id:string;event_type:string;actor:string;detail:any;created_at:string};

const filters=["all","ready","approved","contacted","replied","won"] as const;

export default function GrowthInbox({initialOpportunities,initialActivities}:{initialOpportunities:Opportunity[];initialActivities:Activity[]}) {
  const [items,setItems]=useState(initialOpportunities);
  const [activities,setActivities]=useState(initialActivities);
  const [selectedId,setSelectedId]=useState(initialOpportunities[0]?.id||"");
  const [filter,setFilter]=useState<(typeof filters)[number]>("all");
  const [busy,setBusy]=useState(false);
  const [copied,setCopied]=useState(false);

  const visible=useMemo(()=>items.filter(x=>{
    if(filter==="all") return true;
    if(filter==="approved") return x.outreach_approved===true && x.status==="ready";
    return x.status===filter;
  }),[items,filter]);

  const selected=items.find(x=>x.id===selectedId)||visible[0]||items[0];
  const history=activities.filter(a=>a.opportunity_id===selected?.id).sort((a,b)=>+new Date(b.created_at)-+new Date(a.created_at));

  async function action(action:string){
    if(!selected) return;
    setBusy(true);
    try{
      const res=await fetch("/api/admin/growth/opportunity",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:selected.id,action})
      });
      const data=await res.json();
      if(!res.ok) throw new Error(data?.error||"UPDATE_FAILED");
      if(data.opportunity) setItems(prev=>prev.map(x=>x.id===selected.id?{...x,...data.opportunity}:x));
      if(data.activity) setActivities(prev=>[data.activity,...prev]);
    } finally {setBusy(false);}
  }

  async function copyDraft(){
    if(!selected?.draft_message) return;
    await navigator.clipboard.writeText(selected.draft_message);
    setCopied(true); setTimeout(()=>setCopied(false),1200);
  }

  return <section className="growthInbox">
    <div className="inboxTop">
      <div><span>DISCOVERX CRM</span><h2>Outreach Inbox</h2><p>Review every lead, approve drafts, open source links and keep a permanent send history.</p></div>
      <div className="inboxCounts"><b>{items.filter(x=>x.status==="ready").length} ready</b><b>{items.filter(x=>x.outreach_approved&&x.status==="ready").length} approved</b><b>{items.filter(x=>x.status==="contacted").length} sent</b></div>
    </div>

    <div className="inboxFilters">
      {filters.map(f=><button key={f} className={filter===f?"active":""} onClick={()=>setFilter(f)}>{f}</button>)}
    </div>

    <div className="inboxLayout">
      <aside className="inboxList">
        {visible.length?visible.map(x=><button key={x.id} className={"leadRow "+(selected?.id===x.id?"selected":"")} onClick={()=>setSelectedId(x.id)}>
          <div className="leadAvatar">{(x.display_name||x.handle||x.platform||"?").slice(0,1).toUpperCase()}</div>
          <div className="leadMain">
            <div className="leadLine"><strong>{x.display_name||x.handle||"Unnamed lead"}</strong><time>{x.updated_at?new Date(x.updated_at).toLocaleDateString(undefined,{month:"short",day:"numeric"}):""}</time></div>
            <small>{x.platform}{x.handle?" · @"+String(x.handle).replace(/^@/,""):""} · {x.kind}</small>
            <p>{x.draft_message||x.summary||x.reason||"No draft yet."}</p>
            <div className="leadMeta"><span>{x.owner}</span><span className={"pipeline "+x.status}>{x.status}</span>{x.outreach_approved&&<span className="approvedDot">approved</span>}</div>
          </div>
        </button>):<div className="empty">No leads in this view.</div>}
      </aside>

      <section className="inboxDetail">
        {selected?<>
          <div className="detailHero">
            <div className="detailAvatar">{(selected.display_name||selected.handle||selected.platform||"?").slice(0,1).toUpperCase()}</div>
            <div className="detailIdentity">
              <span>{selected.kind.toUpperCase()} · {selected.platform}</span>
              <h3>{selected.display_name||selected.handle||"Unnamed lead"}</h3>
              <p>{selected.handle?"@"+String(selected.handle).replace(/^@/,""):""}{selected.country?" · "+selected.country:""}{selected.niche?" · "+selected.niche:""}</p>
            </div>
            <div className="detailScore">{selected.intent_strength!=null?<><b>{selected.intent_strength}</b><small>intent</small></>:selected.creator_fit!=null?<><b>{selected.creator_fit}</b><small>fit</small></>:<><b>—</b><small>score</small></>}</div>
          </div>

          <div className="detailLinks">
            {selected.profile_url&&<a href={selected.profile_url} target="_blank" rel="noreferrer">Open profile ↗</a>}
            {selected.source_post_url&&<a href={selected.source_post_url} target="_blank" rel="noreferrer">Open source post ↗</a>}
          </div>

          <div className="detailGrid">
            <article className="detailCard"><span>WHY GROK PICKED THIS</span><p>{selected.reason||selected.summary||"No qualification note saved."}</p></article>
            <article className="detailCard"><span>NEXT ACTION</span><p>{selected.next_action||"Review the draft and approve when ready."}</p></article>
          </div>

          <article className="draftCard">
            <div className="draftHead"><div><span>DRAFT RESPONSE</span><h4>{selected.channel||"Recommended channel not set"}</h4></div><button onClick={copyDraft} disabled={!selected.draft_message}>{copied?"Copied":"Copy"}</button></div>
            <div className="draftBody">{selected.draft_message||"Grok has not saved a draft response for this lead yet."}</div>
            <div className="approvalBar">
              <div>{selected.outreach_approved?<><i className="ok"/>Approved to send</>:<><i/>Waiting for your approval</>}</div>
              <div className="approvalActions">
                {!selected.outreach_approved&&<button className="approveBtn" disabled={busy||!selected.draft_message} onClick={()=>action("approve")}>Approve send</button>}
                {selected.outreach_approved&&selected.status==="ready"&&<button className="revokeBtn" disabled={busy} onClick={()=>action("revoke")}>Revoke</button>}
                {selected.outreach_approved&&selected.status==="ready"&&<button className="sentBtn" disabled={busy} onClick={()=>action("mark_sent")}>Mark as sent</button>}
              </div>
            </div>
          </article>

          <article className="productsCard">
            <div className="sectionTitle"><span>MATCHED PRODUCTS</span><b>{selected.matched_product_ids?.length||0}</b></div>
            <div className="matchedProducts">{Array.isArray(selected.matched_products)&&selected.matched_products.length?selected.matched_products.map((p:any,i:number)=>{
              const id=String(p.id||p.ynot_id||p.ynotId||selected.matched_product_ids?.[i]||"");
              const country=String(p.country||selected.country||"FR").toUpperCase();
              const category=String(p.category||selected.niche||"other");
              const fallbackYnot=id&&/^ynot-/i.test(id)?`/p/${encodeURIComponent(id)}?country=${encodeURIComponent(country)}&category=${encodeURIComponent(category)}&src=growth`:null;
              const ynotUrl=typeof p.ynot_url==="string"&&p.ynot_url?p.ynot_url:typeof p.url==="string"&&/ynotworld\.app\/p\//i.test(p.url)?p.url:fallbackYnot;
              const merchantUrl=typeof p.merchant_url==="string"&&p.merchant_url?p.merchant_url:typeof p.source_url==="string"&&p.source_url?p.source_url:null;
              return <div className="matchedProduct" key={id||i}>
                {p.image&&<img src={p.image} alt=""/>}
                <div className="matchedProductInfo">
                  <strong>{p.title||p.name||id||"YNOT product"}</strong>
                  <small>{p.brand||p.category||id||""}</small>
                  <div className="productLinkStatus">
                    {ynotUrl?<><span className="ynotLinkBadge">YNOT POPUP LINK</span><a href={ynotUrl} target="_blank" rel="noreferrer">Open card ↗</a></>:<span className="merchantOnlyBadge">NO YNOT LINK</span>}
                    {merchantUrl&&<a className="merchantRef" href={merchantUrl} target="_blank" rel="noreferrer">Merchant ref ↗</a>}
                  </div>
                </div>
              </div>
            }):selected.matched_product_ids?.length?selected.matched_product_ids.map(id=>{
              const href=/^ynot-/i.test(id)?`/p/${encodeURIComponent(id)}?country=${encodeURIComponent(String(selected.country||"FR").toUpperCase())}&category=${encodeURIComponent(selected.niche||"other")}&src=growth`:null;
              return <div className="matchedProduct" key={id}><div className="matchedProductInfo"><strong>{id}</strong><small>YNOT product ID</small><div className="productLinkStatus">{href?<><span className="ynotLinkBadge">YNOT POPUP LINK</span><a href={href} target="_blank" rel="noreferrer">Open card ↗</a></>:<span className="merchantOnlyBadge">NO YNOT LINK</span>}</div></div></div>
            }):<div className="empty compact">No product matches saved.</div>}</div>
          </article>

          <article className="historyCard">
            <div className="sectionTitle"><span>ACTIVITY / SEND HISTORY</span><b>{history.length}</b></div>
            <div className="historyList">{history.length?history.map(h=><div className="historyRow" key={h.id}><i/><div><strong>{h.event_type.replace(/_/g," ")}</strong><small>{h.actor} · {new Date(h.created_at).toLocaleString()}</small>{h.detail?.channel&&<p>{h.detail.channel}{h.detail?.message?" · "+h.detail.message:""}</p>}</div></div>):<div className="empty compact">No history yet.</div>}</div>
          </article>
        </>:<div className="empty">Select a lead.</div>}
      </section>
    </div>
  </section>;
}
