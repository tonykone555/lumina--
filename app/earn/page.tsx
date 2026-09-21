import Link from "next/link";
import {ArrowRight,BarChart3,Link2,Sparkles,WalletCards,Zap} from "lucide-react";

export const metadata={title:"Earn with YNOT",description:"Choose products from YNOT, promote them with your personal link, and earn commission from confirmed sales."};

const examples=[
 {title:"Choose what fits you",text:"Search YNOT across fashion, home, beauty, fitness, tech and more. You decide what you actually want to promote.",icon:Sparkles},
 {title:"Get your personal link",text:"Every product you add gets a YNOT tracking link tied to your creator profile.",icon:Link2},
 {title:"Post anywhere",text:"Use TikTok, Reels, Shorts, Threads, X, Pinterest or your own audience. Content tools can help with hooks and scripts.",icon:Zap},
 {title:"Earn from confirmed sales",text:"Your dashboard tracks clicks, pending commission, cleared earnings and payout requests.",icon:WalletCards},
];
export default function EarnPage(){
 return <main className="earnSite">
  <nav className="earnNav"><Link href="/" className="earnBrand">YNOT</Link><div><Link href="/earn/dashboard">Creator dashboard</Link><Link href="/earn/dashboard" className="earnNavCta">Start earning <ArrowRight/></Link></div></nav>
  <section className="earnHero"><div className="earnGlow a"/><div className="earnGlow b"/><div className="earnHeroCopy"><span className="earnPill">YNOT CREATORS · NO INVENTORY REQUIRED</span><h1>Choose products you like.<br/><em>Promote them. Earn.</em></h1><p>Turn the YNOT catalogue into your creator storefront. Pick products, get a personal tracking link, create content around them, and earn commission when attributed orders are confirmed.</p><div className="earnHeroActions"><Link href="/earn/dashboard" className="earnPrimary">Join YNOT Creators <ArrowRight/></Link><a href="#how" className="earnSecondary">See how it works</a></div><div className="earnTrust"><span>No stock to buy</span><i/> <span>No customer support to run</span><i/> <span>Choose your own products</span></div></div>
   <div className="earnHeroCard"><div className="earnMockTop"><span>CREATOR OPPORTUNITY</span><b>LIVE</b></div><div className="earnMockProduct"><div className="earnMockImage"><span>Y</span></div><div><small>Example product</small><strong>€79 product</strong><p>5% creator commission</p></div></div><div className="earnMockMoney"><div><small>You earn</small><b>€3.95</b><span>per confirmed €79 sale</span></div><div><small>10 sales</small><b>€39.50</b><span>example commission</span></div></div><div className="earnMockFlow"><span>Choose</span><i>→</i><span>Share</span><i>→</i><span>Sale</span><i>→</i><span>Earn</span></div></div>
  </section>
  <section id="how" className="earnHow"><div className="earnSectionHead"><span>HOW IT WORKS</span><h2>YNOT gives you the products.<br/>You bring the attention.</h2></div><div className="earnSteps">{examples.map(({title,text,icon:Icon},i)=><article key={title}><div className="earnStepNo">0{i+1}</div><Icon/><h3>{title}</h3><p>{text}</p></article>)}</div></section>
  <section className="earnWhy"><div><span>BUILT FOR CREATORS</span><h2>Your dashboard shows what matters.</h2><p>See which products you are promoting, how many people clicked, what commission is still in the hold period, what has cleared, and what has been paid.</p><Link href="/earn/dashboard" className="earnPrimary">Open creator dashboard <ArrowRight/></Link></div><div className="earnStatsPreview"><div><BarChart3/><small>CLICKS</small><strong>1,284</strong></div><div><WalletCards/><small>AVAILABLE</small><strong>€186.40</strong></div><div><Zap/><small>ACTIVE PRODUCTS</small><strong>14</strong></div></div></section>
  <section className="earnFinal"><span>YOUR AUDIENCE. YOUR PICKS. YOUR LINK.</span><h2>Start with one product.</h2><p>You do not need to build a store or hold inventory. Choose something you would genuinely post about and start from there.</p><Link href="/earn/dashboard" className="earnPrimary">Become a YNOT creator <ArrowRight/></Link></section>
  <footer className="earnFooter"><Link href="/">YNOT World</Link><span>Creator commissions are earned on eligible attributed orders and can be reversed for refunds or cancellations.</span></footer>
 </main>;
}
