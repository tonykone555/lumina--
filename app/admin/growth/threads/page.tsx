import Link from "next/link";
import "../growth.css";
import "./threads.css";
import ThreadsGrowthClient from "./ThreadsGrowthClient";

export const dynamic = "force-dynamic";

export default function ThreadsGrowthPage(){
  return <main className="growth">
    <div className="ambient a"/><div className="ambient b"/>
    <header><div><div className="eyebrow">YNOT / PRIVATE CONTROL ROOM</div><h1>Threads Growth</h1><p>Discovery, conversations, catalogue-assisted replies and publishing.</p></div><div className="live"><i/> Threads connected</div></header>
    <nav className="growthTabs"><Link href="/admin/growth">Overview</Link><Link className="active" href="/admin/growth/threads">Threads</Link></nav>
    <ThreadsGrowthClient/>
    <footer><span>YNOT Growth OS</span><span>Public actions use bounded limits and catalogue truth.</span><Link href="/">Back to YNOT</Link></footer>
  </main>
}
