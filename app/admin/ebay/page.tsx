import Link from "next/link";
import AdminSessionBridge from "@/components/admin/AdminSessionBridge";
import EbayLaunchQueue from "./EbayLaunchQueue";
import "./ebay-admin.css";

export const dynamic="force-dynamic";

export default function EbayAdminPage(){
 return <main className="ebayAdmin">
  <AdminSessionBridge/>
  <header className="ebayHead"><div><div className="eyebrow">YNOT / ADMIN / MARKETPLACES</div><h1>eBay Launch Queue</h1><p>Find delivery-safe YNOT products, verify marketplace readiness and publish controlled batches.</p></div><Link href="/" className="ebayBack">Back to YNOT</Link></header>
  <EbayLaunchQueue/>
 </main>;
}
