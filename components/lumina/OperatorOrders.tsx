"use client";

import {FormEvent,useCallback,useEffect,useState} from "react";
import {ExternalLink,KeyRound,RefreshCw,ShieldCheck,XCircle} from "lucide-react";

type Address={line1?:string|null;line2?:string|null;city?:string|null;postal_code?:string|null;state?:string|null;country?:string|null};
type Order={id:string;created:number;status:string;orderStatus:string;amount:number;currency:string;product:{title?:string;variantId?:string|null;quantity:number;url?:string;expectedSupplierPrice:number;ynotPrice:number};customer:{name?:string|null;email?:string|null;phone?:string|null;address?:Address|null};merchantOrderId?:string|null;actualSupplierTotal?:number|null};
const money=(amount:number,currency:string)=>new Intl.NumberFormat("en",{style:"currency",currency}).format(amount||0);

export default function OperatorOrders(){
 const [secret,setSecret]=useState(""),[authorized,setAuthorized]=useState(false),[orders,setOrders]=useState<Order[]>([]),[busy,setBusy]=useState(""),[error,setError]=useState(""),[drafts,setDrafts]=useState<Record<string,{orderId:string;total:string}>>({});
 const load=useCallback(async(key=secret)=>{if(!key)return;setBusy("load");setError("");try{const response=await fetch("/api/checkout/orders",{headers:{Authorization:`Bearer ${key}`},cache:"no-store"}),data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to open owner orders");setOrders(data.orders||[]);setAuthorized(true);sessionStorage.setItem("ynot-operator-secret",key)}catch(e){setAuthorized(false);setError(e instanceof Error?e.message.replaceAll("_"," "):"Owner access failed")}finally{setBusy("")}},[secret]);
 useEffect(()=>{const saved=sessionStorage.getItem("ynot-operator-secret")||"";if(saved){setSecret(saved);void load(saved)}},[]);
 useEffect(()=>{if(!authorized)return;const timer=window.setInterval(()=>void load(),15000);return()=>window.clearInterval(timer)},[authorized,load]);
 async function action(order:Order,next:"capture"|"cancel"){const draft=drafts[order.id]||{orderId:"",total:""};if(next==="cancel"&&!window.confirm("Release this customer’s payment authorization? No money will be captured."))return;setBusy(order.id);setError("");try{const response=await fetch("/api/checkout/orders",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${secret}`},body:JSON.stringify({sessionId:order.id,action:next,merchantOrderId:draft.orderId,actualSupplierTotal:draft.total})}),data=await response.json();if(!response.ok)throw new Error(data.error||"Order update failed");await load()}catch(e){setError(e instanceof Error?e.message.replaceAll("_"," "):"Order update failed")}finally{setBusy("")}}
 function signIn(event:FormEvent){event.preventDefault();void load(secret)}
 const awaiting=orders.filter(order=>order.status==="requires_capture"),history=orders.filter(order=>order.status!=="requires_capture");
 if(!authorized)return <section className="operator-login"><KeyRound/><div><small>PRIVATE OWNER ACCESS</small><h2>Open payment approvals</h2><p>This key is separate from your four-digit profile code.</p></div><form onSubmit={signIn}><input type="password" value={secret} onChange={e=>setSecret(e.target.value)} placeholder="Owner approval key" autoComplete="current-password"/><button disabled={busy==="load"}>{busy==="load"?"Checking…":"Unlock"}</button></form>{error&&<p className="operator-error">{error}</p>}</section>;
 return <section className="operator-orders">
  <header><div><small>LIVE PROCUREMENT QUEUE</small><h2>{awaiting.length} order{awaiting.length===1?"":"s"} awaiting you</h2><p>Open the supplier checkout, place the order, then enter its confirmation before capturing the customer hold.</p></div><button onClick={()=>void load()} disabled={busy==="load"}><RefreshCw/> Refresh</button></header>
  {error&&<p className="operator-error">{error}</p>}
  <div className="operator-order-grid">{awaiting.length?awaiting.map(order=>{const draft=drafts[order.id]||{orderId:"",total:""},address=order.customer.address;return <article key={order.id}>
   <div className="operator-order-top"><span>AUTHORIZED · {new Date(order.created).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span><strong>{money(order.amount,order.currency)}</strong></div>
   <h3>{order.product.quantity>1?`${order.product.quantity} × `:""}{order.product.title}</h3><p>{order.customer.name} · {order.customer.email}</p>
   {address&&<address>{[address.line1,address.line2,address.postal_code,address.city,address.state,address.country].filter(Boolean).join(", ")}</address>}
   <div className="operator-economics"><span>Expected supplier cost <b>{money(order.product.expectedSupplierPrice*order.product.quantity,order.currency)}</b></span><span>Customer authorization <b>{money(order.amount,order.currency)}</b></span></div>
   <a href={order.product.url} target="_blank" rel="noreferrer">Open exact supplier product <ExternalLink/></a>
   <label>Merchant order number<input value={draft.orderId} onChange={e=>setDrafts(previous=>({...previous,[order.id]:{...draft,orderId:e.target.value}}))} placeholder="e.g. #10428"/></label>
   <label>Actual supplier total<input inputMode="decimal" value={draft.total} onChange={e=>setDrafts(previous=>({...previous,[order.id]:{...draft,total:e.target.value}}))} placeholder="Product + delivery"/></label>
   <div className="operator-actions"><button className="capture" onClick={()=>void action(order,"capture")} disabled={busy===order.id||!draft.orderId||!draft.total}><ShieldCheck/> Supplier ordered — capture</button><button className="release" onClick={()=>void action(order,"cancel")} disabled={busy===order.id}><XCircle/> Release hold</button></div>
  </article>}):<div className="operator-empty"><ShieldCheck/><b>No held orders need approval.</b><span>New authorized checkouts will appear here automatically.</span></div>}</div>
  {history.length>0&&<details><summary>Recent resolved orders ({history.length})</summary><div className="operator-history">{history.slice(0,15).map(order=><span key={order.id}><b>{order.product.title}</b><em>{order.status==="succeeded"?"Captured":"Released"}</em><strong>{money(order.amount,order.currency)}</strong></span>)}</div></details>}
 </section>;
}
