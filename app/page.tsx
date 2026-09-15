import Link from "next/link";
import AppShell from "@/components/lumina/AppShell";
import {SEO_CATEGORIES} from "@/lib/seo-categories";

const BASE="https://ynotworld.app";

export default function Home(){
  const jsonLd={
    "@context":"https://schema.org",
    "@graph":[
      {
        "@type":"WebSite",
        "@id":`${BASE}/#website`,
        url:BASE,
        name:"YNOT",
        alternateName:["YNOT World","ynotworld.app"],
        description:"A visual spatial shopping and product-discovery experience across independent stores and shopping sources.",
        inLanguage:"en"
      },
      {
        "@type":"Organization",
        "@id":`${BASE}/#organization`,
        name:"YNOT",
        url:BASE,
        logo:`${BASE}/ynot-microphone.jpg`,
        description:"YNOT helps shoppers visually discover products across fashion, home, beauty, fitness, technology and other shopping categories."
      },
      {
        "@type":"ItemList",
        name:"Explore shopping categories on YNOT",
        itemListElement:SEO_CATEGORIES.map((category,index)=>({
          "@type":"ListItem",
          position:index+1,
          name:category.name,
          url:`${BASE}/shop/${category.slug}`
        }))
      }
    ]
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
    <h1 style={{position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0,0,0,0)",whiteSpace:"nowrap",border:0}}>YNOT visual shopping and product discovery</h1>
    <AppShell/>
    <section aria-label="Explore YNOT shopping categories" style={{background:"#080909",color:"#f6f6f2",padding:"44px clamp(24px,5vw,68px) 56px",fontFamily:"ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif"}}>
      <div style={{maxWidth:1040,margin:"0 auto",borderTop:"1px solid rgba(255,255,255,.12)",paddingTop:30}}>
        <p style={{fontSize:12,textTransform:"uppercase",letterSpacing:".16em",opacity:.48,margin:"0 0 12px"}}>Explore YNOT</p>
        <h2 style={{fontSize:"clamp(26px,4vw,42px)",lineHeight:1.05,letterSpacing:"-.045em",margin:"0 0 16px",maxWidth:720}}>Visual shopping across the categories you already browse.</h2>
        <p style={{fontSize:16,lineHeight:1.65,opacity:.66,maxWidth:780,margin:"0 0 24px"}}>YNOT turns online shopping into an explorable product world. Discover fashion, furniture and home products, beauty, fitness gear and technology across independent stores and broader shopping sources, then move between related products instead of restarting a search from scratch.</p>
        <nav aria-label="Shopping categories" style={{display:"flex",flexWrap:"wrap",gap:10}}>
          {SEO_CATEGORIES.map(category=><Link key={category.slug} href={`/shop/${category.slug}`} style={{color:"inherit",textDecoration:"none",border:"1px solid rgba(255,255,255,.15)",borderRadius:999,padding:"10px 14px",background:"rgba(255,255,255,.045)",fontSize:14}}>{category.name}</Link>)}
        </nav>
      </div>
    </section>
  </>;
}