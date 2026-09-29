import Link from "next/link";
import "../growth.css";
import "../growth-light.css";
import AdTrafficDashboard from "../AdTrafficDashboard";
import GrowthThemeToggle from "../GrowthThemeToggle";
export const dynamic="force-dynamic";
export default function TrafficPage(){return <main className="growth"><div className="ambient a"/><div className="ambient b"/><header><div><div className="eyebrow">YNOT / GROWTH OS / PAID TRAFFIC</div><h1>Ad Visitor Intelligence</h1><p>See who landed from paid ads, when they arrived, where they came from, and whether they actually used the YNOT Room scanner.</p></div><div className="growthHeaderActions"><GrowthThemeToggle/><Link className="live" href="/admin/growth">← Growth</Link></div></header><AdTrafficDashboard/></main>}
