"use client";

import {useEffect,useState} from "react";
import {Check,Clock3,X} from "lucide-react";

type OrderStatus={status:"confirming"|"confirmed"|"released"|"processing";title:string;amount:number;currency:string;expiresAt:number;merchantOrderId?:string|null};
const money=(amount:number,currency:string)=>new Intl.NumberFormat("en",{style:"currency",currency}).format(amount);

export default function CheckoutStatus(){
 const [sessionId,setSessionId]=useState(""),[order,setOrder]=useState<OrderStatus|null>(null),[closed,setClosed]=useState(false);
 useEffect(()=>{const params=new URLSearchParams(window.location.search),id=params.get("session_id")||"";if(params.get("checkout")!=="pending"||!id)return;setSessionId(id);let active=true,timer:number|undefined;const load=async()=>{try{const response=await fetch(`/api/checkout/status?session_id=${encodeURIComponent(id)}`,{cache:"no-store"}),data=await response.json();if(active&&response.ok){setOrder(data);if(data.status==="confirming"||data.status==="processing")timer=window.setTimeout(load,4000)}}catch{if(active)timer=window.setTimeout(load,6000)}};void load();return()=>{active=false;if(timer)window.clearTimeout(timer)}},[]);
 if(!sessionId||closed)return null;const state=order?.status||"processing",minutes=Math.max(0,Math.ceil(((order?.expiresAt||Date.now()+600_000)-Date.now())/60_000));
 return <div className="ynot-order-status-backdrop"><section className="ynot-order-status" role="status" aria-live="polite"><button onClick={()=>setClosed(true)} aria-label="Close"><X/></button><div className={`ynot-order-status-icon ${state}`}>{state==="confirmed"?<Check/>:<Clock3/>}</div><small>YNOT ORDER</small><h2>{state==="confirmed"?"Your order is confirmed":state==="released"?"Your hold was released":"We’re confirming your order"}</h2><p>{state==="confirmed"?"The supplier order succeeded and your payment has now been taken.":state==="released"?"We couldn’t secure the product in time. The authorization was cancelled and no payment was captured.":`Your payment is only authorized—not captured. We’ll confirm the supplier order within ${minutes||10} minutes.`}</p>{order&&<div><span>{order.title}</span><b>{money(order.amount,order.currency)}</b></div>}<button className="ynot-order-status-done" onClick={()=>{const url=new URL(window.location.href);url.searchParams.delete("checkout");url.searchParams.delete("session_id");window.history.replaceState({},"",url);setClosed(true)}}>{state==="confirming"||state==="processing"?"Continue exploring":"Done"}</button></section></div>;
}
