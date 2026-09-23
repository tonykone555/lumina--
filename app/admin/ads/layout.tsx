import type {Metadata} from "next";
import AdminSessionBridge from "@/components/admin/AdminSessionBridge";
import "./admin-scroll.css";
import "./ynot-glass-theme.css";

export const metadata:Metadata={title:"YNOT Ad Factory",robots:{index:false,follow:false,noarchive:true,nocache:true}};

export default function AdFactoryLayout({children}:{children:React.ReactNode}){
 return <div className="ynot-admin-scroll-root">
  <AdminSessionBridge/>
  <nav className="ynot-admin-nav" aria-label="YNOT owner advertising tools">
   <a className="ynot-admin-orb" href="/admin/ads" aria-label="YNOT Ad Factory">YNOT</a>
   <a className="ynot-admin-link" href="/admin/ads">Ad Factory</a>
   <a className="ynot-admin-link ynot-admin-link-ai" href="/admin/ads/intelligence">Deep Intelligence</a>
   <a className="ynot-admin-link ynot-admin-link-ai" href="/admin/ads/brain">Intelligence Brain</a>
   <a className="ynot-admin-link ynot-admin-link-ai" href="/admin/ads/automation">Automations</a>
   <a className="ynot-admin-link ynot-admin-link-deals" href="/?deals=1">YNOT Deals</a>
   <span className="ynot-admin-owner">OWNER CONTROL ROOM</span>
  </nav>
  {children}
 </div>
}
