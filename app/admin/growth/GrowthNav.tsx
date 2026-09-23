import Link from "next/link";

type Tab="overview"|"content"|"ads"|"outreach"|"library";

const ITEMS:[Tab,string,string][]=[
 ["overview","Overview","/admin/growth"],
 ["content","Content","/admin/growth/content"],
 ["ads","Ads","/admin/growth/ads"],
 ["outreach","Outreach","/admin/growth/outreach"],
 ["library","Library","/admin/growth/library"],
];

export default function GrowthNav({active}:{active:Tab}){
 return <nav className="growthTabs growthOsTabs" aria-label="YNOT Growth OS">
  {ITEMS.map(([key,label,href])=><Link key={key} className={active===key?"active":""} href={href}>{label}</Link>)}
 </nav>;
}
