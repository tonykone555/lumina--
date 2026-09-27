import Link from "next/link";
import EtsyIntegrationCard from "./EtsyIntegrationCard";
import "./etsy-admin.css";

export const dynamic="force-dynamic";

export default function EtsyAdminPage(){
 return <main className="etsyAdmin">
  <div className="etsyAmbient a"/><div className="etsyAmbient b"/>
  <header className="etsyPageHead"><div><div className="eyebrow">YNOT / ADMIN / INTEGRATIONS</div><h1>Etsy</h1><p>Private connection and publishing controls for the YNOT Etsy shop.</p></div><Link href="/admin/growth" className="etsyBack">Back to Growth OS</Link></header>
  <EtsyIntegrationCard/>
  <section className="etsyCard mutedCard"><div className="etsyHead"><div><span>NEXT</span><h2>Publishing workflow</h2></div></div><p className="etsyCopy">Once Etsy is reauthorized with listing write access, this admin area can host the Sell Through AI publishing flow: create draft, upload gallery images, attach the digital PDF, review, then publish.</p></section>
 </main>;
}
