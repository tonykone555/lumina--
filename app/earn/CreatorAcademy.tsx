"use client";
import Link from "next/link";
import {ArrowRight,BookOpen,Check,Clapperboard,Link2,LineChart,Play,Share2,ShoppingBag,Video,WalletCards} from "lucide-react";

const lessons=[
 ["01","Pick a niche","Choose a category you can post about repeatedly instead of chasing random products.",ShoppingBag],
 ["02","Choose products","Use YNOT to build a small promotion catalogue with clear commission economics.",Link2],
 ["03","Record the performance","Shoot a simple source video with the motion, pacing and delivery you want.",Video],
 ["04","Transform with Studio","Keep yourself, replace yourself with another avatar, or create a product-only version.",Clapperboard],
 ["05","Post with a purpose","Use the supplied hook, caption, CTA and personal YNOT link.",Share2],
 ["06","Read the numbers","Track clicks, attributed orders, commission and which creative formats work.",LineChart],
 ["07","Scale what works","Repeat winning products and formats rather than making every post from scratch.",WalletCards],
];

export default function CreatorAcademy(){
 return <section className="academyShell">
  <div className="academyHero"><div><span>YNOT CREATOR ACADEMY</span><h2>Learn the workflow. Use the studio. Promote real products.</h2><p>The Academy is the guided layer around Earn with YNOT: product selection, video-to-video creation, avatar replacement, posting strategy and commission tracking in one system.</p></div><div className="academyBadge"><BookOpen/><b>7-part creator system</b><span>Built around the tools inside your dashboard</span></div></div>
  <div className="academyLessons">{lessons.map(([n,title,desc,Icon]:any)=><article key={n}><div><span>{n}</span><Icon/></div><h3>{title}</h3><p>{desc}</p><button><Play/> Lesson outline</button></article>)}</div>
  <section className="academyOffer"><div><span>PAID CREATOR LAYER</span><h3>Creator Studio Pro</h3><p>Free creators can promote products and earn commission. Pro unlocks the AI production workflow, generation credits, creator identities/avatars, advanced recommendations and the Academy.</p></div><div className="academyCompare"><div><small>FREE CREATOR</small><strong>€0</strong><span><Check/> Product marketplace</span><span><Check/> Tracking links</span><span><Check/> Standard commission</span><span><Check/> Basic analytics</span></div><div className="featured"><small>CREATOR STUDIO PRO</small><strong>Subscription</strong><span><Check/> Video-to-video Studio</span><span><Check/> Replace yourself with an avatar</span><span><Check/> Product/object/outfit workflows</span><span><Check/> Scripts, hooks & captions</span><span><Check/> Generation credits</span><span><Check/> Academy access</span></div></div></section>
  <section className="academyCourse"><div><span>OPTIONAL HIGHER-TICKET OFFER</span><h3>YNOT Creator Bootcamp</h3><p>A one-time structured onboarding program can sit above Studio Pro: niche setup, creator identity, first product catalogue, first five videos, posting plan and analytics review. The paid promise should be access to the training, software and workflow — not guaranteed income.</p></div><Link href="/earn" className="earnPrimary">View Earn with YNOT <ArrowRight/></Link></section>
 </section>;
}
