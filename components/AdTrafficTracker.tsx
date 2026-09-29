"use client";
import {useEffect} from "react";

type Attribution={source?:string;medium?:string;campaign?:string;campaign_id?:string;adset_id?:string;ad_id?:string;ad_name?:string;fbclid?:string;ttclid?:string;gclid?:string;referrer?:string};
const KEY="ynot-ad-attribution-v1",VISITOR="ynot-visitor-v1",SESSION="ynot-ad-session-v1";
function id(){return crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`}
function get(k:string){let v=localStorage.getItem(k);if(!v){v=id();localStorage.setItem(k,v)}return v}
function attribution():Attribution|null{const p=new URLSearchParams(location.search),click=!!(p.get("fbclid")||p.get("ttclid")||p.get("gclid")),utm=!!p.get("utm_source");let saved:Attribution|null=null;try{saved=JSON.parse(localStorage.getItem(KEY)||"null")}catch{}if(click||utm){const a:Attribution={source:p.get("utm_source")|| (p.get("fbclid")?"meta":p.get("ttclid")?"tiktok":p.get("gclid")?"google":"paid"),medium:p.get("utm_medium")||"paid",campaign:p.get("utm_campaign")||undefined,campaign_id:p.get("campaign_id")||p.get("utm_id")||undefined,adset_id:p.get("adset_id")||undefined,ad_id:p.get("ad_id")||undefined,ad_name:p.get("ad_name")||p.get("utm_content")||undefined,fbclid:p.get("fbclid")||undefined,ttclid:p.get("ttclid")||undefined,gclid:p.get("gclid")||undefined,referrer:document.referrer||undefined};localStorage.setItem(KEY,JSON.stringify(a));return a}return saved}
export function trackAdEvent(event_type:string,metadata:Record<string,unknown>={}){try{const a=attribution();if(!a)return;const device=innerWidth<700?"mobile":innerWidth<1100?"tablet":"desktop";fetch("/api/analytics/ad-event",{method:"POST",headers:{"Content-Type":"application/json"},keepalive:true,body:JSON.stringify({...a,event_type,visitor_id:get(VISITOR),session_id:get(SESSION),path:location.pathname,device,metadata})}).catch(()=>{})}catch{}}
export default function AdTrafficTracker(){useEffect(()=>{const a=attribution();if(!a)return;const k=`ynot-landed:${get(SESSION)}`;if(!sessionStorage.getItem(k)){sessionStorage.setItem(k,"1");trackAdEvent("landing")}
 const room=()=>{if(location.pathname==="/room")trackAdEvent("room_open")};room();
 const on=(e:Event)=>{const name=(e as CustomEvent)?.detail?.event||e.type.replace("ynot:analytics:","");trackAdEvent(name,(e as CustomEvent)?.detail?.metadata||{})};
 const names=["room_open","camera_started","upload_started","photo_captured","scan_started","scan_completed","results_shown","product_opened","add_to_bag","checkout_started","purchase"];
 names.forEach(n=>window.addEventListener(`ynot:analytics:${n}`,on));return()=>names.forEach(n=>window.removeEventListener(`ynot:analytics:${n}`,on))},[]);return null}
