import Link from "next/link";
import AdminSessionBridge from "@/components/admin/AdminSessionBridge";
import EbayLaunchQueue from "./EbayLaunchQueue";
import "./ebay-admin.css";

export const dynamic="force-dynamic";

export default function EbayAdminPage(){
 return <main className="ebayAdmin">
  <AdminSessionBridge/>
  <header className="ebayHead"><div><div className="eyebrow">YNOT / ADMIN / MARKETPLACES</div><h1>eBay Launch Queue</h1><p>Find delivery-safe YNOT products, verify marketplace readiness and publish controlled batches.</p></div><Link href="/" className="ebayBack">Back to YNOT</Link></header>
  <section style={{padding:"16px",margin:"12px 0 20px",border:"1px solid #7775",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><strong>eBay seller connection</strong><p style={{fontSize:13,margin:"5px 0 0"}}>Authorize your seller account to publish YNOT listings.</p></div><a href="/api/ebay/oauth/start?returnTo=%2Fadmin%2Febay" style={{display:"inline-block",padding:"12px 18px",background:"#fff",color:"#111",borderRadius:999,fontWeight:700,textDecoration:"none"}}>Connect / Reconnect eBay</a></section><EbayLaunchQueue/>
 </main>;
}
