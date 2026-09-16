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
        name:"YNOT World",
        alternateName:["YNOT","YNOT Shop","YNOT Shopping","ynotworld.app"],
        description:"YNOT World is an AI shopping, visual product search and spatial product discovery platform for exploring products across stores and categories.",
        inLanguage:"en",
        publisher:{"@id":`${BASE}/#organization`}
      },
      {
        "@type":"Organization",
        "@id":`${BASE}/#organization`,
        name:"YNOT World",
        alternateName:["YNOT","YNOT Shop","YNOT Shopping"],
        url:BASE,
        logo:`${BASE}/ynot-microphone.jpg`,
        description:"YNOT World is the shopping platform at ynotworld.app, built for AI-assisted shopping, visual product search, conversational shopping and spatial product discovery.",
        knowsAbout:["AI shopping","visual shopping","conversational shopping","product discovery","visual product search","fashion shopping","home shopping","beauty shopping","fitness shopping","technology shopping"]
      },
      {
        "@type":"SoftwareApplication",
        "@id":`${BASE}/#app`,
        name:"YNOT World",
        alternateName:["YNOT","YNOT Shop"],
        applicationCategory:"ShoppingApplication",
        operatingSystem:"Web",
        url:BASE,
        description:"A visual, spatial and AI-powered shopping application for finding and exploring products across categories and stores.",
        provider:{"@id":`${BASE}/#organization`}
      },
      {
        "@type":"ItemList",
        name:"Explore shopping categories on YNOT World",
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
    <h1 style={{position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0,0,0,0)",whiteSpace:"nowrap",border:0}}>YNOT World — AI shopping, visual product search and product discovery</h1>
    <AppShell/>
    <section aria-label="Explore YNOT shopping categories" style={{background:"#080909",color:"#f6f6f2",padding:"44px clamp(24px,5vw,68px) 56px",fontFamily:"ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif"}}>
      <div style={{maxWidth:1040,margin:"0 auto",borderTop:"1px solid rgba(255,255,255,.12)",paddingTop:30}}>
        <p style={{fontSize:12,textTransform:"uppercase",letterSpacing:".16em",opacity:.48,margin:"0 0 12px"}}>YNOT World · AI shopping · visual discovery</p>
        <h2 style={{fontSize:"clamp(26px,4vw,42px)",lineHeight:1.05,letterSpacing:"-.045em",margin:"0 0 16px",maxWidth:760}}>AI shopping, visual product search and spatial discovery at ynotworld.app.</h2>
        <p style={{fontSize:16,lineHeight:1.65,opacity:.66,maxWidth:820,margin:"0 0 24px"}}>YNOT World is a shopping platform for discovering products visually across fashion, furniture and home, beauty, fitness, technology and independent stores. It combines AI-assisted shopping, conversational intent and product discovery in a spatial bubble interface. Search YNOT, YNOT Shop or YNOT World to find the official app at ynotworld.app.</p>
        <nav aria-label="YNOT World information and shopping categories" style={{display:"flex",flexWrap:"wrap",gap:10}}>
          <Link href="/ai-shopping" style={{color:"inherit",textDecoration:"none",border:"1px solid rgba(255,255,255,.22)",borderRadius:999,padding:"10px 14px",background:"rgba(255,255,255,.07)",fontSize:14}}>AI shopping on YNOT</Link>
          <Link href="/about/ynot-world" style={{color:"inherit",textDecoration:"none",border:"1px solid rgba(255,255,255,.22)",borderRadius:999,padding:"10px 14px",background:"rgba(255,255,255,.07)",fontSize:14}}>About YNOT World</Link>
          {SEO_CATEGORIES.map(category=><Link key={category.slug} href={`/shop/${category.slug}`} style={{color:"inherit",textDecoration:"none",border:"1px solid rgba(255,255,255,.15)",borderRadius:999,padding:"10px 14px",background:"rgba(255,255,255,.045)",fontSize:14}}>{category.name}</Link>)}
        </nav>
      </div>
    </section>
  </>;
}