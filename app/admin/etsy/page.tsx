import Link from "next/link";
import EtsyIntegrationCard from "./EtsyIntegrationCard";
import EtsyListingBuilder from "./EtsyListingBuilder";
import "./etsy-admin.css";

export const dynamic="force-dynamic";

export default function EtsyAdminPage(){
 return <main className="etsyAdmin">
  <div className="etsyAmbient a"/><div className="etsyAmbient b"/>
  <header className="etsyPageHead"><div><div className="eyebrow">YNOT / ADMIN / INTEGRATIONS</div><h1>Etsy</h1><p>Etsy connection and publishing controls.</p></div><Link href="/admin/growth" className="etsyBack">Back to Growth OS</Link></header>
  <EtsyIntegrationCard/>
  <EtsyListingBuilder/>
 </main>;
}
