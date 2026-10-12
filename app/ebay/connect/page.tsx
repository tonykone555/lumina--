"use client";
import {useSearchParams} from "next/navigation";
export default function EbayConnect(){
 const params=useSearchParams();
 const success=params.get("connected")==="1";
 return <main style={{maxWidth:560,margin:"10vh auto",padding:24,fontFamily:"system-ui",position:"relative",zIndex:1000}}>
  <p style={{opacity:.65}}>YNOT / eBay</p>
  <h1>{success?"eBay authorization saved":"Connect eBay"}</h1>
  <p>{success?"Your eBay authorization was securely saved outside Supabase. YNOT can refresh access automatically.":"For security, eBay account linking uses a private, single-use owner link. No PIN is required. Open the private connection link provided in your chat to authorize your existing seller account."}</p>
  {success?<a href="/admin/ebay">Return to eBay launch queue</a>:<p>Do not use a public authorization link: it cannot verify ownership of the YNOT seller account.</p>}
 </main>;
}
