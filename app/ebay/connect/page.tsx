"use client";
export default function EbayConnect(){
 return <main style={{maxWidth:560,margin:"10vh auto",padding:24,fontFamily:"system-ui"}}>
  <p style={{opacity:.65}}>YNOT / eBay</p>
  <h1>Connect eBay</h1>
  <p>Open eBay's official authorization screen without entering a separate YNOT PIN.</p>
  <a href="/api/ebay/oauth/start" style={{display:"inline-block",padding:"13px 20px",borderRadius:10,background:"#111",color:"#fff",textDecoration:"none"}}>Open eBay authorization</a>
  <p style={{opacity:.7,marginTop:24}}>Authorizing an eBay account does not activate Grokbot publishing until YNOT securely verifies and saves the seller connection.</p>
 </main>;
}
