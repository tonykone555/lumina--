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
        alternateName:["YNOT World","YNOT Shop","YNOT Shopping","ynotworld.app"],
        description:"YNOT World is a visual, spatial and AI-powered shopping experience for discovering products across fashion, home, beauty, fitness, technology and more.",
        inLanguage:"en"
      },
      {
        "@type":"Organization",
        "@id":`${BASE}/#organization`,
        name:"YNOT",
        alternateName:["YNOT World","YNOT Shop"],
        url:BASE,
        logo:`${BASE}/ynot-microphone.jpg`,
        description:"YNOT is the shopping platform at ynotworld.app, built for visual shopping, spatial product discovery and AI-assisted shopping."
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
    <h1 style={{position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0,0,0,0)",whiteSpace:"nowrap",border:0}}>YNOT Shop — YNOT World visual, spatial and AI shopping</h1>
    <AppShell/>
    <section aria-label="Explore YNOT shopping categories" style={{background:"#080909",color:"#f6f6f2",padding:"44px clamp(24px,5vw,68px) 56px",fontFamily:"ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif"}}>
      <div style={{maxWidth:1040,margin:"0 auto",borderTop:"1px solid rgba(255,255,255,.12)",paddingTop:30}}>
        <p style={{fontSize:12,textTransform:"uppercase",letterSpacing:".16em",opacity:.48,margin:"0 0 12px"}}>YNOT Shop · YNOT World</p>
        <h2 style={{fontSize:"clamp(26px,4vw,42px)",lineHeight:1.05,letterSpacing:"-.045em",margin:"0 0 16px",maxWidth:760}}>Visual, spatial and AI shopping at ynotworld.app.</h2>
        <p style={{fontSize:16,lineHeight:1.65,opacity:.66,maxWidth:820,margin:"0 0 24px"}}>YNOT is a shopping world for discovering products visually across fashion, furniture and home, beauty, fitness, technology and more. Search YNOT, YNOT Shop or YNOT World to find the official app at ynotworld.app.</p>
        <nav aria-label="Shopping categories" style={{display:"flex",flexWrap:"wrap",gap:10}}>
          {SEO_CATEGORIES.map(category=><Link key={category.slug} href={`/shop/${category.slug}`} style={{color:"inherit",textDecoration:"none",border:"1px solid rgba(255,255,255,.15)",borderRadius:999,padding:"10px 14px",background:"rgba(255,255,255,.045)",fontSize:14}}>{category.name}</Link>)}
        </nav>
      </div>
    </section>
  </>;
}