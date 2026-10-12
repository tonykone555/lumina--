"use client";
export default function EbayConnect(){
 const url="/api/ebay/oauth/start";
 return <main style={{maxWidth:560,margin:"10vh auto",padding:24,fontFamily:"system-ui",position:"relative",zIndex:1000}}>
  <p style={{opacity:.65}}>YNOT / eBay</p>
  <h1>Connect eBay</h1>
  <p>Open eBay's official authorization screen. No separate YNOT PIN is needed to start.</p>
  <form method="GET" action={url}>
   <button type="submit" onClick={(e)=>{e.preventDefault();window.location.assign(url);}} style={{display:"inline-block",cursor:"pointer",padding:"14px 22px",borderRadius:10,border:0,background:"#111",color:"#fff",fontSize:16,fontWeight:600,touchAction:"manipulation"}}>Open eBay authorization</button>
  </form>
  <p style={{marginTop:20}}><a href={url} target="_self" style={{textDecoration:"underline"}}>If the button does not respond, open eBay authorization directly</a></p>
  <p style={{opacity:.7,marginTop:24}}>eBay authorization is not yet fully connected to independent token storage. Grokbot publishing remains paused until the seller connection is securely saved and verified.</p>
 </main>;
}
