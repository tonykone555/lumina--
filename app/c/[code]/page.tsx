import Link from "next/link";
import {notFound} from "next/navigation";
import {rest} from "@/lib/creators/earn";
import styles from "./storefront.module.css";

export const dynamic="force-dynamic";
function clean(v:string){return String(v||"").toLowerCase().replace(/[^a-z0-9_-]/g,"").slice(0,40)}
function money(v:any,currency="EUR"){const n=Number(v);if(!Number.isFinite(n))return"Price varies";try{return new Intl.NumberFormat("en",{style:"currency",currency,maximumFractionDigits:2}).format(n)}catch{return `${n.toFixed(2)} ${currency}`}}

export default async function CreatorStorefront({params}:{params:Promise<{code:string}>}){
 const {code:raw}=await params,code=clean(raw);if(!code)notFound();
 const creators=await rest(`ynot_creators?referral_code=eq.${encodeURIComponent(code)}&status=eq.active&select=id,display_name,referral_code,bio,avatar_url,niches&limit=1`).catch(()=>[]);
 const creator=creators?.[0];if(!creator)notFound();
 const products=await rest(`ynot_creator_products?creator_id=eq.${creator.id}&status=eq.active&select=*&order=created_at.desc&limit=100`).catch(()=>[]);
 return <main className={styles.page}>
  <nav className={styles.nav}><Link href="/" className={styles.brand}>YNOT</Link><Link href="/earn">Earn with YNOT</Link></nav>
  <section className={styles.hero}><span className={styles.eyebrow}>YNOT CREATOR PICKS</span><div className={styles.identity}><div className={styles.avatar}>{creator.avatar_url?<img src={creator.avatar_url} alt=""/>:<span>{String(creator.display_name||"Y")[0]}</span>}</div><div><h1>{creator.display_name||"Creator"}'s picks</h1><p>@{creator.referral_code}{creator.niches?.length?` · ${creator.niches.slice(0,4).join(" · ")}`:""}</p></div></div>{creator.bio?<p className={styles.bio}>{creator.bio}</p>:null}</section>
  {products?.length?<section className={styles.grid}>{products.map((p:any)=><Link key={p.id} className={styles.card} href={`/p/${encodeURIComponent(p.product_id)}?ref=${encodeURIComponent(code)}&utm_source=creator_storefront`}><div className={styles.image}>{p.image_url?<img src={p.image_url} alt=""/>:<span>Y</span>}</div><div className={styles.body}><small>{p.brand||"YNOT"}</small><h2>{p.title}</h2><div className={styles.price}><strong>{money(p.price,p.currency||"EUR")}</strong><span>View on YNOT →</span></div></div></Link>)}</section>:<div className={styles.empty}>This creator has not published any product picks yet.</div>}
  <footer className={styles.footer}>Purchases remain on YNOT. Creator attribution is tracked when you follow a creator product link.</footer>
 </main>
}
