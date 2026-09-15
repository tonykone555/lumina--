import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {SEO_CATEGORIES,getSeoCategory} from "@/lib/seo-categories";

const BASE="https://ynotworld.app";

type Props={params:Promise<{category:string}>};

export function generateStaticParams(){return SEO_CATEGORIES.map(category=>({category:category.slug}))}

export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {category:slug}=await params;
  const category=getSeoCategory(slug);
  if(!category)return {};
  const url=`${BASE}/shop/${category.slug}`;
  return {
    title:category.title,
    description:category.description,
    alternates:{canonical:url},
    openGraph:{type:"website",url,title:category.title,description:category.description,siteName:"YNOT",images:[{url:"/ynot-microphone.jpg",alt:`YNOT ${category.name} shopping`}]},
    twitter:{card:"summary_large_image",title:category.title,description:category.description,images:["/ynot-microphone.jpg"]}
  };
}

export default async function ShoppingCategoryPage({params}:Props){
  const {category:slug}=await params;
  const category=getSeoCategory(slug);
  if(!category)notFound();
  const url=`${BASE}/shop/${category.slug}`;
  const jsonLd={
    "@context":"https://schema.org",
    "@type":"CollectionPage",
    name:category.title,
    description:category.description,
    url,
    isPartOf:{"@type":"WebSite",name:"YNOT",url:BASE},
    about:category.searches.map(name=>({"@type":"Thing",name}))
  };
  return <main style={{minHeight:"100dvh",background:"#080909",color:"#f6f6f2",fontFamily:"ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif",padding:"clamp(28px,6vw,76px)"}}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
    <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:18,maxWidth:1060,margin:"0 auto 74px"}}>
      <Link href="/" style={{color:"inherit",textDecoration:"none",fontWeight:850,letterSpacing:"-.04em",fontSize:22}}>YNOT</Link>
      <Link href="/" style={{color:"inherit",textDecoration:"none",border:"1px solid rgba(255,255,255,.22)",borderRadius:999,padding:"11px 17px",background:"rgba(255,255,255,.07)"}}>Open YNOT World</Link>
    </nav>
    <section style={{maxWidth:860,margin:"0 auto"}}>
      <p style={{textTransform:"uppercase",letterSpacing:".18em",fontSize:11,opacity:.55,marginBottom:18}}>{category.eyebrow}</p>
      <h1 style={{fontSize:"clamp(42px,8vw,88px)",lineHeight:.94,letterSpacing:"-.065em",margin:"0 0 26px",maxWidth:900}}>{category.name} shopping, explored visually.</h1>
      <p style={{fontSize:"clamp(18px,2.4vw,27px)",lineHeight:1.35,letterSpacing:"-.025em",opacity:.78,maxWidth:760,margin:"0 0 46px"}}>{category.intro}</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:56}}>{category.searches.map(search=><span key={search} style={{border:"1px solid rgba(255,255,255,.16)",borderRadius:999,padding:"10px 14px",background:"rgba(255,255,255,.055)",fontSize:14}}>{search}</span>)}</div>
      <div style={{borderTop:"1px solid rgba(255,255,255,.13)",paddingTop:34,display:"grid",gap:16,maxWidth:760}}>
        <h2 style={{fontSize:"clamp(25px,4vw,42px)",letterSpacing:"-.045em",margin:0}}>A different way to find products online</h2>
        <p style={{fontSize:16,lineHeight:1.65,opacity:.67,margin:0}}>YNOT organizes shopping as an explorable visual world. Move between related products, compare styles and prices, discover independent stores, and follow product relationships instead of scrolling through a conventional marketplace grid.</p>
        <p style={{fontSize:16,lineHeight:1.65,opacity:.67,margin:0}}>Availability, prices, images and product options can vary by merchant and region. Open YNOT World to search the current catalog and see live product choices.</p>
      </div>
      <Link href="/" style={{display:"inline-flex",marginTop:42,color:"#111",background:"#fff",textDecoration:"none",fontWeight:800,borderRadius:999,padding:"14px 22px"}}>Explore {category.name} in YNOT</Link>
    </section>
  </main>;
}
